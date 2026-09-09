import express from "express";
import FormFillUpFee from "../models/FormFillUpFee.js";
import {
  attachCurrentUser,
  requireFinanceAccess,
  verifyToken,
} from "../middleware/AuthMiddleware.js";

const router = express.Router();

function toAmount(value, fieldName, { required = false, allowNegative = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new Error(`${fieldName} is required`);
    }
    return 0;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || (!allowNegative && amount < 0)) {
    throw new Error(`${fieldName} must be a valid ${allowNegative ? "" : "non-negative "}amount`);
  }

  return amount;
}

function buildFeeAmounts(payload = {}) {
  const formFillUpFee = toAmount(
    payload.formFillUpFee ?? payload.registrationFee,
    "Form fill-up fee",
    { required: true }
  );
  const examFee = toAmount(payload.examFee, "Exam fee");
  const otherFees = toAmount(payload.otherFees, "Other fees");
  const studentAdjustment = toAmount(payload.studentAdjustment, "Student adjustment", {
    allowNegative: true,
  });
  const totalPayable = Math.max(formFillUpFee + examFee + otherFees + studentAdjustment, 0);

  if (totalPayable <= 0) {
    throw new Error("Total payable amount must be greater than zero");
  }

  return {
    formFillUpFee,
    examFee,
    otherFees,
    studentAdjustment,
    totalPayable,
  };
}

function buildReceiptNumber() {
  return "FF-RCPT-" + new Date().toISOString().slice(0, 10).replaceAll("-", "") + "-" + Date.now().toString().slice(-6);
}

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
  return value === getTodayString() || value === getLegacyTodayString();
}

function getRecordedCollection(fee = {}) {
  if (Array.isArray(fee.paymentHistory) && fee.paymentHistory.length > 0) {
    return fee.paymentHistory.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  }

  const paidAmount = Number(fee.paidAmount) || 0;
  if (paidAmount > 0) return paidAmount;

  return fee.paymentStatus === "Paid" ? Number(fee.totalPayable) || 0 : 0;
}

function getTodayCollection(fee = {}) {
  if (Array.isArray(fee.paymentHistory) && fee.paymentHistory.length > 0) {
    return fee.paymentHistory.reduce((sum, payment) => {
      return isTodayDate(payment.date || payment.paidDate || payment.paymentDate)
        ? sum + (Number(payment.amount) || 0)
        : sum;
    }, 0);
  }

  const fallbackDate = fee.paymentDate || fee.paidDate || fee.updatedAt || fee.createdAt;
  return isTodayDate(fallbackDate) ? getRecordedCollection(fee) : 0;
}

function buildPaymentHistoryEntry({
  fee,
  paymentDate,
  amount,
  paymentMethod,
  receiptNumber,
  notes = "",
  totalPaidAmount,
}) {
  return {
    date: paymentDate,
    amount,
    method: paymentMethod || "",
    receiptNumber,
    notes,
    course: fee.course,
    semester: fee.semester,
    formFillUpFee: fee.formFillUpFee || 0,
    examFee: fee.examFee || 0,
    otherFees: fee.otherFees || 0,
    studentAdjustment: fee.studentAdjustment || 0,
    totalPayable: fee.totalPayable,
    totalPaidAmount,
  };
}

function escapeXml(unsafe) {
  if (unsafe === undefined || unsafe === null) return "";
  var amp = String.fromCharCode(38) + "amp;";
  var lt = String.fromCharCode(38) + "lt;";
  var gt = String.fromCharCode(38) + "gt;";
  var quot = String.fromCharCode(38) + "quot;";
  var apos = String.fromCharCode(38) + "apos;";
  return String(unsafe)
    .replace(new RegExp(String.fromCharCode(38), "g"), amp)
    .replace(new RegExp("<", "g"), lt)
    .replace(new RegExp(">", "g"), gt)
    .replace(new RegExp('"', "g"), quot)
    .replace(new RegExp("'", "g"), apos);
}

