import express from "express";
import AdmissionFeeConfig from "../models/AdmissionFeeConfig.js";
import {
  COURSE_CATALOG,
  INSTITUTIONS,
  normalizeCourseName,
} from "../constants/feeStructures.js";
import {
  attachCurrentUser,
  requireAdminOrSuperAdmin,
  verifyToken,
} from "../middleware/AuthMiddleware.js";

const router = express.Router();
let admissionFeeIndexSyncPromise = null;

async function ensureAdmissionFeeIndexes() {
  if (!admissionFeeIndexSyncPromise) {
    admissionFeeIndexSyncPromise = (async () => {
      const indexes = await AdmissionFeeConfig.collection.indexes();
      const oldCourseYearIndex = indexes.find((index) => (
        index.unique
        && index.key?.course === 1
        && index.key?.academicYear === 1
        && Object.keys(index.key).length === 2
      ));

      if (oldCourseYearIndex) {
        await AdmissionFeeConfig.collection.dropIndex(oldCourseYearIndex.name);
      }

      await AdmissionFeeConfig.collection.createIndex(
        { configKey: 1 },
        { unique: true, sparse: true, name: "configKey_1" }
      );
      await AdmissionFeeConfig.collection.createIndex(
        { studentKey: 1 },
        { unique: true, sparse: true, name: "studentKey_1" }
      );
    })().catch((error) => {
      admissionFeeIndexSyncPromise = null;
      throw error;
    });
  }

  return admissionFeeIndexSyncPromise;
}

function buildConfigKey(course, academicYear) {
  return `${academicYear}|${course}`;
}

function buildStudentKey(studentId, course, academicYear) {
  return `${studentId}|${academicYear}|${course}`;
}

function studentlessFilter() {
  return {
    $or: [
      { studentId: "" },
      { studentId: { $exists: false } },
    ],
  };
}

function genericConfigLookup(course, academicYear) {
  return {
    $or: [
      { configKey: buildConfigKey(course, academicYear) },
      {
        course,
        academicYear,
        ...studentlessFilter(),
      },
    ],
  };
}

function getAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 5 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function getAvailableAcademicYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = -2; i <= 5; i++) {
    const startYear = currentYear + i;
    years.push(`${startYear}-${startYear + 1}`);
  }
  return years;
}

// Get all admission fee configs
router.get("/", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    await ensureAdmissionFeeIndexes();
    const { course, academicYear } = req.query;
    const filter = {};
    
    if (course) {
      filter.course = normalizeCourseName(course);
    }
    if (academicYear) {
      filter.academicYear = academicYear;
    }

    const configs = await AdmissionFeeConfig.find(filter)
      .sort({ academicYear: -1, course: 1, studentName: 1 })
      .lean();

    res.json({
      configs,
      academicYears: getAvailableAcademicYears(),
      courses: COURSE_CATALOG.map(item => item.course),
      currentAcademicYear: getAcademicYear(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error fetching admission fee configs" });
  }
});

// Get admission fee for a specific course and year (for students)
router.get("/current", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    await ensureAdmissionFeeIndexes();
    const { course } = req.query;
    const academicYear = req.query.academicYear || getAcademicYear();
    
    if (!course) {
      return res.status(400).json({ message: "Course is required" });
    }

    const normalizedCourse = normalizeCourseName(course);
    const config = await AdmissionFeeConfig.findOne({
      course: normalizedCourse,
      academicYear,
      ...studentlessFilter(),
    }).lean();

    if (!config) {
      return res.status(404).json({ 
        message: "No admission fee configuration found for this course and academic year",
        academicYear,
        course: normalizedCourse,
      });
    }

    res.json({ config });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error fetching admission fee" });
  }
});

