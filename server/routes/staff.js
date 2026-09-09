import express from "express";
import Staff from "../models/Staff.js";
import StaffDataMigration from "../models/StaffDataMigration.js";
import Teacher from "../models/teacher.js";
import TeacherAttendance from "../models/teacherAttendance.js";
import {
  attachCurrentUser,
  requireAdminOrSuperAdmin,
  requireRole,
  verifyToken,
} from "../middleware/AuthMiddleware.js";
import { ROLES } from "../constants/roles.js";

const router = express.Router();

const fallbackStaffRecords = [
  {
    staffType: "College Staff",
    staffId: "STF-1001",
    employeeId: "STF-1001",
    name: "Asha Menon",
    designation: "Senior Accountant",
    department: "Finance",
    paymentMode: "Bank Transfer",
    status: "Processed",
    grossSalary: 68000,
    allowances: 12000,
    overtime: 3500,
    deductions: 6400,
    advance: 0,
    pf: 4200,
    esi: 850,
    tax: 2400,
    bonus: 5000,
    netSalary: 82100,
    salaryMonth: "May 2026",
    paidDate: "2026-05-05",
    bank: "HDFC Bank",
    accountNo: "XXXX5421",
  },
  {
    staffType: "College Staff",
    staffId: "STF-1002",
    employeeId: "STF-1002",
    name: "Rahul Sinha",
    designation: "Lab Technician",
    department: "Allied Health",
    paymentMode: "UPI",
    status: "Pending",
    grossSalary: 42000,
    allowances: 6000,
    overtime: 2400,
    deductions: 3200,
    advance: 2000,
    pf: 2600,
    esi: 700,
    tax: 900,
    bonus: 0,
    netSalary: 45200,
    salaryMonth: "May 2026",
    paidDate: "",
    bank: "SBI",
    accountNo: "XXXX2284",
  },
  {
    staffType: "School Staff",
    staffId: "STF-1003",
    employeeId: "STF-1003",
    name: "Priyanka Reddy",
    designation: "HR Executive",
    department: "Administration",
    paymentMode: "Bank Transfer",
    status: "Processed",
    grossSalary: 52000,
    allowances: 8500,
    overtime: 1200,
    deductions: 4100,
    advance: 0,
    pf: 3100,
    esi: 780,
    tax: 1500,
    bonus: 2500,
    netSalary: 60100,
    salaryMonth: "May 2026",
    paidDate: "2026-05-04",
    bank: "ICICI Bank",
    accountNo: "XXXX8142",
  },
  {
    staffType: "College Staff",
    staffId: "STF-1004",
    employeeId: "STF-1004",
    name: "Mohammed Irfan",
    designation: "Professor",
    department: "Science",
    paymentMode: "Bank Transfer",
    status: "On Hold",
    grossSalary: 93000,
    allowances: 18000,
    overtime: 0,
    deductions: 9800,
    advance: 5000,
    pf: 6200,
    esi: 0,
    tax: 5200,
    bonus: 7000,
    netSalary: 103200,
    salaryMonth: "May 2026",
    paidDate: "",
    bank: "Axis Bank",
    accountNo: "XXXX3190",
  },
  {
    staffType: "School Staff",
    staffId: "STF-1005",
    employeeId: "STF-1005",
    name: "Nandhini Kumar",
    designation: "Staff Nurse",
    department: "Nursing",
    paymentMode: "Cash",
    status: "Processed",
    grossSalary: 38000,
    allowances: 7000,
    overtime: 4200,
    deductions: 2800,
    advance: 1500,
    pf: 2200,
    esi: 650,
    tax: 600,
    bonus: 3000,
    netSalary: 47900,
    salaryMonth: "May 2026",
    paidDate: "2026-05-06",
    bank: "Canara Bank",
    accountNo: "XXXX6108",
  },
  {
    staffType: "College Staff",
    staffId: "STF-1006",
    employeeId: "STF-1006",
    name: "Vikram Das",
    designation: "Systems Administrator",
    department: "IT & Systems",
    paymentMode: "Bank Transfer",
    status: "Processed",
    grossSalary: 76000,
    allowances: 10000,
    overtime: 1500,
    deductions: 7200,
    advance: 0,
    pf: 4600,
    esi: 0,
    tax: 2800,
    bonus: 4500,
    netSalary: 84800,
    salaryMonth: "May 2026",
    paidDate: "2026-05-05",
    bank: "Kotak Bank",
    accountNo: "XXXX9914",
  },
];

