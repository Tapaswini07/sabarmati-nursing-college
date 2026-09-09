import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import Student from "../models/student.js";
import Fee from "../models/Fee.js";
import AdmissionFeeConfig from "../models/AdmissionFeeConfig.js";
import {
  attachCurrentUser,
  requireAdminOrSuperAdmin,
  requireRole,
  verifyToken,
} from "../middleware/AuthMiddleware.js";
import { ROLES } from "../constants/roles.js";
import {
  BSC_NURSING_FEE_STRUCTURE,
  BSC_NURSING_YEARLY_TOTAL,
  LEGACY_DEFAULT_FEE,
  buildAdmissionBatch,
  inferInstitutionFromCourse,
  isBscNursingCourse,
  normalizeCourseName,
} from "../constants/feeStructures.js";
import { loadLinkedStudentForUser } from "../utils/studentLinking.js";
import {
  applyStoredFees,
  loadStoredFees,
  persistStudentFees,
} from "../utils/feeStore.js";
import { applyActiveFeeStructure } from "../utils/feeStructureStore.js";

const router = express.Router();
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "";
const razorpayClient =
  razorpayKeyId && razorpayKeySecret
    ? new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      })
    : null;

function ensureRazorpayConfigured() {
  return Boolean(razorpayClient && razorpayKeyId && razorpayKeySecret);
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
}

