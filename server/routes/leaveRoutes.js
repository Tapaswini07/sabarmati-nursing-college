import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import LeaveRequest from "../models/LeaveRequest.js";

const router = express.Router();
const uploadsDir = path.resolve("uploads", "leave-documents");

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDir);
  },
  filename: (_req, file, callback) => {
    const safeOriginalName = file.originalname.replace(/\s+/g, "-");
    callback(null, `${Date.now()}-${safeOriginalName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

function calculateLeaveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((end - start) / millisecondsPerDay) + 1;
}

function normalizeLeave(leave) {
  const item = leave.toObject ? leave.toObject() : leave;

  return {
    ...item,
    documentUrl: item.documentPath ? `/${item.documentPath.replace(/\\/g, "/")}` : "",
  };
}

function buildSummary(leaves) {
  return leaves.reduce(
    (accumulator, leave) => {
      accumulator.totalLeaves += 1;

      if (leave.status === "Approved") {
        accumulator.approvedLeaves += 1;
      } else if (leave.status === "Rejected") {
        accumulator.rejectedLeaves += 1;
      } else {
        accumulator.pendingRequests += 1;
      }

      return accumulator;
    },
    {
      totalLeaves: 0,
      approvedLeaves: 0,
      pendingRequests: 0,
      rejectedLeaves: 0,
    }
  );
}

function buildDepartmentStats(leaves) {
  const usageByDepartment = new Map();

  leaves.forEach((leave) => {
    const current = usageByDepartment.get(leave.department) || 0;
    usageByDepartment.set(leave.department, current + leave.days);
  });

  const totalDays = leaves.reduce((sum, leave) => sum + leave.days, 0);
  const approvedLeaves = leaves.filter((leave) => leave.status === "Approved").length;
  const approvalRate = leaves.length
    ? `${Math.round((approvedLeaves / leaves.length) * 100)}%`
    : "0%";

  const highUtilizationTeam =
    [...usageByDepartment.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "No requests yet";

  return [
    {
      label: "Average leave balance",
      value: leaves.length ? `${Math.max(30 - totalDays / leaves.length, 0).toFixed(1)} Days` : "30.0 Days",
      tone: "text-blue-700 bg-blue-50",
    },
    {
      label: "High utilization team",
      value: highUtilizationTeam,
      tone: "text-amber-700 bg-amber-50",
    },
    {
      label: "On-time approvals",
      value: approvalRate,
      tone: "text-emerald-700 bg-emerald-50",
    },
  ];
}

router.get("/", async (_req, res) => {
  try {
    const leaveDocuments = await LeaveRequest.find().sort({ createdAt: -1 });
    const leaves = leaveDocuments.map(normalizeLeave);
    const pendingApprovals = leaves.filter((leave) => leave.status === "Pending");

    const recentActivities = leaveDocuments
      .flatMap((leave) =>
        (leave.activities || []).map((activity) => ({
          ...activity,
          createdAt: activity.createdAt || leave.updatedAt,
        }))
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    res.status(200).json({
      summary: buildSummary(leaves),
      leaves,
      pendingApprovals,
      employeeStats: buildDepartmentStats(leaves),
      recentActivities,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching leave records", error: error.message });
  }
});

router.post("/", upload.single("document"), async (req, res) => {
  try {
    const employeeName = req.body.employeeName?.trim();
    const employeeId = req.body.employeeId?.trim();
    const department = req.body.department?.trim();
    const leaveType = req.body.leaveType?.trim();
    const reason = req.body.reason?.trim();
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;

    if (
      !employeeName ||
      !employeeId ||
      !department ||
      !leaveType ||
      !reason ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({ message: "All leave request fields are required" });
    }

    const days = calculateLeaveDays(startDate, endDate);
    if (!Number.isFinite(days) || days <= 0) {
      return res.status(400).json({
        message: "End date must be the same as or after the start date",
      });
    }

    const leaveRequest = await LeaveRequest.create({
      employeeName,
      employeeId,
      department,
      leaveType,
      startDate,
      endDate,
      days,
      reason,
      documentName: req.file?.originalname || "",
      documentPath: req.file ? path.join("uploads", "leave-documents", req.file.filename) : "",
      documentMimeType: req.file?.mimetype || "",
      activities: [
        {
          message: `${employeeName} submitted a ${leaveType.toLowerCase()} request.`,
        },
      ],
    });

    res.status(201).json({
      message: "Leave request created successfully",
      leave: normalizeLeave(leaveRequest),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error creating leave request" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const status = req.body.status?.trim();
    const reviewedBy = req.body.reviewedBy?.trim() || "Admin";
    const reviewNote = req.body.reviewNote?.trim() || "";

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "A valid review status is required" });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    leaveRequest.status = status;
    leaveRequest.reviewedBy = reviewedBy;
    leaveRequest.reviewNote = reviewNote;
    leaveRequest.reviewedAt = new Date();
    leaveRequest.activities.unshift({
      message: `${reviewedBy} ${status.toLowerCase()} ${leaveRequest.employeeName}'s ${leaveRequest.leaveType.toLowerCase()} request.`,
    });

    await leaveRequest.save();

    res.status(200).json({
      message: `Leave request ${status.toLowerCase()} successfully`,
      leave: normalizeLeave(leaveRequest),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error updating leave status" });
  }
});

export default router;