const demoStaffIds = fallbackStaffRecords.map((record) => record.staffId);
const demoStaffNames = fallbackStaffRecords.map((record) => record.name);
const INITIAL_STAFF_CLEANUP_KEY = "initial-demo-staff-cleanup-v1";

function demoStaffFilter() {
  return {
    $or: [
      { staffId: { $in: demoStaffIds } },
      { employeeId: { $in: demoStaffIds } },
      { name: { $in: demoStaffNames } },
    ],
  };
}

async function existingDemoStaffFilter() {
  const teachers = await Teacher.find({}, { employeeId: 1, staffId: 1 }).lean();
  const teacherKeys = teachers
    .flatMap((teacher) => [teacher.employeeId, teacher.staffId])
    .filter(Boolean);

  return {
    $or: [
      ...demoStaffFilter().$or,
      ...(teacherKeys.length
        ? [{ staffId: { $in: teacherKeys } }, { employeeId: { $in: teacherKeys } }]
        : []),
    ],
  };
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculateNetSalary(record) {
  const grossSalary = toNumber(record.grossSalary);
  const allowances = toNumber(record.allowances);
  const overtime = toNumber(record.overtime);
  const bonus = toNumber(record.bonus);
  const deductions = toNumber(record.deductions);
  const advance = toNumber(record.advance);

  return Math.max(grossSalary + allowances + overtime + bonus - deductions - advance, 0);
}

function normalizeStaffRecord(record = {}) {
  const normalized = {
    _id: record._id,
    id: record.staffId || record.employeeId,
    staffType: ["College Staff", "School Staff"].includes(String(record.staffType || "").trim())
      ? String(record.staffType).trim()
      : "College Staff",
    qualification: String(record.qualification || "").trim(),
    experience: String(record.experience || "").trim(),
    phone: String(record.phone || "").trim(),
    email: String(record.email || "").trim(),
    address: String(record.address || "").trim(),
    joiningDate: String(record.joiningDate || "").trim(),
    staffStatus: String(record.staffStatus || "").trim(),
    photoName: String(record.photoName || "").trim(),
    photoDataUrl: String(record.photoDataUrl || "").trim(),
    documents: Array.isArray(record.documents)
      ? record.documents.map((document) => ({
          name: String(document?.name || "").trim(),
          type: String(document?.type || "").trim(),
          sizeLabel: String(document?.sizeLabel || "").trim(),
        }))
      : [],
    staffId: String(record.staffId || record.employeeId || "").trim(),
    employeeId: String(record.employeeId || record.staffId || "").trim(),
    name: String(record.name || record.fullName || record.teacherName || "").trim(),
    designation: String(record.designation || "Staff Member").trim(),
    department: String(record.department || "General").trim(),
    paymentMode: String(record.paymentMode || "Bank Transfer").trim(),
    status: String(record.status || "Pending").trim(),
    approvedBy: String(record.approvedBy || "").trim(),
    approvalDate: String(record.approvalDate || "").trim(),
    approvalNote: String(record.approvalNote || "").trim(),
    grossSalary: Math.max(toNumber(record.grossSalary), 0),
    allowances: Math.max(toNumber(record.allowances), 0),
    overtime: Math.max(toNumber(record.overtime), 0),
    deductions: Math.max(toNumber(record.deductions), 0),
    advance: Math.max(toNumber(record.advance), 0),
    pf: Math.max(toNumber(record.pf), 0),
    esi: Math.max(toNumber(record.esi), 0),
    tax: Math.max(toNumber(record.tax), 0),
    bonus: Math.max(toNumber(record.bonus), 0),
    salaryMonth: String(record.salaryMonth || "May 2026").trim(),
    paidDate: String(record.paidDate || "").trim(),
    bank: String(record.bank || "").trim(),
    accountNo: String(record.accountNo || "").trim(),
  };

  normalized.netSalary =
    record.netSalary != null
      ? Math.max(toNumber(record.netSalary), 0)
      : calculateNetSalary(normalized);

  return normalized;
}

function buildComplianceSettings() {
  return {
    pfEmployeePercent: 12,
    pfEmployerPercent: 12,
    esiEmployeePercent: 0.75,
    esiEmployerPercent: 3.25,
    tdsRule: "Applied by salary band and annualized taxable income",
  };
}

function buildOverview(staff) {
  return {
    totalPayroll: staff.reduce((sum, item) => sum + item.netSalary, 0),
    totalGross: staff.reduce((sum, item) => sum + item.grossSalary, 0),
    totalDeductions: staff.reduce((sum, item) => sum + item.deductions, 0),
    totalBonus: staff.reduce((sum, item) => sum + item.bonus, 0),
    processed: staff.filter((item) => item.status === "Processed").length,
    pending: staff.filter((item) => item.status === "Pending").length,
    onHold: staff.filter((item) => item.status === "On Hold").length,
  };
}

function buildDepartmentAnalytics(staff) {
  const grouped = new Map();

  staff.forEach((item) => {
    const current = grouped.get(item.department) || {
      department: item.department,
      employees: 0,
      payout: 0,
    };

    current.employees += 1;
    current.payout += item.netSalary;
    grouped.set(item.department, current);
  });

  return [...grouped.values()].sort((a, b) => b.payout - a.payout);
}

function buildAttendanceRows(staff, attendanceRecords) {
  const groupedRecords = attendanceRecords.reduce((map, record) => {
    const teacherId = String(record.teacherId || "").trim();
    if (!teacherId) {
      return map;
    }

    const current = map.get(teacherId) || {
      presentDays: 0,
      leaveDays: 0,
      absentDays: 0,
    };

    if (record.status === "Present") {
      current.presentDays += 1;
    } else if (record.status === "Half-day") {
      current.presentDays += 0.5;
      current.leaveDays += 0.5;
    } else {
      current.absentDays += 1;
    }

    map.set(teacherId, current);
    return map;
  }, new Map());

  return staff.map((employee) => {
    const stats = groupedRecords.get(employee.employeeId || employee.staffId) || {
      presentDays: 22,
      leaveDays: 2,
      absentDays: 2,
    };
    const workingDays = Math.max(
      Math.round(stats.presentDays + stats.leaveDays + stats.absentDays),
      26
    );
    const attendancePct = workingDays > 0 ? (stats.presentDays / workingDays) * 100 : 0;
    const attendanceAdjustedNet = Math.round(employee.netSalary * (attendancePct / 100));

    return {
      ...employee,
      workingDays,
      presentDays: Number(stats.presentDays.toFixed(1)),
      leaveDays: Number(stats.leaveDays.toFixed(1)),
      absentDays: Number(stats.absentDays.toFixed(1)),
      attendancePct: Number(attendancePct.toFixed(1)),
      attendanceAdjustedNet,
    };
  });
}

function buildAttendanceSummary(attendanceRows) {
  if (!attendanceRows.length) {
    return {
      averageAttendance: 0,
      totalPresentDays: 0,
      totalAbsentDays: 0,
      totalLeaveDays: 0,
    };
  }

  return {
    averageAttendance: Number(
      (
        attendanceRows.reduce((sum, employee) => sum + employee.attendancePct, 0) /
        attendanceRows.length
      ).toFixed(1)
    ),
    totalPresentDays: attendanceRows.reduce((sum, employee) => sum + employee.presentDays, 0),
    totalAbsentDays: attendanceRows.reduce((sum, employee) => sum + employee.absentDays, 0),
    totalLeaveDays: attendanceRows.reduce((sum, employee) => sum + employee.leaveDays, 0),
  };
}

function buildStaffRecordFromTeacher(teacher, index = 0) {
  const base = fallbackStaffRecords[index % fallbackStaffRecords.length];

  return {
    ...base,
    staffType: teacher.staffType || "College Staff",
    staffId: teacher.staffId || teacher.employeeId,
    employeeId: teacher.employeeId || teacher.staffId,
    name: teacher.teacherName || teacher.fullName || teacher.name || base.name,
    designation: teacher.subject ? `${teacher.subject} Faculty` : "Faculty",
    department: teacher.department || base.department,
    qualification: teacher.qualification || "",
    experience: teacher.experience || "",
    phone: teacher.phone || "",
    email: teacher.email || "",
    address: teacher.address || "",
    joiningDate: teacher.joiningDate || "",
  };
}

async function ensureSeededStaff() {
  const existingCount = await Staff.countDocuments();
  if (existingCount > 0) {
    return;
  }

  const teachers = await Teacher.find().sort({ createdAt: -1 }).limit(6);
  if (teachers.length > 0) {
    await Staff.insertMany(
      teachers.map((teacher, index) => buildStaffRecordFromTeacher(teacher, index)),
      { ordered: false }
    );
  }
}

async function removeDemoStaffRecords() {
  await Staff.deleteMany(demoStaffFilter()).exec();
}

async function clearInitialStaffDataOnce() {
  const migration = await StaffDataMigration.findOne({ key: INITIAL_STAFF_CLEANUP_KEY }).lean();
  if (migration) {
    return;
  }

  await Staff.deleteMany({}).exec();
  await TeacherAttendance.deleteMany({}).exec();

  try {
    await StaffDataMigration.create({ key: INITIAL_STAFF_CLEANUP_KEY });
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }
  }
}