function toIsoDate(value = new Date()) {
  return new Date(value).toISOString();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function inferDepartmentFromCourse(course = "") {
  const value = String(course).toLowerCase();

  if (value.includes("nursing")) return "Nursing";
  if (value.includes("polytechnic") || value.includes("engineering") || value.includes("b.tech")) return "Engineering";
  if (value.includes("dmlt") || value.includes("lab") || value.includes("medical")) return "Allied Health";
  if (value.includes("mba") || value.includes("management") || value.includes("bba")) return "Management";
  if (value.includes("b.com") || value.includes("commerce")) return "Commerce";
  if (value.includes("b.sc") || value.includes("science")) return "Science";
  if (value.includes("ba") || value.includes("arts")) return "Arts";

  return "General";
}

function normalizeCharge(item = {}, defaults = {}) {
  return {
    chargeId: String(item.chargeId || uniqueId("CHG")).trim(),
    title: String(item.title || defaults.title || "Charge").trim(),
    category: String(item.category || defaults.category || "Miscellaneous").trim(),
    scope: String(item.scope || defaults.scope || "Additional").trim(),
    amount: Math.max(toNumber(item.amount), 0),
    dueDate: String(item.dueDate || defaults.dueDate || "").trim(),
    status: String(item.status || defaults.status || "Pending").trim(),
    createdAtLabel: String(item.createdAtLabel || defaults.createdAtLabel || "").trim(),
    note: String(item.note || defaults.note || "").trim(),
  };
}

function buildBscNursingFeeStructure(dueDate = "") {
  return BSC_NURSING_FEE_STRUCTURE.map((item) =>
    normalizeCharge(
      {
        ...item,
        scope: "Structure",
        dueDate,
        note: "BSc Nursing official yearly fee structure",
      },
      { scope: "Structure" }
    )
  );
}

function normalizeDiscount(item = {}) {
  const value = Math.max(toNumber(item.value), 0);
  const amount = Math.max(toNumber(item.amount), 0);

  return {
    discountId: String(item.discountId || uniqueId("DISC")).trim(),
    title: String(item.title || "Discount").trim(),
    scope: String(item.scope || "Student").trim(),
    mode: String(item.mode || "Flat").trim(),
    value,
    amount,
    reason: String(item.reason || "").trim(),
    appliedAt: String(item.appliedAt || toIsoDate()).trim(),
  };
}

function normalizeFineRule(item = {}) {
  return {
    ruleId: String(item.ruleId || uniqueId("FINE")).trim(),
    title: String(item.title || "Late fee rule").trim(),
    mode: String(item.mode || "Flat").trim(),
    value: Math.max(toNumber(item.value), 0),
    graceDays: Math.max(Math.trunc(toNumber(item.graceDays)), 0),
    active: item.active !== false,
  };
}

function normalizePaymentEntry(item = {}) {
  return {
    receiptNumber: String(item.receiptNumber || uniqueId("RCT")).trim(),
    amount: Math.max(toNumber(item.amount), 0),
    method: String(item.method || "QR Payment").trim(),
    provider: String(item.provider || "Manual").trim(),
    transactionId: String(item.transactionId || uniqueId("TXN")).trim(),
    gatewayOrderId: String(item.gatewayOrderId || "").trim(),
    gatewayPaymentId: String(item.gatewayPaymentId || "").trim(),
    gatewaySignature: String(item.gatewaySignature || "").trim(),
    paymentDate: String(item.paymentDate || toIsoDate()).trim(),
    status: String(item.status || "Confirmed").trim(),
    confirmedBy: String(item.confirmedBy || "Admin").trim(),
    note: String(item.note || "").trim(),
  };
}

function normalizeRefund(item = {}) {
  return {
    refundNumber: String(item.refundNumber || uniqueId("RFD")).trim(),
    amount: Math.max(toNumber(item.amount), 0),
    reason: String(item.reason || "").trim(),
    reference: String(item.reference || "").trim(),
    refundDate: String(item.refundDate || toIsoDate()).trim(),
    status: String(item.status || "Processed").trim(),
    processedBy: String(item.processedBy || "Admin").trim(),
  };
}

function createLedgerEntry({
  entryType,
  category,
  title,
  amount,
  direction,
  balanceAfter,
  reference = "",
  note = "",
  status = "Posted",
  entryDate = toIsoDate(),
}) {
  return {
    entryId: uniqueId("LED"),
    entryType,
    category,
    title,
    amount: Math.max(toNumber(amount), 0),
    direction,
    balanceAfter: Math.max(toNumber(balanceAfter), 0),
    entryDate,
    reference,
    note,
    status,
  };
}

function calculateFineAmount(student) {
  const dueDateValue = student.nextDueDate ? new Date(student.nextDueDate) : null;
  if (!dueDateValue || Number.isNaN(dueDateValue.getTime())) return 0;
  const now = new Date();
  if (now <= dueDateValue) return 0;

  const overdueDays = Math.ceil((now.getTime() - dueDateValue.getTime()) / (1000 * 60 * 60 * 24));

  return (student.fineRules || []).reduce((total, rule) => {
    if (!rule?.active) return total;
    const graceDays = Math.max(toNumber(rule.graceDays), 0);
    if (overdueDays <= graceDays) return total;
    if (rule.mode === "Per Day") return total + (overdueDays - graceDays) * Math.max(toNumber(rule.value), 0);
    return total + Math.max(toNumber(rule.value), 0);
  }, 0);
}

function normalizeFeeData(student) {
  const isOfficialBscNursing = isBscNursingCourse(student.course);
  const hasLegacyBscFee =
    isOfficialBscNursing &&
    (!student.feeStructure?.length ||
      toNumber(student.baseFee) === LEGACY_DEFAULT_FEE ||
      toNumber(student.totalFee) === LEGACY_DEFAULT_FEE);
  const baseFee = hasLegacyBscFee
    ? BSC_NURSING_YEARLY_TOTAL
    : Math.max(toNumber(student.baseFee ?? student.totalFee ?? BSC_NURSING_YEARLY_TOTAL), 0);
  const feeStructure = hasLegacyBscFee
    ? buildBscNursingFeeStructure(student.nextDueDate)
    : Array.isArray(student.feeStructure)
    ? student.feeStructure.map((item) => normalizeCharge(item, { scope: "Structure", category: "Tuition" }))
    : [];
  const extraCharges = Array.isArray(student.extraCharges)
    ? student.extraCharges.map((item) => normalizeCharge(item, { scope: "Additional", category: "Additional" }))
    : [];
  const examFees = Array.isArray(student.examFees)
    ? student.examFees.map((item) => normalizeCharge(item, { scope: "Exam", category: "Exam Fee" }))
    : [];
  const discounts = Array.isArray(student.discounts) ? student.discounts.map(normalizeDiscount) : [];
  const fineRules = Array.isArray(student.fineRules) ? student.fineRules.map(normalizeFineRule) : [];
  const paymentHistory = Array.isArray(student.paymentHistory) ? student.paymentHistory.map(normalizePaymentEntry) : [];
  const refunds = Array.isArray(student.refunds) ? student.refunds.map(normalizeRefund) : [];
  const structureTotal = feeStructure.reduce((sum, item) => sum + item.amount, 0);
  const derivedBaseFee = structureTotal > 0 ? structureTotal : baseFee;
  const extraChargeTotal = extraCharges.reduce((sum, item) => sum + item.amount, 0);
  const examFeeTotal = examFees.reduce((sum, item) => sum + item.amount, 0);
  const discountTotal = discounts.reduce((sum, item) => sum + item.amount, 0);

  student.baseFee = derivedBaseFee;
  student.feeStructure = feeStructure;
  student.extraCharges = extraCharges;
  student.examFees = examFees;
  student.discounts = discounts;
  student.fineRules = fineRules;
  student.paymentHistory = paymentHistory.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  student.refunds = refunds.sort((a, b) => new Date(b.refundDate).getTime() - new Date(a.refundDate).getTime());
  student.totalDiscount = discountTotal;
  student.totalExtraCharges = extraChargeTotal + examFeeTotal;
  student.totalFine = calculateFineAmount(student);

  const totalFee = Math.max(derivedBaseFee + student.totalExtraCharges + student.totalFine - discountTotal - toNumber(student.scholarshipAmount), 0);
  const paidAmount = paymentHistory.reduce((sum, item) => sum + item.amount, 0);
  const refundAmount = refunds.reduce((sum, item) => sum + item.amount, 0);
  const effectivePaid = Math.max(paidAmount - refundAmount, 0);
  const pendingAmount = Math.max(totalFee - effectivePaid, 0);

  student.totalFee = totalFee;
  student.paidAmount = effectivePaid;
  student.pendingAmount = pendingAmount;
  student.outstandingAmount = pendingAmount;
  student.lastPaymentDate = paymentHistory[0]?.paymentDate || "";
  student.outstandingStatus =
    pendingAmount <= 0
      ? "Cleared"
      : student.nextDueDate && new Date(student.nextDueDate) < new Date()
        ? "Overdue"
        : "Pending";

  const existingLedger = hasLegacyBscFee
    ? []
    : Array.isArray(student.ledgerEntries)
      ? student.ledgerEntries
      : [];
  if (existingLedger.length === 0) {
    const ledgerEntries = [];
    let runningBalance = 0;
    const chargeEntries = [
      ...feeStructure.map((item) => ({
        entryType: "Charge",
        category: item.category,
        title: item.title,
        amount: item.amount,
        direction: "Debit",
        entryDate: item.dueDate || toIsoDate(student.createdAt || new Date()),
        reference: item.chargeId,
        note: item.note,
      })),
      ...extraCharges.map((item) => ({
        entryType: "Charge",
        category: item.category,
        title: item.title,
        amount: item.amount,
        direction: "Debit",
        entryDate: item.dueDate || toIsoDate(),
        reference: item.chargeId,
        note: item.note,
      })),
      ...examFees.map((item) => ({
        entryType: "Exam Fee",
        category: item.category,
        title: item.title,
        amount: item.amount,
        direction: "Debit",
        entryDate: item.dueDate || toIsoDate(),
        reference: item.chargeId,
        note: item.note,
      })),
      ...discounts.map((item) => ({
        entryType: "Discount",
        category: item.scope,
        title: item.title,
        amount: item.amount,
        direction: "Credit",
        entryDate: item.appliedAt || toIsoDate(),
        reference: item.discountId,
        note: item.reason,
      })),
      ...paymentHistory.map((item) => ({
        entryType: "Payment",
        category: item.method,
        title: item.receiptNumber,
        amount: item.amount,
        direction: "Credit",
        entryDate: item.paymentDate,
        reference: item.transactionId,
        note: item.note,
      })),
      ...refunds.map((item) => ({
        entryType: "Refund",
        category: "Refund",
        title: item.refundNumber,
        amount: item.amount,
        direction: "Debit",
        entryDate: item.refundDate,
        reference: item.reference,
        note: item.reason,
      })),
    ].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

    chargeEntries.forEach((entry) => {
      runningBalance += entry.direction === "Debit" ? entry.amount : -entry.amount;
      ledgerEntries.push(createLedgerEntry({ ...entry, balanceAfter: runningBalance, status: "Posted" }));
    });

    if (student.totalFine > 0) {
      runningBalance += student.totalFine;
      ledgerEntries.push(
        createLedgerEntry({
          entryType: "Fine",
          category: "Late Fee",
          title: "Late fee fine",
          amount: student.totalFine,
          direction: "Debit",
          balanceAfter: runningBalance,
          reference: uniqueId("FINE"),
          note: "Auto-calculated based on due date and fine rules",
        })
      );
    }

    student.ledgerEntries = ledgerEntries.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  } else {
    student.ledgerEntries = existingLedger.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }

  return student;
}

function buildStudentSnapshot(student) {
  normalizeFeeData(student);
  const department = String(student.department || "").trim() || inferDepartmentFromCourse(student.course);

  return {
    _id: student._id,
    studentName: student.studentName,
    fullName: student.fullName,
    registrationNo: student.registrationNo,
    admissionNumber: student.admissionNumber,
    applicationId: student.applicationId,
    institution: student.institution,
    course: student.course,
    department,
    year: student.year,
    admissionYear: student.admissionYear,
    admissionBatch: student.admissionBatch,
    currentStudyYear: student.currentStudyYear,
    feePlan: student.feePlan,
    baseFee: student.baseFee,
    totalFee: student.totalFee,
    paidAmount: student.paidAmount,
    pendingAmount: student.pendingAmount,
    totalDiscount: student.totalDiscount,
    totalFine: student.totalFine,
    totalExtraCharges: student.totalExtraCharges,
    outstandingAmount: student.outstandingAmount,
    outstandingStatus: student.outstandingStatus,
    nextDueDate: student.nextDueDate,
    lastPaymentDate: student.lastPaymentDate,
    paymentHistory: student.paymentHistory,
    refunds: student.refunds,
    discounts: student.discounts,
    extraCharges: student.extraCharges,
    examFees: student.examFees,
    feeStructure: student.feeStructure,
    fineRules: student.fineRules,
    ledgerEntries: student.ledgerEntries,
    phone: student.phone,
    email: student.email,
    scholarshipAmount: toNumber(student.scholarshipAmount),
    scholarshipStatus: String(student.scholarshipStatus || "Not Applied"),
    admissionDate: student.admissionDate || "",
    fatherName: student.fatherName || "",
    motherName: student.motherName || "",
    guardianName: student.guardianName || "",
    parentName: student.parentName || "",
    rollNumber: student.rollNumber || student.studentRollNo || "",
    status: student.status || "Pending",
    address: student.address || "",
    gender: student.gender || "",
    photoUrl: student.photoUrl || "",
  };
}

function summarizeStudents(students) {
  const now = new Date();
  const monthlyRevenue = Array.from({ length: 6 }).map((_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const end = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);
    const label = start.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    const total = students.reduce((sum, student) => {
      const studentTotal = (student.paymentHistory || []).reduce((paymentSum, payment) => {
        const paymentDate = new Date(payment.paymentDate);
        return paymentDate >= start && paymentDate < end ? paymentSum + toNumber(payment.amount) : paymentSum;
      }, 0);
      return sum + studentTotal;
    }, 0);
    return { label, total };
  });

  const totals = students.reduce(
    (acc, student) => {
      acc.totalStudents += 1;
      acc.totalFeeCollection += toNumber(student.paidAmount);
      acc.totalDueAmount += toNumber(student.pendingAmount);
      acc.totalOutstanding += toNumber(student.outstandingAmount);
      acc.totalRefunds += (student.refunds || []).reduce((sum, refund) => sum + toNumber(refund.amount), 0);
      acc.totalFines += toNumber(student.totalFine);
      if (student.outstandingStatus === "Overdue") acc.overdueStudents += 1;
      if (toNumber(student.pendingAmount) <= 0) acc.paidStudents += 1;
      else acc.pendingStudents += 1;
      return acc;
    },
    {
      totalStudents: 0,
      totalFeeCollection: 0,
      totalDueAmount: 0,
      totalOutstanding: 0,
      totalRefunds: 0,
      totalFines: 0,
      overdueStudents: 0,
      paidStudents: 0,
      pendingStudents: 0,
    }
  );

  return {
    ...totals,
    monthlyRevenue,
    paymentStatusChart: [
      { label: "Paid", value: totals.paidStudents },
      { label: "Pending", value: totals.pendingStudents },
      { label: "Overdue", value: totals.overdueStudents },
    ],
    outstandingStudents: students
      .filter((student) => student.pendingAmount > 0)
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
      .slice(0, 8)
      .map((student) => ({
        registrationNo: student.registrationNo,
        studentName: student.studentName || student.fullName || "Student",
        course: student.course,
        department: student.department,
        pendingAmount: student.pendingAmount,
        status: student.outstandingStatus,
      })),
  };
}