function buildFormFillUpFeesExcelXml(records = []) {
  const headers = [
    "Student ID",
    "Student Name",
    "Course",
    "Semester",
    "Academic Year",
    "Form Fill-Up Fee",
    "Exam Fee",
    "Other Fees",
    "Student Adjustment",
    "Adjustment Reason",
    "Total Payable",
    "Paid Amount",
    "Pending Amount",
    "Last Date",
    "Payment Method",
    "Payment Status",
    "Payment Date",
    "Receipt Number",
    "Notes",
    "Late Fee",
  ];

  const headerXml = headers
    .map((header) => "<Cell ss:StyleID=\"header\"><Data ss:Type=\"String\">" + escapeXml(header) + "</Data></Cell>")
    .join("");

  const rowXml = records
    .map((record) => {
      const cells = [
        record.studentId,
        record.studentName,
        record.course,
        record.semester,
        record.academicYear,
        record.formFillUpFee,
        record.examFee,
        record.otherFees,
        record.studentAdjustment,
        record.adjustmentReason,
        record.totalPayable,
        record.paidAmount,
        record.pendingAmount,
        record.lastDate,
        record.paymentMethod,
        record.paymentStatus,
        record.paymentDate,
        record.receiptNumber,
        record.notes,
        record.lateFee,
      ]
        .map((val) => "<Cell><Data ss:Type=\"String\">" + escapeXml(val) + "</Data></Cell>")
        .join("");
      return "<Row>" + cells + "</Row>";
    })
    .join("");

  return '<?xml version="1.0"?>\n' +
    '<?mso-application progid="Excel.Sheet"?>\n' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n' +
    ' xmlns:o="urn:schemas-microsoft-com:office:office"\n' +
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n' +
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
    ' <Styles>\n' +
    '  <Style ss:ID="header">\n' +
    '   <Font ss:Bold="1"/>\n' +
    '   <Interior ss:Color="#DCEBFF" ss:Pattern="Solid"/>\n' +
    '  </Style>\n' +
    ' </Styles>\n' +
    ' <Worksheet ss:Name="Form Fill-Up Fees">\n' +
    '  <Table>\n' +
    '   <Row>' + headerXml + '</Row>\n' +
    '   ' + rowXml + '\n' +
    '  </Table>\n' +
    ' </Worksheet>\n' +
    '</Workbook>';
}

// GET export form fill-up fees as Excel XML
router.get("/export", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    const { institution, course, academicYear, semester, paymentStatus, paymentMethod, dueDate } = req.query;
    const filter = {};

    if (course && course !== "All") filter.course = course;
    if (academicYear && academicYear !== "All") filter.academicYear = academicYear;
    if (semester && semester !== "All") filter.semester = semester;
    if (paymentStatus && paymentStatus !== "All") filter.paymentStatus = paymentStatus;
    if (paymentMethod && paymentMethod !== "All") filter.paymentMethod = paymentMethod;
    if (dueDate) filter.lastDate = dueDate;

    const fees = await FormFillUpFee.find(filter).sort({ createdAt: -1 });

    const timestamp = new Date().toISOString().slice(0, 10);
    const workbookXml = buildFormFillUpFeesExcelXml(fees);

    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=\"form-fill-up-fees-export-" + timestamp + ".xls\""
    );
    return res.status(200).send(workbookXml);
  } catch (error) {
    console.error("Error exporting form fill-up fees:", error);
    return res.status(500).json({ message: "Failed to export form fill-up fees" });
  }
});

// GET all form fill-up fees with filters
router.get("/", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    const { institution, course, academicYear, semester, paymentStatus, paymentMethod, dueDate } = req.query;
    const filter = {};

    if (institution) filter.institution = institution;
    if (course) filter.course = course;
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (dueDate) filter.lastDate = dueDate;

    const fees = await FormFillUpFee.find(filter).sort({ createdAt: -1 });
    res.json(fees);
  } catch (error) {
    console.error("Error fetching form fill-up fees:", error);
    res.status(500).json({ message: "Failed to fetch form fill-up fees" });
  }
});

