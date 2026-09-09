import express from "express";
import RegistrationFee from "../models/RegistrationFee.js";
import RegistrationFeeConfig from "../models/RegistrationFeeConfig.js";
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
  const baseRegistrationFee = toAmount(
    payload.baseRegistrationFee ?? payload.registrationFee,
    "Registration fee",
    { required: true }
  );
  const otherFees = toAmount(payload.otherFees, "Other fees");
  const studentAdjustment = toAmount(payload.studentAdjustment, "Student adjustment", {
    allowNegative: true,
  });
  const totalPayable = Math.max(baseRegistrationFee + otherFees + studentAdjustment, 0);

  if (totalPayable <= 0) {
    throw new Error("Total payable amount must be greater than zero");
  }

  return {
    baseRegistrationFee,
    otherFees,
    studentAdjustment,
    totalPayable,
    registrationFee: totalPayable,
  };
}

function buildReceiptNumber() {
  return `RCPT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-6)}`;
}

function escapeXml(unsafe) {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildRegistrationFeesExcelXml(records = []) {
  const headers = [
    "Student ID",
    "Student Name",
    "Course",
    "Semester",
    "Academic Year",
    "Base Registration Fee",
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
    .map((header) => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`)
    .join("");

  const rowXml = records
    .map((record) => {
      const cells = [
        record.studentId,
        record.studentName,
        record.course,
        record.semester,
        record.academicYear,
        record.baseRegistrationFee,
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
        .map((val) => `<Cell><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`)
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#DCEBFF" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Registration Fees">
  <Table>
   <Row>${headerXml}</Row>
   ${rowXml}
  </Table>
 </Worksheet>
</Workbook>`;
}

// GET export registration fees as Excel XML
router.get("/export", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    const { course, academicYear, semester, paymentStatus, paymentMethod, dueDate } = req.query;
    const filter = {};

    if (course && course !== "All") filter.course = course;
    if (academicYear && academicYear !== "All") filter.academicYear = academicYear;
    if (semester && semester !== "All") filter.semester = semester;
    if (paymentStatus && paymentStatus !== "All") filter.paymentStatus = paymentStatus;
    if (paymentMethod && paymentMethod !== "All") filter.paymentMethod = paymentMethod;
    if (dueDate) filter.lastDate = dueDate;

    const fees = await RegistrationFee.find(filter).sort({ createdAt: -1 });

    const timestamp = new Date().toISOString().slice(0, 10);
    const workbookXml = buildRegistrationFeesExcelXml(fees);

    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="registration-fees-export-${timestamp}.xls"`
    );
    return res.status(200).send(workbookXml);
  } catch (error) {
    console.error("Error exporting registration fees:", error);
    return res.status(500).json({ message: "Failed to export registration fees" });
  }
});

// GET all registration fees with filters
router.get("/", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    const { course, academicYear, semester, paymentStatus, paymentMethod, dueDate } = req.query;
    const filter = {};

    if (course) filter.course = course;
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (dueDate) filter.lastDate = dueDate;

    const fees = await RegistrationFee.find(filter).sort({ createdAt: -1 });
    res.json(fees);
  } catch (error) {
    console.error("Error fetching registration fees:", error);
    res.status(500).json({ message: "Failed to fetch registration fees" });
  }
});

// GET statistics
router.get("/stats/summary", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    const total = await RegistrationFee.countDocuments();
    const paid = await RegistrationFee.countDocuments({ paymentStatus: "Paid" });
    const pending = await RegistrationFee.countDocuments({ paymentStatus: "Unpaid" });
    const partial = await RegistrationFee.countDocuments({ paymentStatus: "Partial" });

    const paidFees = await RegistrationFee.find({ paymentStatus: "Paid" });
    const totalCollection = paidFees.reduce((sum, fee) => sum + (fee.paidAmount || fee.registrationFee || 0), 0);

    const pendingFees = await RegistrationFee.find({ paymentStatus: { $in: ["Unpaid", "Partial"] } });
    const totalPending = pendingFees.reduce((sum, fee) => sum + (fee.pendingAmount || fee.registrationFee || 0), 0);

    res.json({
      total,
      paid,
      pending,
      partial,
      totalCollection,
      totalPending
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
    const { course, academicYear, semester } = req.query;
    const filter = {};

    if (course) filter.course = course;
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;

    let report = [];

    switch (type) {
      case "registration-fee":
        report = await RegistrationFee.find(filter).sort({ createdAt: -1 });
        break;
      case "paid":
        filter.paymentStatus = "Paid";
        report = await RegistrationFee.find(filter).sort({ paymentDate: -1 });
        break;
      case "pending":
        filter.paymentStatus = { $in: ["Unpaid", "Partial"] };
        report = await RegistrationFee.find(filter).sort({ lastDate: 1 });
        break;
      case "course-wise":
        report = await RegistrationFee.aggregate([
          { $match: filter },
          { $group: { _id: "$course", count: { $sum: 1 }, totalAmount: { $sum: "$registrationFee" }, paidAmount: { $sum: "$paidAmount" } } },
          { $sort: { _id: 1 } }
        ]);
        break;
      case "daily":
        const today = new Date().toISOString().split('T')[0];
        report = await RegistrationFee.find({
          ...filter,
          paymentDate: today
        });
        break;
      case "monthly":
        const currentMonth = new Date().toISOString().slice(0, 7);
        report = await RegistrationFee.find({
          ...filter,
          paymentDate: { $regex: `^${currentMonth}` }
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

// GET course and semester registration fee setup
router.get("/setups", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    const { course, semester, academicYear, active } = req.query;
    const filter = {};

    if (course) filter.course = course;
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;
    if (active !== undefined) filter.active = active !== "false";

    const setups = await RegistrationFeeConfig.find(filter)
      .sort({ academicYear: -1, course: 1, semester: 1 })
      .lean();

    res.json(setups);
  } catch (error) {
    console.error("Error fetching registration fee setups:", error);
    res.status(500).json({ message: "Failed to fetch registration fee setups" });
  }
});

// GET current setup for a course, semester and academic year
router.get("/setups/current", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    const { course, semester, academicYear } = req.query;

    if (!course || !semester || !academicYear) {
      return res.status(400).json({ message: "Course, semester and academic year are required" });
    }

    const setup = await RegistrationFeeConfig.findOne({
      course,
      semester,
      academicYear,
      active: true,
    }).lean();

    res.json(setup || null);
  } catch (error) {
    console.error("Error fetching current registration fee setup:", error);
    res.status(500).json({ message: "Failed to fetch current registration fee setup" });
  }
});

// POST create or update course/semester registration fee setup
router.post("/setups", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const { course, semester, academicYear, lastDate, active } = req.body;
    const registrationFee = toAmount(req.body.registrationFee, "Registration fee", { required: true });
    const otherFees = toAmount(req.body.otherFees, "Other fees");

    if (!course || !semester || !academicYear) {
      return res.status(400).json({ message: "Course, semester and academic year are required" });
    }

    if (registrationFee + otherFees <= 0) {
      return res.status(400).json({ message: "Registration fee setup total must be greater than zero" });
    }

    const setup = await RegistrationFeeConfig.findOneAndUpdate(
      { course, semester, academicYear },
      {
        $set: {
          course,
          semester,
          academicYear,
          registrationFee,
          otherFees,
          lastDate: String(lastDate || "").trim(),
          active: active !== false,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(setup);
  } catch (error) {
    console.error("Error saving registration fee setup:", error);
    res.status(400).json({ message: error.message || "Failed to save registration fee setup" });
  }
});

// POST create new registration fee
router.post("/", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const { studentId, studentName, course, academicYear, semester, lastDate, paymentMethod, paymentStatus } = req.body;

    if (!studentId || !studentName || !course || !semester || !academicYear || !lastDate) {
      return res.status(400).json({ message: "Student, course, semester, academic year and last date are required" });
    }

    const amounts = buildFeeAmounts(req.body);
    const existingFee = await RegistrationFee.findOne({ studentId, course, semester, academicYear });
    if (existingFee) {
      return res.status(409).json({ message: "Registration fee already exists for this student, course, semester and academic year" });
    }

    const paidAmount = paymentStatus === "Paid" ? amounts.totalPayable : 0;
    const pendingAmount = paymentStatus === "Paid" ? 0 : amounts.totalPayable;
    const receiptNumber = paymentStatus === "Paid" ? buildReceiptNumber() : "";
    const paymentDate = paymentStatus === "Paid" ? new Date().toISOString().split("T")[0] : "";

    const newFee = await RegistrationFee.create({
      studentId,
      studentName,
      course,
      academicYear,
      semester,
      ...amounts,
      paidAmount,
      pendingAmount,
      lastDate,
      paymentMethod: paymentMethod || "",
      paymentStatus: paymentStatus || "Unpaid",
      paymentDate,
      receiptNumber,
      adjustmentReason: String(req.body.adjustmentReason || "").trim(),
      paymentHistory: paymentStatus === "Paid"
        ? [{
            date: paymentDate,
            amount: paidAmount,
            method: paymentMethod || "",
            receiptNumber,
            notes: "Paid during registration fee entry",
            course,
            semester,
            registrationFee: amounts.baseRegistrationFee,
            otherFees: amounts.otherFees,
            studentAdjustment: amounts.studentAdjustment,
            totalPayable: amounts.totalPayable,
            totalPaidAmount: paidAmount,
          }]
        : [],
    });

    res.status(201).json(newFee);
  } catch (error) {
    console.error("Error creating registration fee:", error);
    res.status(400).json({ message: error.message || "Failed to create registration fee" });
  }
});

// PUT update registration fee
router.put("/:id", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const existing = await RegistrationFee.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({ message: "Registration fee not found" });
    }

    const nextPayload = { ...existing.toObject(), ...req.body };
    const amounts = buildFeeAmounts(nextPayload);
    const paidAmount = Math.max(toAmount(nextPayload.paidAmount, "Paid amount"), 0);
    const pendingAmount = Math.max(amounts.totalPayable - paidAmount, 0);
    const paymentStatus =
      pendingAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : (req.body.paymentStatus || "Unpaid");

    Object.assign(existing, {
      ...req.body,
      ...amounts,
      paidAmount,
      pendingAmount,
      paymentStatus,
      adjustmentReason: String(req.body.adjustmentReason ?? existing.adjustmentReason ?? "").trim(),
    });

    await existing.save();

    res.json(existing);
  } catch (error) {
    console.error("Error updating registration fee:", error);
    res.status(400).json({ message: error.message || "Failed to update registration fee" });
  }
});

// DELETE registration fee
router.delete("/:id", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const deletedFee = await RegistrationFee.findByIdAndDelete(req.params.id);

    if (!deletedFee) {
      return res.status(404).json({ message: "Registration fee not found" });
    }

    res.json({ message: "Registration fee deleted successfully" });
  } catch (error) {
    console.error("Error deleting registration fee:", error);
    res.status(500).json({ message: "Failed to delete registration fee" });
  }
});

// GET single registration fee by ID
router.get("/:id", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    const fee = await RegistrationFee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ message: "Registration fee not found" });
    }

    res.json(fee);
  } catch (error) {
    console.error("Error fetching registration fee:", error);
    res.status(500).json({ message: "Failed to fetch registration fee" });
  }
});

// POST record payment
router.post("/:id/payment", verifyToken, attachCurrentUser, requireFinanceAccess, async (req, res) => {
  try {
    const { amount, paymentMethod, notes } = req.body;
    const fee = await RegistrationFee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ message: "Registration fee not found" });
    }

    const paymentAmount = toAmount(amount, "Payment amount", { required: true });
    const payableAmount = fee.totalPayable || fee.registrationFee || 0;
    const currentPending = Math.max(fee.pendingAmount ?? (payableAmount - (fee.paidAmount || 0)), 0);

    if (paymentAmount <= 0) {
      return res.status(400).json({ message: "Payment amount must be greater than zero" });
    }

    if (paymentAmount > currentPending) {
      return res.status(400).json({ message: "Payment amount cannot be greater than pending amount" });
    }

    const receiptNumber = buildReceiptNumber();
    const paymentDate = new Date().toISOString().split('T')[0];

    fee.paidAmount = (fee.paidAmount || 0) + paymentAmount;
    fee.pendingAmount = Math.max(payableAmount - fee.paidAmount, 0);
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
      registrationFee: fee.baseRegistrationFee || fee.registrationFee || 0,
      otherFees: fee.otherFees || 0,
      studentAdjustment: fee.studentAdjustment || 0,
      totalPayable: payableAmount,
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
    const fee = await RegistrationFee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ message: "Registration fee not found" });
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
    const fee = await RegistrationFee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ message: "Registration fee not found" });
    }

    fee.lateFee = lateFeeAmount || 0;
    fee.lateFeeApplied = true;
    fee.otherFees = (fee.otherFees || 0) + fee.lateFee;
    fee.totalPayable = (fee.baseRegistrationFee || fee.registrationFee || 0) + (fee.otherFees || 0) + (fee.studentAdjustment || 0);
    fee.registrationFee = fee.totalPayable;
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
    const fee = await RegistrationFee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ message: "Registration fee not found" });
    }

    const today = new Date().toISOString().split('T')[0];

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