async function loadAllStudents() {
  const students = await Student.find().sort({ createdAt: -1 });
  const feeRecords = await Fee.find({
    studentRef: { $in: students.map((student) => student._id) },
  });
  const feesByStudent = new Map(
    feeRecords.map((fee) => [String(fee.studentRef), fee])
  );

  return Promise.all(
    students.map(async (student) => {
      const storedFee = feesByStudent.get(String(student._id));
      applyStoredFees(student, storedFee);
      const snapshot = buildStudentSnapshot(student);
      if (!storedFee) await persistStudentFees(student);
      return snapshot;
    })
  );
}

async function loadCurrentStudent(currentUser) {
  const student = await loadLinkedStudentForUser(currentUser);
  if (!student) return null;

  const storedFee = await loadStoredFees(student);
  applyStoredFees(student, storedFee);
  const snapshot = buildStudentSnapshot(student);
  if (!storedFee) await persistStudentFees(student);
  return snapshot;
}

router.get("/", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const students = await loadAllStudents();
    return res.status(200).json(students);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching students", error: error.message });
  }
});

router.get("/me/profile", verifyToken, attachCurrentUser, requireRole(ROLES.STUDENT), async (req, res) => {
  try {
    const student = await loadCurrentStudent(req.currentUser);
    if (!student) {
      return res.status(404).json({ message: "Linked student record not found" });
    }

    return res.status(200).json({ student });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching profile", error: error.message });
  }
});