// GET statistics
router.get("/stats/summary", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    const total = await FormFillUpFee.countDocuments();
    const paid = await FormFillUpFee.countDocuments({ paymentStatus: "Paid" });
    const pending = await FormFillUpFee.countDocuments({ paymentStatus: "Unpaid" });
    const partial = await FormFillUpFee.countDocuments({ paymentStatus: "Partial" });

    const allFees = await FormFillUpFee.find();
    const totalCollection = allFees.reduce((sum, fee) => sum + getRecordedCollection(fee), 0);
    const todayCollection = allFees.reduce((sum, fee) => sum + getTodayCollection(fee), 0);

    const pendingFees = await FormFillUpFee.find({ paymentStatus: { $in: ["Unpaid", "Partial"] } });
    const totalPending = pendingFees.reduce((sum, fee) => sum + (fee.pendingAmount || fee.totalPayable || 0), 0);

    res.json({
      total,
      paid,
      pending,
      partial,
      totalCollection,
      totalPending,
      todayCollection
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
});

// GET reports
router.get("/reports/:type", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    const { type } = req.params;
    const { institution, course, academicYear, semester } = req.query;
    const filter = {};

    if (institution) filter.institution = institution;
    if (course) filter.course = course;
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;

    let report = [];

    switch (type) {
      case "form-fill-up":
        report = await FormFillUpFee.find(filter).sort({ createdAt: -1 });
        break;
      case "paid":
        filter.paymentStatus = "Paid";
        report = await FormFillUpFee.find(filter).sort({ paymentDate: -1 });
        break;
      case "pending":
        filter.paymentStatus = { $in: ["Unpaid", "Partial"] };
        report = await FormFillUpFee.find(filter).sort({ lastDate: 1 });
        break;
      case "course-wise":
        report = await FormFillUpFee.aggregate([
          { $match: filter },
          { $group: { _id: "$course", count: { $sum: 1 }, totalAmount: { $sum: "$totalPayable" }, paidAmount: { $sum: "$paidAmount" } } },
          { $sort: { _id: 1 } }
        ]);
        break;
      case "daily":
        report = await FormFillUpFee.find({
          ...filter,
          $or: [
            { paymentDate: getTodayString() },
            { "paymentHistory.date": getTodayString() },
            { paymentDate: getLegacyTodayString() },
            { "paymentHistory.date": getLegacyTodayString() },
          ],
        });
        break;
      case "monthly":
        const currentMonth = new Date().toISOString().slice(0, 7);
        report = await FormFillUpFee.find({
          ...filter,
          paymentDate: { $regex: "^" + currentMonth }
        });
        break;
      default:
        return res.status(400).json({ message: "Invalid report type" });
    }

    res.json(report);
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ message: "Failed to generate report" });
  }
});

