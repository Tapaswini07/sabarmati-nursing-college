import express from "express";
import TeacherAttendance from "../models/teacherAttendance.js";
import {
  attachCurrentUser,
  requireAcademicAccess,
  requireAdminOrSuperAdmin,
  requireRole,
  verifyToken,
} from "../middleware/AuthMiddleware.js";
import { ROLES } from "../constants/roles.js";

const router = express.Router();

router.post("/", verifyToken, attachCurrentUser, requireAcademicAccess, async (req, res) => {
  const teacherId = req.body.teacherId?.trim();
  const teacherName = req.body.teacherName?.trim();
  const date = req.body.date?.trim();
  const status = req.body.status;
  const checkIn = req.body.checkIn || "";
  const checkOut = req.body.checkOut || "";

  if (!teacherId || !teacherName || !date || !status) {
    return res.status(400).json({
      message: "teacherId, teacherName, date and status are required",
    });
  }

  if (!["Present", "Absent", "Half-day"].includes(status)) {
    return res.status(400).json({ message: "Invalid attendance status" });
  }

  try {
    const existingRecord = await TeacherAttendance.findOne({ teacherId, date });

    const record = await TeacherAttendance.findOneAndUpdate(
      { teacherId, date },
      {
        $set: { teacherName, status, checkIn, checkOut },
        $setOnInsert: { teacherId, date },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    const created = !existingRecord;
    res.status(created ? 201 : 200).json({
      action: created ? "created" : "updated",
      message: created ? "Teacher attendance created" : "Teacher attendance updated",
      record,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "Teacher attendance could not be saved because of a duplicate database index. Restart the server and try again.",
      });
    }

    res.status(500).json({ message: err.message });
  }
});

router.get("/", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  const { date, teacherId } = req.query;
  const filter = {};
  if (date) filter.date = date;
  if (teacherId) filter.teacherId = teacherId;

  try {
    const records = await TeacherAttendance.find(filter).sort({ createdAt: -1 });
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/summary", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const summary = await TeacherAttendance.aggregate([
      {
        $group: {
          _id: { teacherId: "$teacherId", teacherName: "$teacherName", status: "$status" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: { teacherId: "$_id.teacherId", teacherName: "$_id.teacherName" },
          stats: { $push: { status: "$_id.status", count: "$count" } },
        },
      },
      {
        $project: {
          _id: 0,
          teacherId: "$_id.teacherId",
          teacherName: "$_id.teacherName",
          stats: 1,
        },
      },
      { $sort: { teacherId: 1 } },
    ]);
    res.status(200).json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    await TeacherAttendance.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Record deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