router.get("/me/fees", verifyToken, attachCurrentUser, requireRole(ROLES.STUDENT), async (req, res) => {
  try {
    const student = await loadCurrentStudent(req.currentUser);
    if (!student) {
      return res.status(404).json({ message: "Linked student record not found" });
    }

    return res.status(200).json({
      message: "Fee dashboard fetched successfully",
      student,
      receipts: student.paymentHistory,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error fetching fee details" });
  }
});

router.get("/fee-dashboard", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    if (req.currentUser.role === ROLES.STUDENT) {
      const student = await loadCurrentStudent(req.currentUser);
      if (!student) {
        return res.status(404).json({ message: "Linked student record not found" });
      }

      return res.status(200).json({
        message: "Fee dashboard fetched successfully",
        student,
      });
    }

    const registrationNo = req.query.registrationNo?.trim();
    const studentId = req.query.studentId?.trim();
    if (!registrationNo && !studentId) {
      return res.status(400).json({ message: "Registration number or student id is required" });
    }

    const student = await Student.findOne(registrationNo ? { registrationNo } : { _id: studentId });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    applyStoredFees(student, await loadStoredFees(student));
    const snapshot = buildStudentSnapshot(student);
    await student.save();
    await persistStudentFees(student);
    return res.status(200).json({ message: "Fee dashboard fetched successfully", student: snapshot });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error fetching fee details" });
  }
});