// POST create new form fill-up fee
router.post("/", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const { studentId, studentName, institution, course, academicYear, semester, lastDate, paymentMethod, paymentStatus } = req.body;

    if (!studentId || !studentName || !institution || !course || !semester || !academicYear || !lastDate) {
      return res.status(400).json({ message: "Student, institution, course, semester, academic year and last date are required" });
    }

    const amounts = buildFeeAmounts(req.body);
    const existingFee = await FormFillUpFee.findOne({ studentId, course, semester, academicYear });
    if (existingFee) {
      return res.status(409).json({ message: "Form fill-up fee already exists for this student, course, semester and academic year" });
    }

    const paidAmount = paymentStatus === "Paid"
      ? amounts.totalPayable
      : paymentStatus === "Partial"
        ? toAmount(req.body.paidAmount, "Paid amount")
        : 0;

    if (paidAmount > amounts.totalPayable) {
      return res.status(400).json({ message: "Paid amount cannot be greater than total payable" });
    }

    const pendingAmount = Math.max(amounts.totalPayable - paidAmount, 0);
    const resolvedPaymentStatus = pendingAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Unpaid";
    const receiptNumber = paidAmount > 0 ? buildReceiptNumber() : "";
    const paymentDate = paidAmount > 0 ? getTodayString() : "";

    const newFee = await FormFillUpFee.create({
      studentId,
      studentName,
      institution,
      course,
      academicYear,
      semester,
      ...amounts,
      paidAmount,
      pendingAmount,
      lastDate,
      paymentMethod: paymentMethod || "",
      paymentStatus: resolvedPaymentStatus,
      paymentDate,
      receiptNumber,
      adjustmentReason: String(req.body.adjustmentReason || "").trim(),
      createdBy: req.currentUser?.email || req.currentUser?.role || "Admin",
      paymentHistory: paidAmount > 0
        ? [buildPaymentHistoryEntry({
            fee: { course, semester, ...amounts },
            paymentDate,
            amount: paidAmount,
            paymentMethod,
            receiptNumber,
            notes: "Paid during form fill-up fee entry",
            totalPaidAmount: paidAmount,
          })]
        : [],
    });

    res.status(201).json(newFee);
  } catch (error) {
    console.error("Error creating form fill-up fee:", error);
    res.status(400).json({ message: error.message || "Failed to create form fill-up fee" });
  }
});

// POST bulk create/update form fill-up fees for a course/semester
router.post("/bulk", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const { studentIds, course, semester, academicYear, formFillUpFee, examFee, otherFees, lastDate, paymentMethod, paymentStatus } = req.body;

    if (!course || !semester || !academicYear || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: "Course, semester, academic year and student IDs are required" });
    }

    const feeAmount = toAmount(formFillUpFee, "Form fill-up fee", { required: true });
    const examFeeAmount = toAmount(examFee, "Exam fee");
    const otherFeeAmount = toAmount(otherFees, "Other fees");
    const totalPayable = Math.max(feeAmount + examFeeAmount + otherFeeAmount, 0);

    if (totalPayable <= 0) {
      return res.status(400).json({ message: "Total payable amount must be greater than zero" });
    }

    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (const studentInfo of studentIds) {
      try {
        const sid = typeof studentInfo === "object" ? (studentInfo.studentId || studentInfo.id || studentInfo._id) : studentInfo;
        const sname = typeof studentInfo === "object" ? (studentInfo.studentName || studentInfo.name || "") : "";

        if (!sid) {
          results.skipped++;
          continue;
        }

        const existing = await FormFillUpFee.findOne({ studentId: sid, course, semester, academicYear });

        if (existing) {
          existing.formFillUpFee = feeAmount;
          existing.examFee = examFeeAmount;
          existing.otherFees = otherFeeAmount;
          existing.totalPayable = totalPayable;
          if (lastDate) existing.lastDate = lastDate;
          if (paymentMethod) existing.paymentMethod = paymentMethod;
          existing.updatedBy = req.currentUser?.email || req.currentUser?.role || "Admin";
          await existing.save();
          results.updated++;
        } else {
          const paidAmt = paymentStatus === "Paid" ? totalPayable : 0;
          await FormFillUpFee.create({
            studentId: sid,
            studentName: sname || sid,
            course,
            semester,
            academicYear,
            formFillUpFee: feeAmount,
            examFee: examFeeAmount,
            otherFees: otherFeeAmount,
            totalPayable,
            paidAmount: paidAmt,
            pendingAmount: totalPayable - paidAmt,
            lastDate: lastDate || "",
            paymentMethod: paymentMethod || "",
            paymentStatus: paymentStatus || "Unpaid",
            createdBy: req.currentUser?.email || req.currentUser?.role || "Admin",
          });
          results.created++;
        }
      } catch (err) {
        results.errors.push({ studentId: typeof studentInfo === "object" ? studentInfo.studentId : studentInfo, error: err.message });
      }
    }

    res.json({
      message: "Bulk operation completed: " + results.created + " created, " + results.updated + " updated, " + results.skipped + " skipped",
      results,
    });
  } catch (error) {
    console.error("Error bulk creating form fill-up fees:", error);
    res.status(500).json({ message: error.message || "Failed to bulk create form fill-up fees" });
  }
});