async function syncTeachersIntoStaff() {
  const teachers = await Teacher.find().sort({ createdAt: -1 });
  if (!teachers.length) {
    return;
  }

  const existingStaff = await Staff.find({}, { staffId: 1, employeeId: 1 }).lean();
  const existingKeys = new Set();

  existingStaff.forEach((item) => {
    if (item.staffId) {
      existingKeys.add(String(item.staffId).trim());
    }
    if (item.employeeId) {
      existingKeys.add(String(item.employeeId).trim());
    }
  });

  const missingTeachers = teachers
    .filter((teacher) => {
      const staffId = String(teacher.staffId || "").trim();
      const employeeId = String(teacher.employeeId || "").trim();
      return !existingKeys.has(staffId) && !existingKeys.has(employeeId);
    })
    .map((teacher, index) => buildStaffRecordFromTeacher(teacher, index));

  if (!missingTeachers.length) {
    return;
  }

  await Staff.insertMany(missingTeachers, { ordered: false });
}

async function loadStaff() {
  await clearInitialStaffDataOnce();
  await removeDemoStaffRecords();
  const staff = await Staff.find().sort({ createdAt: -1 });
  return staff.map((item) => normalizeStaffRecord(item.toObject()));
}

router.get("/", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const staff = await loadStaff();
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message || "Error fetching staff payroll data" });
  }
});