router.get("/fees/summary", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const students = await loadAllStudents();
    return res.status(200).json({
      message: "Fee summary fetched successfully",
      overview: summarizeStudents(students),
      students,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error fetching fee summary" });
  }
});

router.get("/fees/reports", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const students = await loadAllStudents();

    const dailyCollection = students.flatMap((student) =>
      (student.paymentHistory || []).map((payment) => ({
        date: payment.paymentDate,
        receiptNumber: payment.receiptNumber,
        registrationNo: student.registrationNo,
        studentName: student.studentName || student.fullName || "Student",
        course: student.course,
        department: student.department,
        method: payment.method,
        amount: payment.amount,
      }))
    );

    const dueReport = students
      .filter((student) => student.pendingAmount > 0)
      .map((student) => ({
        registrationNo: student.registrationNo,
        studentName: student.studentName || student.fullName || "Student",
        course: student.course,
        department: student.department,
        year: student.year,
        pendingAmount: student.pendingAmount,
        status: student.outstandingStatus,
        nextDueDate: student.nextDueDate,
      }));

    const fineReport = students
      .filter((student) => student.totalFine > 0)
      .map((student) => ({
        registrationNo: student.registrationNo,
        studentName: student.studentName || student.fullName || "Student",
        department: student.department,
        totalFine: student.totalFine,
        status: student.outstandingStatus,
      }));

    const refundReport = students.flatMap((student) =>
      (student.refunds || []).map((refund) => ({
        refundNumber: refund.refundNumber,
        registrationNo: student.registrationNo,
        studentName: student.studentName || student.fullName || "Student",
        course: student.course,
        department: student.department,
        amount: refund.amount,
        refundDate: refund.refundDate,
        reason: refund.reason,
        status: refund.status,
      }))
    );

    return res.status(200).json({
      message: "Fee reports fetched successfully",
      summary: summarizeStudents(students),
      reports: {
        dailyCollection,
        studentLedger: students.map((student) => ({
          registrationNo: student.registrationNo,
          studentName: student.studentName || student.fullName || "Student",
          course: student.course,
          department: student.department,
          debit: student.totalFee,
          credit: student.paidAmount,
          due: student.pendingAmount,
          refunds: (student.refunds || []).reduce((sum, item) => sum + item.amount, 0),
        })),
        dueReport,
        fineReport,
        refundReport,
        feeCollectionSummary: students.map((student) => ({
          registrationNo: student.registrationNo,
          studentName: student.studentName || student.fullName || "Student",
          department: student.department,
          course: student.course,
          totalFee: student.totalFee,
          paidAmount: student.paidAmount,
          pendingAmount: student.pendingAmount,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error fetching reports" });
  }
});

router.post("/", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const studentName = req.body.studentName?.trim();
    const registrationNo = req.body.registrationNo?.trim();
    const year = req.body.year?.trim();
    const course = normalizeCourseName(req.body.course?.trim());
    const department = req.body.department?.trim() || inferDepartmentFromCourse(course);
    const institution = req.body.institution?.trim() || inferInstitutionFromCourse(course);
    const admissionBatch = req.body.admissionBatch?.trim() || buildAdmissionBatch(year, course);
    const currentStudyYear = Math.max(Math.min(toNumber(req.body.currentStudyYear, 1), 4), 1);

    if (!studentName || !registrationNo || !year || !course) {
      return res.status(400).json({
        message: "Student Name, Registration No, Year and Course are required",
      });
    }

    const exists = await Student.findOne({ registrationNo });
    if (exists) {
      return res.status(409).json({ message: "Registration No already exists" });
    }

    const isOfficialBscNursing = isBscNursingCourse(course);
    const initialDiscounts = Array.isArray(req.body.discounts) ? req.body.discounts.map(normalizeDiscount) : [];
    const initialStructure = Array.isArray(req.body.feeStructure)
      ? req.body.feeStructure.map((item) => normalizeCharge(item, { scope: "Structure", category: "Tuition" }))
      : isOfficialBscNursing
        ? buildBscNursingFeeStructure(req.body.nextDueDate)
        : [];
    const structureTotal = initialStructure.reduce((sum, item) => sum + item.amount, 0);
    const baseFee = Math.max(
      toNumber(
        req.body.baseFee ?? req.body.totalFee,
        isOfficialBscNursing ? BSC_NURSING_YEARLY_TOTAL : structureTotal || BSC_NURSING_YEARLY_TOTAL
      ),
      0
    );
    const initialBaseFee = structureTotal || baseFee;

    const student = await Student.create({
      studentName,
      registrationNo,
      admissionNumber: registrationNo,
      year,
      course,
      institution,
      admissionBatch,
      currentStudyYear,
      department,
      email: req.body.email?.trim() || "",
      fullName: req.body.fullName?.trim() || studentName,
      phone: req.body.phone?.trim() || "",
      feePlan: req.body.feePlan?.trim() || "Yearly",
      baseFee: initialBaseFee,
      totalFee: initialBaseFee,
      nextDueDate: req.body.nextDueDate?.trim() || "",
      fineRules: Array.isArray(req.body.fineRules) ? req.body.fineRules.map(normalizeFineRule) : [],
      discounts: initialDiscounts,
      feeStructure: initialStructure,
      paidAmount: 0,
      pendingAmount: initialBaseFee,
      ledgerEntries: [],
    });

    await applyActiveFeeStructure(student);
    const snapshot = buildStudentSnapshot(student);
    await student.save();
    await persistStudentFees(student);
    return res.status(201).json({ message: "Student created successfully", student: snapshot });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Registration No already exists", error: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/fees/config", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    applyStoredFees(student, await loadStoredFees(student));

    const { feePlan, baseFee, nextDueDate, feeStructure, extraCharges, examFees, discounts, fineRules } = req.body;
    if (typeof feePlan === "string" && feePlan.trim()) student.feePlan = feePlan.trim();
    if (baseFee != null) student.baseFee = Math.max(toNumber(baseFee), 0);
    if (typeof nextDueDate === "string") student.nextDueDate = nextDueDate.trim();
    if (Array.isArray(feeStructure)) student.feeStructure = feeStructure.map((item) => normalizeCharge(item, { scope: "Structure", category: "Tuition" }));
    if (Array.isArray(extraCharges)) student.extraCharges = extraCharges.map((item) => normalizeCharge(item, { scope: "Additional", category: "Additional" }));
    if (Array.isArray(examFees)) student.examFees = examFees.map((item) => normalizeCharge(item, { scope: "Exam", category: "Exam Fee" }));
    if (Array.isArray(discounts)) student.discounts = discounts.map(normalizeDiscount);
    if (Array.isArray(fineRules)) student.fineRules = fineRules.map(normalizeFineRule);

    student.ledgerEntries = [];
    const snapshot = buildStudentSnapshot(student);
    await student.save();
    await persistStudentFees(student);
    return res.status(200).json({ message: "Fee configuration updated successfully", student: snapshot });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error updating fee configuration" });
  }
});

router.patch("/:id/fees/clear", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    student.baseFee = 0;
    student.totalFee = 0;
    student.paidAmount = 0;
    student.pendingAmount = 0;
    student.outstandingAmount = 0;
    student.outstandingStatus = "Cleared";
    student.feeStructure = [];
    student.extraCharges = [];
    student.examFees = [];
    student.discounts = [];
    student.fineRules = [];
    student.paymentHistory = [];
    student.refunds = [];
    student.ledgerEntries = [];
    await student.save();
    await persistStudentFees(student);

    return res.status(200).json({
      message: "Student fee data cleared successfully",
      student: buildStudentSnapshot(student),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error clearing student fee data" });
  }
});

router.post("/:id/promote", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    applyStoredFees(student, await loadStoredFees(student));

    const nextStudyYear = Math.max(
      Math.min(toNumber(req.body.currentStudyYear, toNumber(student.currentStudyYear, 1) + 1), 4),
      1
    );
    student.currentStudyYear = nextStudyYear;
    if (typeof req.body.year === "string" && req.body.year.trim()) {
      student.year = req.body.year.trim();
    }

    student.paymentHistory = [];
    student.refunds = [];
    student.ledgerEntries = [];
    await applyActiveFeeStructure(student);

    const snapshot = buildStudentSnapshot(student);
    await student.save();
    await persistStudentFees(student);
    return res.status(200).json({
      message: "Student promoted and next-year fee structure assigned successfully",
      student: snapshot,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error promoting student" });
  }
});

router.post("/:id/fees/razorpay-order", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN, ROLES.STUDENT), async (req, res) => {
  try {
    if (!ensureRazorpayConfigured()) return res.status(500).json({ message: "Razorpay is not configured on the server" });
    const amount = toNumber(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "A valid payment amount is required" });
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    applyStoredFees(student, await loadStoredFees(student));

    if (req.currentUser.role === ROLES.STUDENT) {
      const linkedStudent = await loadLinkedStudentForUser(req.currentUser);
      if (!linkedStudent || String(linkedStudent._id) !== String(student._id)) {
        return res.status(403).json({ message: "You can only pay fees for your own account" });
      }
    }

    buildStudentSnapshot(student);
    if (amount > student.pendingAmount) return res.status(400).json({ message: "Payment amount cannot be greater than the pending due" });

    const order = await razorpayClient.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `fee-${student.registrationNo}-${Date.now()}`.slice(0, 40),
      notes: {
        studentId: String(student._id),
        registrationNo: student.registrationNo,
        studentName: student.studentName || student.fullName || "",
        course: student.course || "",
      },
    });

    return res.status(200).json({ message: "Razorpay order created successfully", keyId: razorpayKeyId, order, student: buildStudentSnapshot(student) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error creating Razorpay order" });
  }
});