// PUT update form fill-up fee
router.put("/:id", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const existing = await FormFillUpFee.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({ message: "Form fill-up fee not found" });
    }

    const previousPaidAmount = Number(existing.paidAmount) || 0;
    const previousPaymentStatus = existing.paymentStatus;
    const nextPayload = { ...existing.toObject(), ...req.body };
    const amounts = buildFeeAmounts(nextPayload);
    const requestedStatus = req.body.paymentStatus || nextPayload.paymentStatus;
    const paidAmount = requestedStatus === "Paid" && req.body.paidAmount === undefined
      ? amounts.totalPayable
      : Math.max(toAmount(nextPayload.paidAmount, "Paid amount"), 0);

    if (paidAmount > amounts.totalPayable) {
      return res.status(400).json({ message: "Paid amount cannot be greater than total payable" });
    }

    const pendingAmount = Math.max(amounts.totalPayable - paidAmount, 0);
    const paymentStatus =
      pendingAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : (req.body.paymentStatus || "Unpaid");
    const newlyPaidAmount = Math.max(paidAmount - previousPaidAmount, 0);
    const paymentDate = newlyPaidAmount > 0 ? getTodayString() : existing.paymentDate;
    const receiptNumber = newlyPaidAmount > 0 ? buildReceiptNumber() : existing.receiptNumber;

    Object.assign(existing, {
      ...req.body,
      ...amounts,
      paidAmount,
      pendingAmount,
      paymentStatus,
      paymentDate,
      receiptNumber,
      paymentMethod: paidAmount > 0 ? (req.body.paymentMethod || existing.paymentMethod || "Cash") : "",
      adjustmentReason: String(req.body.adjustmentReason ?? existing.adjustmentReason ?? "").trim(),
      updatedBy: req.currentUser?.email || req.currentUser?.role || "Admin",
    });

    if (newlyPaidAmount > 0 || (previousPaymentStatus !== "Paid" && paymentStatus === "Paid" && paidAmount > 0 && existing.paymentHistory.length === 0)) {
      existing.paymentHistory.push(buildPaymentHistoryEntry({
        fee: existing,
        paymentDate: getTodayString(),
        amount: newlyPaidAmount || paidAmount,
        paymentMethod: existing.paymentMethod,
        receiptNumber: existing.receiptNumber || buildReceiptNumber(),
        notes: "Payment updated during fee edit",
        totalPaidAmount: paidAmount,
      }));
    }

    await existing.save();

    res.json(existing);
  } catch (error) {
    console.error("Error updating form fill-up fee:", error);
    res.status(400).json({ message: error.message || "Failed to update form fill-up fee" });
  }
});

// DELETE form fill-up fee
router.delete("/:id", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const deletedFee = await FormFillUpFee.findByIdAndDelete(req.params.id);

    if (!deletedFee) {
      return res.status(404).json({ message: "Form fill-up fee not found" });
    }

    res.json({ message: "Form fill-up fee deleted successfully" });
  } catch (error) {
    console.error("Error deleting form fill-up fee:", error);
    res.status(500).json({ message: "Failed to delete form fill-up fee" });
  }
});

// GET single form fill-up fee by ID
router.get("/:id", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    const fee = await FormFillUpFee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ message: "Form fill-up fee not found" });
    }

    res.json(fee);
  } catch (error) {
    console.error("Error fetching form fill-up fee:", error);
    res.status(500).json({ message: "Failed to fetch form fill-up fee" });
  }
});