router.get("/payroll-dashboard", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const staff = await loadStaff();
    const attendanceRecords = await TeacherAttendance.find().sort({ createdAt: -1 });
    const attendanceRows = buildAttendanceRows(staff, attendanceRecords);
    const availableMonths = [...new Set(staff.map((item) => item.salaryMonth))];

    res.status(200).json({
      message: "Staff payroll dashboard fetched successfully",
      overview: buildOverview(staff),
      staff,
      departmentAnalytics: buildDepartmentAnalytics(staff),
      attendanceRows,
      attendanceSummary: buildAttendanceSummary(attendanceRows),
      complianceSettings: buildComplianceSettings(),
      availableMonths,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error fetching payroll dashboard" });
  }
});

router.post("/", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const staffId = req.body.staffId?.trim() || req.body.employeeId?.trim();
    const name = req.body.name?.trim();
    const designation = req.body.designation?.trim();
    const department = req.body.department?.trim();

    if (!staffId || !name || !designation || !department) {
      return res.status(400).json({
        message: "Staff ID, name, designation, and department are required",
      });
    }

    const exists = await Staff.findOne({ staffId });
    if (exists) {
      return res.status(409).json({ message: "Staff ID already exists" });
    }

    const staff = await Staff.create({
      staffType: ["College Staff", "School Staff"].includes(req.body.staffType?.trim())
        ? req.body.staffType.trim()
        : "College Staff",
      qualification: req.body.qualification?.trim() || "",
      experience: req.body.experience?.trim() || "",
      phone: req.body.phone?.trim() || "",
      email: req.body.email?.trim() || "",
      address: req.body.address?.trim() || "",
      joiningDate: req.body.joiningDate?.trim() || "",
      staffStatus: req.body.staffStatus?.trim() || "",
      photoName: req.body.photoName?.trim() || "",
      photoDataUrl: req.body.photoDataUrl?.trim() || "",
      documents: Array.isArray(req.body.documents)
        ? req.body.documents.map((document) => ({
            name: document?.name?.trim() || "",
            type: document?.type?.trim() || "",
            sizeLabel: document?.sizeLabel?.trim() || "",
          }))
        : [],
      staffId,
      employeeId: req.body.employeeId?.trim() || staffId,
      name,
      designation,
      department,
      paymentMode: req.body.paymentMode?.trim() || "Bank Transfer",
      status: req.body.status?.trim() || "Pending",
      grossSalary: Math.max(toNumber(req.body.grossSalary), 0),
      allowances: Math.max(toNumber(req.body.allowances), 0),
      overtime: Math.max(toNumber(req.body.overtime), 0),
      deductions: Math.max(toNumber(req.body.deductions), 0),
      advance: Math.max(toNumber(req.body.advance), 0),
      pf: Math.max(toNumber(req.body.pf), 0),
      esi: Math.max(toNumber(req.body.esi), 0),
      tax: Math.max(toNumber(req.body.tax), 0),
      bonus: Math.max(toNumber(req.body.bonus), 0),
      netSalary: Math.max(toNumber(req.body.netSalary), 0),
      salaryMonth: req.body.salaryMonth?.trim() || "May 2026",
      paidDate: req.body.paidDate?.trim() || "",
      bank: req.body.bank?.trim() || "",
      accountNo: req.body.accountNo?.trim() || "",
    });

    const normalized = normalizeStaffRecord(staff.toObject());
    if (!staff.netSalary) {
      staff.netSalary = normalized.netSalary;
      await staff.save();
    }

    res.status(201).json({
      message: "Staff payroll record created successfully",
      staff: normalizeStaffRecord(staff.toObject()),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Staff ID already exists" });
    }

    res.status(500).json({ message: error.message || "Error creating staff payroll record" });
  }
});