router.post("/:id/fees/pay", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const amount = toNumber(req.body.amount);
    const method = req.body.method?.trim() || "UPI";
    const provider = req.body.provider?.trim() || "Manual";
    const transactionId = req.body.transactionId?.trim() || uniqueId("TXN");
    const confirmedBy = req.body.confirmedBy?.trim() || "Admin";
    const note = req.body.note?.trim() || "";
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "A valid payment amount is required" });
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    applyStoredFees(student, await loadStoredFees(student));
    buildStudentSnapshot(student);
    if (amount > student.pendingAmount) return res.status(400).json({ message: "Payment amount cannot be greater than the pending due" });
    const paymentEntry = normalizePaymentEntry({ amount, method, provider, transactionId, confirmedBy, note });
    student.paymentHistory.unshift(paymentEntry);
    student.lastPaymentDate = paymentEntry.paymentDate;
    student.ledgerEntries = [];
    const snapshot = buildStudentSnapshot(student);
    await student.save();
    await persistStudentFees(student);
    return res.status(200).json({ message: "Payment confirmed and receipt generated successfully", student: snapshot, receipt: snapshot.paymentHistory[0] });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error confirming payment" });
  }
});

const updateFeeReceipt = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    applyStoredFees(student, await loadStoredFees(student));

    const receiptNumber = String(req.params.receiptNumber || "").trim();
    const paymentHistory = Array.isArray(student.paymentHistory)
      ? student.paymentHistory.map(normalizePaymentEntry)
      : [];
    const paymentIndex = paymentHistory.findIndex(
      (entry) => String(entry.receiptNumber || "").trim() === receiptNumber
    );
    if (paymentIndex < 0) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    const nextReceiptNumber = String(req.body.receiptNumber || receiptNumber).trim();
    const amount = toNumber(req.body.amount, paymentHistory[paymentIndex].amount);
    if (!nextReceiptNumber) return res.status(400).json({ message: "Receipt number is required" });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "A valid receipt amount is required" });

    const duplicateReceipt = paymentHistory.some(
      (entry, index) =>
        index !== paymentIndex &&
        String(entry.receiptNumber || "").trim().toLowerCase() === nextReceiptNumber.toLowerCase()
    );
    if (duplicateReceipt) {
      return res.status(409).json({ message: "Another receipt already uses this receipt number" });
    }

    const existingPayment = paymentHistory[paymentIndex] || {};
    paymentHistory[paymentIndex] = normalizePaymentEntry({
      ...existingPayment,
      receiptNumber: nextReceiptNumber,
      amount,
      method: req.body.method ?? existingPayment.method,
      provider: req.body.provider ?? existingPayment.provider,
      transactionId: req.body.transactionId ?? existingPayment.transactionId,
      gatewayOrderId: existingPayment.gatewayOrderId,
      gatewayPaymentId: existingPayment.gatewayPaymentId,
      gatewaySignature: existingPayment.gatewaySignature,
      paymentDate: req.body.paymentDate ?? existingPayment.paymentDate,
      status: existingPayment.status,
      confirmedBy: req.body.confirmedBy ?? existingPayment.confirmedBy,
      note: req.body.note ?? existingPayment.note,
    });
    student.paymentHistory = paymentHistory;
    student.ledgerEntries = [];
    const snapshot = buildStudentSnapshot(student);
    student.markModified("paymentHistory");
    student.markModified("ledgerEntries");
    await student.save();
    await persistStudentFees(student);
    const receipt = snapshot.paymentHistory.find(
      (entry) => entry.receiptNumber === nextReceiptNumber
    ) || snapshot.paymentHistory[0];
    return res.status(200).json({ message: "Receipt updated successfully", student: snapshot, receipt });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error updating receipt" });
  }
};