// POST record payment
router.post("/:id/payment", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const { amount, paymentMethod, notes } = req.body;
    const fee = await FormFillUpFee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ message: "Form fill-up fee not found" });
    }

    const paymentAmount = toAmount(amount, "Payment amount", { required: true });
    const currentPending = Math.max(fee.pendingAmount ?? (fee.totalPayable - (fee.paidAmount || 0)), 0);

    if (paymentAmount <= 0) {
      return res.status(400).json({ message: "Payment amount must be greater than zero" });
    }

    if (paymentAmount > currentPending) {
      return res.status(400).json({ message: "Payment amount cannot be greater than pending amount" });
    }

    const receiptNumber = buildReceiptNumber();
    const paymentDate = getTodayString();

    fee.paidAmount = (fee.paidAmount || 0) + paymentAmount;
    fee.pendingAmount = Math.max(fee.totalPayable - fee.paidAmount, 0);
    fee.paymentMethod = paymentMethod || fee.paymentMethod;
    fee.paymentDate = paymentDate;
    fee.receiptNumber = receiptNumber;
    fee.paymentStatus = fee.pendingAmount <= 0 ? "Paid" : "Partial";

    fee.paymentHistory.push({
      date: paymentDate,
      amount: paymentAmount,
      method: paymentMethod,
      receiptNumber,
      notes,
      course: fee.course,
      semester: fee.semester,
      formFillUpFee: fee.formFillUpFee || 0,
      examFee: fee.examFee || 0,
      otherFees: fee.otherFees || 0,
      studentAdjustment: fee.studentAdjustment || 0,
      totalPayable: fee.totalPayable,
      totalPaidAmount: fee.paidAmount,
    });

    await fee.save();
    res.json(fee);
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({ message: "Failed to record payment" });
  }
});

// POST add installment
router.post("/:id/installments", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const { amount, dueDate } = req.body;
    const fee = await FormFillUpFee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ message: "Form fill-up fee not found" });
    }

    const installmentNumber = fee.installments.length + 1;
    fee.installments.push({
      installmentNumber,
      amount,
      dueDate,
      status: "Pending"
    });

    await fee.save();
    res.json(fee);
  } catch (error) {
    console.error("Error adding installment:", error);
    res.status(500).json({ message: "Failed to add installment" });
  }
});

// POST calculate and apply late fee
router.post("/:id/late-fee", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const { lateFeeAmount } = req.body;
    const fee = await FormFillUpFee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ message: "Form fill-up fee not found" });
    }

    fee.lateFee = lateFeeAmount || 0;
    fee.lateFeeApplied = true;
    fee.otherFees = (fee.otherFees || 0) + fee.lateFee;
    fee.totalPayable = (fee.formFillUpFee || 0) + (fee.examFee || 0) + (fee.otherFees || 0) + (fee.studentAdjustment || 0);
    fee.pendingAmount = Math.max(fee.totalPayable - (fee.paidAmount || 0), 0);
    fee.paymentStatus = fee.pendingAmount <= 0 ? "Paid" : (fee.paidAmount || 0) > 0 ? "Partial" : "Unpaid";

    await fee.save();
    res.json(fee);
  } catch (error) {
    console.error("Error applying late fee:", error);
    res.status(500).json({ message: "Failed to apply late fee" });
  }
});

// POST send reminder
router.post("/:id/reminder", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const { type } = req.body;
    const fee = await FormFillUpFee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ message: "Form fill-up fee not found" });
    }

    const today = getTodayString();

    if (type === "email") {
      fee.reminders.emailSent = true;
      fee.reminders.emailSentDate = today;
    } else if (type === "sms") {
      fee.reminders.smsSent = true;
      fee.reminders.smsSentDate = today;
    }

    await fee.save();
    res.json({ message: "Reminder sent successfully", fee });
  } catch (error) {
    console.error("Error sending reminder:", error);
    res.status(500).json({ message: "Failed to send reminder" });
  }
});

export default router;
