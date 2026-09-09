import express from "express";
import Fine from "../models/Fine.js";
import {
  attachCurrentUser,
  requireFinanceAccess,
  verifyToken,
} from "../middleware/AuthMiddleware.js";

const router = express.Router();

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLegacyTodayString() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function isTodayDate(value) {
  if (!value) return false;
  const date = String(value).slice(0, 10);
  return date === getTodayString() || date === getLegacyTodayString();
}

function getDateVariants(date) {
  if (!date) return [];
  const value = String(date).slice(0, 10);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? [value, `${match[3]}-${match[2]}-${match[1]}`] : [value];
}

function getRecordedCollection(fine = {}) {
  if (Array.isArray(fine.paymentHistory) && fine.paymentHistory.length > 0) {
    return fine.paymentHistory.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  }
  return Number(fine.paidAmount) || (fine.paymentStatus === "Paid" ? Number(fine.fineAmount) || 0 : 0);
}

function getCollectionForDate(fine = {}, date) {
  const dateVariants = getDateVariants(date);
  if (!dateVariants.length) return 0;
  if (Array.isArray(fine.paymentHistory) && fine.paymentHistory.length > 0) {
    return fine.paymentHistory.reduce(
      (sum, payment) => dateVariants.includes(String(payment.date || "").slice(0, 10))
        ? sum + (Number(payment.amount) || 0)
        : sum,
      0
    );
  }
  return dateVariants.includes(String(fine.paidDate || "").slice(0, 10)) ? getRecordedCollection(fine) : 0;
}

function buildFineFilter(query) {
  const { course, fineType, paymentStatus, studentId, studentName, institution, date } = query;
  const filter = {};

  if (institution && institution !== "All") filter.institution = institution;
  if (course && course !== "All") filter.course = course;
  if (fineType && fineType !== "All") filter.fineType = fineType;
  if (paymentStatus && paymentStatus !== "All") filter.paymentStatus = paymentStatus;
  if (studentId) filter.studentId = { $regex: new RegExp(studentId, "i") };
  if (studentName) filter.studentName = { $regex: new RegExp(studentName, "i") };
  if (date) {
    const dates = getDateVariants(date);
    filter.$or = [{ paidDate: { $in: dates } }, { "paymentHistory.date": { $in: dates } }];
  }
  return filter;
}

function inferInstitutionFromCourse(course = "") {
  const normalizedCourse = String(course || "").trim().toLowerCase();
  if (normalizedCourse === "anm" || normalizedCourse === "gnm") {
    return "Sabarmati School of Nursing";
  }
  return "Sabarmati College of Nursing";
}

// GET all fines with filters
router.get("/", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    const fines = await Fine.find(buildFineFilter(req.query)).sort({ createdAt: -1 });
    res.json(fines);
  } catch (error) {
    console.error("Error fetching fines:", error);
    res.status(500).json({ message: "Failed to fetch fines" });
  }
});

// GET statistics summary
router.get("/stats/summary", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    const allFines = await Fine.find(buildFineFilter(req.query));
    
    let totalCollection = 0;
    let totalPending = 0;
    const uniqueStudents = new Set();
    let todayCollection = 0;

    allFines.forEach((fine) => {
      const paidAmount = req.query.date
        ? getCollectionForDate(fine, req.query.date)
        : getRecordedCollection(fine);
      totalCollection += paidAmount;
      totalPending += fine.pendingAmount || 0;
      if (fine.studentId) {
        uniqueStudents.add(fine.studentId);
      }
      
      todayCollection += req.query.date
        ? getCollectionForDate(fine, req.query.date)
        : getCollectionForDate(fine, getTodayString());
    });

    res.json({
      totalCollection,
      totalPending,
      totalStudentsWithFine: uniqueStudents.size,
      todayCollection,
      collectionDate: req.query.date || getTodayString(),
    });
  } catch (error) {
    console.error("Error fetching fine stats:", error);
    res.status(500).json({ message: "Failed to fetch fine statistics" });
  }
});

