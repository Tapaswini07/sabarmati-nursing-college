import express from "express";
import FeeStructure from "../models/FeeStructure.js";
import {
  ADMISSION_BATCHES,
  COURSE_CATALOG,
  INSTITUTIONS,
} from "../constants/feeStructures.js";
import {
  createRevision,
  sanitizeFeeStructurePayload,
} from "../utils/feeStructureStore.js";
import {
  attachCurrentUser,
  requireAdminOrSuperAdmin,
  requireRole,
  verifyToken,
} from "../middleware/AuthMiddleware.js";
import { ROLES } from "../constants/roles.js";

const router = express.Router();

function buildFilter(query = {}) {
  return Object.fromEntries(
    ["institution", "course", "admissionBatch", "academicYear", "status"].flatMap((key) => {
      const value = String(query[key] || "").trim();
      return value ? [[key, value]] : [];
    })
  );
}

router.get("/meta", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, (_req, res) => {
  res.json({
    institutions: Object.values(INSTITUTIONS),
    courses: COURSE_CATALOG,
    admissionBatches: ADMISSION_BATCHES,
    collections: [
      "Institutions",
      "Courses",
      "AdmissionBatches",
      "AcademicYears",
      "FeeStructures",
      "Students",
      "StudentFees",
      "FeeCollections",
      "Scholarships",
      "Discounts",
      "Receipts",
      "FeeRevisionHistory",
    ],
  });
});

router.get("/", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const structures = await FeeStructure.find(buildFilter(req.query))
      .sort({ admissionBatch: -1, institution: 1, course: 1 })
      .lean();

    res.json({ structures });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error fetching fee structures" });
  }
});

router.get("/dashboard", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const structures = await FeeStructure.find().lean();
    const countBy = (key) =>
      structures.reduce((acc, item) => {
        const value = item[key] || "Not Set";
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      }, {});

    res.json({
      totalAdmissionBatches: new Set(structures.map((item) => item.admissionBatch).filter(Boolean)).size,
      activeFeeStructures: structures.filter((item) => item.active !== false).length,
      pendingFeeStructures: structures.filter((item) => item.status === "Pending").length,
      institutionWiseFeeStructures: countBy("institution"),
      courseWiseFeeStructures: countBy("course"),
      academicYearWiseFeeStructures: countBy("academicYear"),
      yearWiseFeeStructures: structures.reduce((acc, item) => {
        for (const yearFee of item.yearFees || []) {
          acc[yearFee.yearLabel] = (acc[yearFee.yearLabel] || 0) + 1;
        }
        return acc;
      }, {}),
      recentlyUpdatedFeeStructures: structures
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 8),
      feeRevisionHistory: structures
        .flatMap((item) =>
          (item.revisionHistory || []).map((revision) => ({
            ...revision,
            institution: item.institution,
            course: item.course,
            admissionBatch: item.admissionBatch,
          }))
        )
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
        .slice(0, 20),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error fetching fee structure dashboard" });
  }
});

router.post("/", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const payload = sanitizeFeeStructurePayload(req.body);
    const structure = await FeeStructure.create({
      ...payload,
      createdBy: req.currentUser?.email || req.currentUser?.role || "Super Admin",
      updatedBy: req.currentUser?.email || req.currentUser?.role || "Super Admin",
      revisionHistory: [createRevision("Created", req.currentUser, req.body.note, payload)],
    });

    res.status(201).json({ message: "Fee structure created successfully", structure });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Fee structure already exists for this institution, course and admission batch" });
    }
    res.status(500).json({ message: error.message || "Error creating fee structure" });
  }
});

router.patch("/:id", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const existing = await FeeStructure.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Fee structure not found" });

    const before = existing.toObject();
    const payload = sanitizeFeeStructurePayload(req.body, existing);
    Object.assign(existing, payload, {
      updatedBy: req.currentUser?.email || req.currentUser?.role || "Super Admin",
    });
    existing.revisionHistory.push(createRevision("Updated", req.currentUser, req.body.note, before));

    await existing.save();
    res.json({ message: "Fee structure updated successfully", structure: existing });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error updating fee structure" });
  }
});

router.patch("/:id/status", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const structure = await FeeStructure.findById(req.params.id);
    if (!structure) return res.status(404).json({ message: "Fee structure not found" });

    structure.active = req.body.active !== false;
    structure.status = structure.active ? "Active" : "Inactive";
    structure.revisionHistory.push(createRevision(structure.status, req.currentUser, req.body.note, structure.toObject()));
    await structure.save();

    res.json({ message: `Fee structure ${structure.status.toLowerCase()} successfully`, structure });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error changing fee structure status" });
  }
});

router.delete("/:id", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const structure = await FeeStructure.findByIdAndDelete(req.params.id);
    if (!structure) return res.status(404).json({ message: "Fee structure not found" });

    res.json({ message: "Fee structure deleted successfully", structure });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error deleting fee structure" });
  }
});

export default router;
