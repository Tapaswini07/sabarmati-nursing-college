import express from "express";
import Attendance from "../models/attendance.js";
import {
  attachCurrentUser,
  requireAdminOrSuperAdmin,
  requireRole,
  verifyToken,
} from "../middleware/AuthMiddleware.js";
import { ROLES } from "../constants/roles.js";
import { loadLinkedStudentForUser } from "../utils/studentLinking.js";

const router = express.Router();

function buildStudentAttendanceIds(student) {
  return [
    student?.registrationNo,
    student?.admissionNumber,
    student?.email,
    student?.phone,
    student?._id ? String(student._id) : "",
  ].filter(Boolean);
}

router.post("/", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  const studentId = req.body.studentId?.trim();
  const studentName = req.body.studentName?.trim();
  const date = req.body.date?.trim();
  const status = req.body.status;
  const course = req.body.course?.trim() || "";
  const academicYear = req.body.academicYear?.trim() || "";
  const checkIn = req.body.checkIn?.trim() || "";
  const checkOut = req.body.checkOut?.trim() || "";

  if (!studentId || !studentName || !date || !status) {
    return res.status(400).json({
      message: "studentId, studentName, date and status are required",
    });
  }

  if (!["Present", "Absent", "Half-day"].includes(status)) {
    return res.status(400).json({ message: "Invalid attendance status" });
  }
  if (checkIn && !/^([01]\d|2[0-3]):[0-5]\d$/.test(checkIn)) {
    return res.status(400).json({ message: "Attendance time must use HH:MM format" });
  }

  try {
    const existingRecord = await Attendance.findOne({ studentId, date });

    const record = await Attendance.findOneAndUpdate(
      { studentId, date },
      {
        $set: { studentName, course, academicYear, status, checkIn, checkOut },
        $setOnInsert: { studentId, date },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    const created = !existingRecord;
    return res.status(created ? 201 : 200).json({
      action: created ? "created" : "updated",
      message: created ? "Attendance created" : "Attendance updated",
      record,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "Attendance could not be saved because of a duplicate database index. Restart the server and try again.",
      });
    }

    return res.status(500).json({ message: err.message });
  }
});

router.get("/", verifyToken, attachCurrentUser, async (req, res) => {
  const { date, studentId, course, academicYear } = req.query;
  const filter = {};

  if (date) {
    filter.date = date;
  }
  if (course) {
    filter.course = course;
  }
  if (academicYear) {
    filter.academicYear = academicYear;
  }

  if (req.currentUser.role === ROLES.STUDENT) {
    const student = await loadLinkedStudentForUser(req.currentUser);
    if (!student) {
      return res.status(404).json({ message: "Linked student record not found" });
    }

    const allowedIds = buildStudentAttendanceIds(student);
    if (studentId && !allowedIds.includes(studentId)) {
      return res.status(403).json({ message: "You can only view your own attendance" });
    }

    filter.studentId = { $in: allowedIds };
  } else if (studentId) {
    filter.studentId = studentId;
  }

  try {
    const records = await Attendance.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(records);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/me", verifyToken, attachCurrentUser, async (req, res) => {
  if (req.currentUser.role !== ROLES.STUDENT) {
    return res.status(403).json({ message: "Only student users can access this route" });
  }

  try {
    const student = await loadLinkedStudentForUser(req.currentUser);
    if (!student) {
      return res.status(404).json({ message: "Linked student record not found" });
    }

    const records = await Attendance.find({
      studentId: { $in: buildStudentAttendanceIds(student) },
    }).sort({ date: -1 });
    return res.status(200).json(records);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/summary", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const summary = await Attendance.aggregate([
      {
        $group: {
          _id: {
            studentId: "$studentId",
            studentName: "$studentName",
            course: "$course",
            academicYear: "$academicYear",
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            studentId: "$_id.studentId",
            studentName: "$_id.studentName",
            course: "$_id.course",
            academicYear: "$_id.academicYear",
          },
          stats: { $push: { status: "$_id.status", count: "$count" } },
        },
      },
      {
        $project: {
          _id: 0,
          studentId: "$_id.studentId",
          studentName: "$_id.studentName",
          course: "$_id.course",
          academicYear: "$_id.academicYear",
          stats: 1,
        },
      },
      { $sort: { studentId: 1 } },
    ]);
    return res.status(200).json(summary);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Record deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
