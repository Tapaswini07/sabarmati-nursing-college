import express from "express";
import Teacher from "../models/teacher.js";
import TeacherAttendance from "../models/teacherAttendance.js";
import TeacherDataMigration from "../models/TeacherDataMigration.js";
import {
  attachCurrentUser,
  requireAdminOrSuperAdmin,
  requireRole,
  verifyToken,
} from "../middleware/AuthMiddleware.js";
import { ROLES } from "../constants/roles.js";

const router = express.Router();

async function clearInitialTeacherDataOnce() {
  const key = "initial-demo-teacher-attendance-cleanup-v1";
  const migration = await TeacherDataMigration.findOne({ key }).lean();
  if (migration) return;

  await Teacher.deleteMany({});
  await TeacherAttendance.deleteMany({});

  try {
    await TeacherDataMigration.create({ key });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}

// GET all teachers
router.get("/", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    await clearInitialTeacherDataOnce();
    const teachers = await Teacher.find().sort({ createdAt: -1 });
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching teachers", error: error.message });
  }
});

// POST create a teacher
router.post("/", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const teacherName = req.body.teacherName?.trim();
    const employeeId = req.body.employeeId?.trim();
    const department = req.body.department?.trim();
    const subject = req.body.subject?.trim() || "";

    if (!teacherName || !employeeId || !department) {
      return res.status(400).json({
        message: "Teacher Name, Employee ID and Department are required",
      });
    }

    const exists = await Teacher.findOne({ employeeId });
    if (exists) {
      return res.status(409).json({ message: "Employee ID already exists" });
    }

    const teacher = await Teacher.create({
      teacherName,
      employeeId,
      staffId: employeeId,
      department,
      subject,
      name: teacherName,
      fullName: teacherName,
    });

    res.status(201).json({ message: "Teacher created successfully", teacher });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Employee ID already exists",
        error: error.message,
      });
    }

    res.status(500).json({ message: error.message });
  }
});

// DELETE a teacher
router.delete("/:id", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    await Teacher.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Teacher deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting teacher", error: error.message });
  }
});

export default router;