// Create new admission fee config
router.post("/", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    await ensureAdmissionFeeIndexes();
    const {
      course,
      academicYear,
      amount,
      studentId = "",
      studentName = "",
      studentEmail = "",
      registrationNo = "",
    } = req.body;

    if (!course || !academicYear || amount === undefined) {
      return res.status(400).json({ message: "Course, academic year, and amount are required" });
    }

    const normalizedCourse = normalizeCourseName(course);
    const cleanStudentId = String(studentId || "").trim();
    const cleanStudentName = String(studentName || "").trim();
    const cleanStudentEmail = String(studentEmail || "").trim();
    const cleanRegistrationNo = String(registrationNo || "").trim();
    const configKey = cleanStudentId ? undefined : buildConfigKey(normalizedCourse, academicYear);
    const studentKey = cleanStudentId ? buildStudentKey(cleanStudentId, normalizedCourse, academicYear) : undefined;
    
    // Check if config already exists
    const existing = await AdmissionFeeConfig.findOne(
      cleanStudentId
        ? { studentKey }
        : genericConfigLookup(normalizedCourse, academicYear)
    );

    if (existing) {
      return res.status(409).json({ 
        message: cleanStudentId
          ? "Admission fee configuration already exists for this student, course, and academic year"
          : "Admission fee configuration already exists for this course and academic year"
      });
    }

    const config = await AdmissionFeeConfig.create({
      studentId: cleanStudentId,
      studentName: cleanStudentName,
      studentEmail: cleanStudentEmail,
      registrationNo: cleanRegistrationNo,
      course: normalizedCourse,
      academicYear,
      amount: Number(amount),
      configKey,
      studentKey,
      createdBy: req.currentUser?.email || req.currentUser?.role || "Admin",
    });

    res.status(201).json({ message: "Admission fee configuration created successfully", config });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: "Admission fee configuration already exists for this course and academic year" 
      });
    }
    res.status(500).json({ message: error.message || "Error creating admission fee configuration" });
  }
});

// Update admission fee config
router.patch("/:id", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    await ensureAdmissionFeeIndexes();
    const { amount } = req.body;

    if (amount === undefined) {
      return res.status(400).json({ message: "Amount is required" });
    }

    const config = await AdmissionFeeConfig.findByIdAndUpdate(
      req.params.id,
      { 
        amount: Number(amount),
        updatedBy: req.currentUser?.email || req.currentUser?.role || "Admin",
      },
      { new: true, runValidators: true }
    );

    if (!config) {
      return res.status(404).json({ message: "Admission fee configuration not found" });
    }

    res.json({ message: "Admission fee configuration updated successfully", config });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error updating admission fee configuration" });
  }
});

// Delete admission fee config
router.delete("/:id", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    await ensureAdmissionFeeIndexes();
    const config = await AdmissionFeeConfig.findByIdAndDelete(req.params.id);

    if (!config) {
      return res.status(404).json({ message: "Admission fee configuration not found" });
    }

    res.json({ message: "Admission fee configuration deleted successfully", config });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error deleting admission fee configuration" });
  }
});

// Bulk create/update configs for a year
router.post("/bulk", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    await ensureAdmissionFeeIndexes();
    const { academicYear, fees } = req.body;

    if (!academicYear || !Array.isArray(fees) || fees.length === 0) {
      return res.status(400).json({ message: "Academic year and fees array are required" });
    }

    const operations = fees.map(({ course, amount }) => {
      const normalizedCourse = normalizeCourseName(course);
      const configKey = buildConfigKey(normalizedCourse, academicYear);
      return {
        updateOne: {
          filter: genericConfigLookup(normalizedCourse, academicYear),
          update: {
            $set: {
              course: normalizedCourse,
              academicYear,
              amount: Number(amount),
              studentId: "",
              studentName: "",
              studentEmail: "",
              registrationNo: "",
              configKey,
              updatedBy: req.currentUser?.email || req.currentUser?.role || "Admin",
            },
            $unset: { studentKey: "" },
          },
          upsert: true,
        },
      };
    });

    await AdmissionFeeConfig.bulkWrite(operations);

    const configs = await AdmissionFeeConfig.find({ academicYear }).lean();

    res.json({ 
      message: "Bulk admission fee configurations updated successfully", 
      configs 
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error bulk updating admission fee configurations" });
  }
});

export default router;