router.delete("/demo-data", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (_req, res) => {
  try {
    const result = await Staff.deleteMany({});
    await TeacherAttendance.deleteMany({});
    res.status(200).json({
      message: "Demo staff data cleared successfully",
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error clearing demo staff data" });
  }
});

router.delete("/:id", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const staff = await Staff.findOneAndDelete({
      $or: [{ staffId: req.params.id }, { employeeId: req.params.id }],
    });

    if (!staff) {
      return res.status(404).json({ message: "Staff record not found" });
    }

    await TeacherAttendance.deleteMany({
      teacherId: staff.employeeId || staff.staffId,
    });

    res.status(200).json({
      message: "Staff record deleted successfully",
      staffId: staff.staffId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error deleting staff record" });
  }
});

router.patch("/:id/status", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const status = req.body.status?.trim();
    const approvedBy = req.body.approvedBy?.trim() || "Payroll Admin";
    const approvalNote = req.body.approvalNote?.trim() || "";

    if (!["Pending", "Processed", "On Hold"].includes(status)) {
      return res.status(400).json({
        message: "Status must be Pending, Processed, or On Hold",
      });
    }

    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: "Staff payroll record not found" });
    }

    staff.status = status;
    staff.approvedBy = status === "Processed" ? approvedBy : "";
    staff.approvalDate = status === "Processed" ? new Date().toISOString() : "";
    staff.approvalNote = approvalNote;
    await staff.save();

    res.status(200).json({
      message: `Payroll status updated to ${status}`,
      staff: normalizeStaffRecord(staff.toObject()),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error updating payroll status" });
  }
});

export default router;