router.patch("/:id/fees/receipts/:receiptNumber", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, updateFeeReceipt);
router.post("/:id/fees/receipts/:receiptNumber", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, updateFeeReceipt);

router.post("/:id/fees/refund", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const amount = toNumber(req.body.amount);
    const reason = req.body.reason?.trim() || "Fee refund";
    const reference = req.body.reference?.trim() || uniqueId("RFREF");
    const processedBy = req.body.processedBy?.trim() || "Admin";
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "A valid refund amount is required" });
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    applyStoredFees(student, await loadStoredFees(student));
    buildStudentSnapshot(student);
    if (amount > student.paidAmount) return res.status(400).json({ message: "Refund amount cannot be greater than the collected amount" });
    student.refunds.unshift(normalizeRefund({ amount, reason, reference, processedBy }));
    student.ledgerEntries = [];
    const snapshot = buildStudentSnapshot(student);
    await student.save();
    await persistStudentFees(student);
    return res.status(200).json({ message: "Refund processed successfully", student: snapshot, refund: snapshot.refunds[0] });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error processing refund" });
  }
});

router.post("/:id/fees/verify-razorpay", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN, ROLES.STUDENT), async (req, res) => {
  try {
    if (!ensureRazorpayConfigured()) return res.status(500).json({ message: "Razorpay is not configured on the server" });
    const amount = toNumber(req.body.amount);
    const note = req.body.note?.trim() || "";
    const { razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, razorpay_signature: razorpaySignature } = req.body;
    if (!Number.isFinite(amount) || amount <= 0 || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: "Payment amount and Razorpay verification details are required" });
    }
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    applyStoredFees(student, await loadStoredFees(student));

    if (req.currentUser.role === ROLES.STUDENT) {
      const linkedStudent = await loadLinkedStudentForUser(req.currentUser);
      if (!linkedStudent || String(linkedStudent._id) !== String(student._id)) {
        return res.status(403).json({ message: "You can only verify payments for your own account" });
      }
    }

    buildStudentSnapshot(student);
    if (amount > student.pendingAmount) return res.status(400).json({ message: "Payment amount cannot be greater than the pending due" });
    const expectedSignature = crypto.createHmac("sha256", razorpayKeySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
    if (expectedSignature !== razorpaySignature) return res.status(400).json({ message: "Razorpay signature verification failed" });
    const payment = await razorpayClient.payments.fetch(razorpayPaymentId);
    if (!payment || !["authorized", "captured"].includes(payment.status)) return res.status(400).json({ message: "Razorpay payment is not authorized or captured" });
    const alreadyRecorded = (student.paymentHistory || []).some((entry) => entry.gatewayPaymentId === razorpayPaymentId);
    if (alreadyRecorded) return res.status(409).json({ message: "This Razorpay payment has already been recorded" });

    student.paymentHistory.unshift(normalizePaymentEntry({
      amount,
      method: "Razorpay Checkout",
      provider: "Razorpay",
      transactionId: razorpayPaymentId,
      gatewayOrderId: razorpayOrderId,
      gatewayPaymentId: razorpayPaymentId,
      gatewaySignature: razorpaySignature,
      confirmedBy: "Razorpay Verification",
      note: note || "Payment verified via Razorpay callback",
    }));
    student.ledgerEntries = [];
    const snapshot = buildStudentSnapshot(student);
    await student.save();
    await persistStudentFees(student);
    return res.status(200).json({ message: "Razorpay payment verified and receipt generated successfully", student: snapshot, receipt: snapshot.paymentHistory[0] });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error verifying Razorpay payment" });
  }
});

router.delete("/:id", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await Fee.deleteOne({ studentRef: student._id });
    return res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting student", error: error.message });
  }
});

export default router;