// POST a new fine
router.post("/", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      institution,
      course,
      fineType,
      fineAmount,
      fineDate,
      dueDate,
      paymentStatus,
      paymentMethod,
      remarks,
    } = req.body;

    if (!studentId || !studentName || !course || !fineType || fineAmount === undefined || !fineDate || !dueDate) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const amount = Number(fineAmount);
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({ message: "Fine amount must be a valid positive number" });
    }

    // Determine paid and pending amounts based on status
    let paid = 0;
    let pending = amount;

    if (paymentStatus === "Paid") {
      paid = amount;
      pending = 0;
    } else if (paymentStatus === "Partial") {
      paid = Number(req.body.paidAmount || 0);
      if (isNaN(paid) || paid < 0 || paid > amount) {
        return res.status(400).json({ message: "Paid amount must be between 0 and total fine amount" });
      }
      pending = amount - paid;
    }

    // Auto-generate receipt number FINE-XXXX
    const lastFine = await Fine.findOne({ receiptNumber: /^FINE-/ }).sort({ createdAt: -1 });
    let nextNum = 1;
    if (lastFine && lastFine.receiptNumber) {
      const match = lastFine.receiptNumber.match(/FINE-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const receiptNumber = `FINE-${String(nextNum).padStart(4, "0")}`;

    const newFine = new Fine({
      studentId,
      studentName,
      institution: institution || inferInstitutionFromCourse(course),
      course,
      fineType,
      fineAmount: amount,
      fineDate,
      dueDate,
      paymentStatus: paymentStatus || "Unpaid",
      paidAmount: paid,
      pendingAmount: pending,
      paymentMethod: paymentStatus !== "Unpaid" ? (paymentMethod || "Cash") : "",
      paidDate: paymentStatus !== "Unpaid" ? getTodayString() : "",
      paymentHistory: paid > 0 ? [{ date: getTodayString(), amount: paid, method: paymentMethod || "Cash" }] : [],
      receiptNumber,
      remarks: remarks || "",
    });

    const savedFine = await newFine.save();
    res.status(201).json(savedFine);
  } catch (error) {
    console.error("Error creating fine:", error);
    res.status(500).json({ message: "Failed to create fine record" });
  }
});

// PUT update a fine
router.put("/:id", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      institution,
      course,
      fineType,
      fineAmount,
      fineDate,
      dueDate,
      paymentStatus,
      paymentMethod,
      remarks,
    } = req.body;

    const fine = await Fine.findById(req.params.id);
    if (!fine) {
      return res.status(404).json({ message: "Fine record not found" });
    }

    if (studentId) fine.studentId = studentId;
    if (studentName) fine.studentName = studentName;
    if (institution) fine.institution = institution;
    if (course) fine.course = course;
    if (fineType) fine.fineType = fineType;
    if (fineDate) fine.fineDate = fineDate;
    if (dueDate) fine.dueDate = dueDate;
    if (remarks !== undefined) fine.remarks = remarks;

    if (fineAmount !== undefined) {
      const amount = Number(fineAmount);
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({ message: "Fine amount must be a valid positive number" });
      }
      fine.fineAmount = amount;
    }

    if (paymentStatus) {
      fine.paymentStatus = paymentStatus;
    }

    const previousPaidAmount = Number(fine.paidAmount) || 0;

    // Recalculate paid and pending
    const totalAmount = fine.fineAmount;
    if (fine.paymentStatus === "Paid") {
      fine.paidAmount = totalAmount;
      fine.pendingAmount = 0;
      fine.paymentMethod = paymentMethod || fine.paymentMethod || "Cash";
      if (fine.paidAmount > previousPaidAmount) fine.paidDate = getTodayString();
    } else if (fine.paymentStatus === "Unpaid") {
      fine.paidAmount = 0;
      fine.pendingAmount = totalAmount;
      fine.paymentMethod = "";
      fine.paidDate = "";
    } else if (fine.paymentStatus === "Partial") {
      const paid = Number(req.body.paidAmount !== undefined ? req.body.paidAmount : fine.paidAmount);
      if (isNaN(paid) || paid < 0 || paid > totalAmount) {
        return res.status(400).json({ message: "Paid amount must be between 0 and total fine amount" });
      }
      fine.paidAmount = paid;
      fine.pendingAmount = totalAmount - paid;
      fine.paymentMethod = paymentMethod || fine.paymentMethod || "Cash";
      if (fine.paidAmount > previousPaidAmount) fine.paidDate = getTodayString();
      
      // Auto upgrade status if full amount paid
      if (fine.pendingAmount === 0) {
        fine.paymentStatus = "Paid";
      }
    }

    const newlyPaidAmount = Math.max((Number(fine.paidAmount) || 0) - previousPaidAmount, 0);
    if (newlyPaidAmount > 0) {
      fine.paymentHistory.push({
        date: getTodayString(),
        amount: newlyPaidAmount,
        method: fine.paymentMethod || "Cash",
      });
    }

    const updatedFine = await fine.save();
    res.json(updatedFine);
  } catch (error) {
    console.error("Error updating fine:", error);
    res.status(500).json({ message: "Failed to update fine record" });
  }
});

// DELETE a fine
router.delete("/:id", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const fine = await Fine.findByIdAndDelete(req.params.id);
    if (!fine) {
      return res.status(404).json({ message: "Fine record not found" });
    }
    res.json({ message: "Fine record deleted successfully" });
  } catch (error) {
    console.error("Error deleting fine:", error);
    res.status(500).json({ message: "Failed to delete fine record" });
  }
});

export default router;
