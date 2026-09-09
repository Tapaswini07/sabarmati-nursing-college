import express from "express";
import DepartmentFinance from "../models/DepartmentFinance.js";
import FinanceDataMigration from "../models/FinanceDataMigration.js";
import {
  attachCurrentUser,
  requireAdminOrSuperAdmin,
  requireRole,
  verifyToken,
} from "../middleware/AuthMiddleware.js";
import { ROLES } from "../constants/roles.js";

const router = express.Router();

const institutionUnits = [
  {
    title: "Sabarmati College of Nursing",
    items: ["B.Sc Nursing", "M.Sc Nursing", "P.B.BSc Nursing"],
  },
  {
    title: "Sabarmati School of Nursing",
    items: ["ANM", "GNM"],
  },
  {
    title: "Common Departments",
    items: ["Library", "Hostel", "Accounts", "Administration"],
  },
];

const roleCards = [
  { role: "Admin Dashboard", note: "Institution-wide budget governance" },
  { role: "Accounts Dashboard", note: "Expense control and compliance posting" },
  { role: "HOD Dashboard", note: "Department submission and semester usage" },
  { role: "Hostel Dashboard", note: "Fees, dues, room ledger, canteen recovery" },
];

const reportCards = [
  "Department Budget Report",
  "Semester-wise Expense Report",
  "Budget Utilization Report",
  "Expense Approval Report",
  "Monthly Financial Summary",
  "Yearly Financial Summary",
  "Hostel Fee Collection Report",
  "Hostel Outstanding Report",
  "Student Hostel Ledger",
];

const rolePermissions = {
  "super-admin": [
    "Full system access",
    "Manage all departments",
    "User management",
    "Financial management",
    "Reports and analytics",
    "Approve all modules",
    "Multi-department control",
  ],
  principal: [
    "Institution overview dashboard",
    "Department analytics",
    "Financial summary",
    "Staff and student reports",
    "Approval authority",
    "Academic reports",
  ],
  hod: [
    "Student management",
    "Attendance management",
    "Department reports",
    "Budget requests",
    "Staff management",
    "Semester analytics",
  ],
  accounts: [
    "Fee collection",
    "Student dues",
    "Accounting entries",
    "Payroll management",
    "Financial reports",
    "Budget approval",
    "Receipt generation",
    "Hostel fee management",
  ],
  staff: [
    "Student attendance",
    "Marks entry",
    "Leave requests",
    "Timetable access",
    "Student progress reports",
    "Subject management",
  ],
  hostel: [
    "Hostel admissions",
    "Hostel fee collection",
    "Hostel due tracking",
    "Room allocation",
    "Meal management",
    "Hostel reports",
  ],
  library: [
    "Book management",
    "Issue/return books",
    "Fine collection",
    "Student library records",
    "Library reports",
  ],
  student: [
    "View attendance",
    "View results",
    "Fee payment",
    "Download receipts",
    "Bonafide certificate",
    "Hostel details",
    "Timetable access",
  ],
};

const departmentSeeds = [
  ["B.Sc Nursing", "Sabarmati College of Nursing", "Sem 4", 3200000, 2185000, 180000],
  ["M.Sc Nursing", "Sabarmati College of Nursing", "Sem 2", 1950000, 1220000, 90000],
  ["P.B.BSc Nursing", "Sabarmati College of Nursing", "Sem 3", 1420000, 964000, 60000],
  ["ANM", "Sabarmati School of Nursing", "Sem 1", 1180000, 742000, 45000],
  ["GNM", "Sabarmati School of Nursing", "Sem 5", 1560000, 1185000, 52000],
  ["Library", "Common Departments", "Annual", 920000, 618000, 24000],
  ["Hostel", "Common Departments", "Annual", 2840000, 2280000, 110000],
  ["Administration", "Common Departments", "Annual", 1960000, 1216000, 68000],
];

const expenseSeeds = [
  {
    department: "Hostel",
    category: "Hostel Expenses",
    tag: "Mess Supply",
    semester: "Annual",
    amount: 148000,
    requestedBy: "Hostel Warden",
    status: "Approved",
    currentStage: "Completed",
    remarks: "Monthly ration and kitchen supply cycle",
  },
  {
    department: "Library",
    category: "Software & Licensing",
    tag: "e-Journal Renewal",
    semester: "Annual",
    amount: 96000,
    requestedBy: "Librarian",
    status: "Pending",
    currentStage: "Accounts Review",
    remarks: "Vendor quotation attached",
  },
  {
    department: "B.Sc Nursing",
    category: "Lab Equipment",
    tag: "Simulation Kit",
    semester: "Semester 4",
    amount: 224000,
    requestedBy: "B.Sc Nursing HOD",
    status: "Approved",
    currentStage: "Completed",
    remarks: "Practical lab upgrade",
  },
  {
    department: "Administration",
    category: "Electricity",
    tag: "Utility Cycle",
    semester: "Annual",
    amount: 132000,
    requestedBy: "Admin Office",
    status: "Auto Alert",
    currentStage: "Admin Approval",
    remarks: "Budget threshold warning",
  },
];

const hostelLedgerSeeds = [
  {
    studentName: "Ananya Kumari",
    registrationNo: "HOST-2401",
    roomNo: "A-101",
    amount: 28500,
    paymentDate: "2026-05-04T10:00:00.000Z",
    paymentMode: "UPI",
    receiptNumber: "HST-RCT-2401",
    status: "Collected",
  },
  {
    studentName: "Ritika Das",
    registrationNo: "HOST-2402",
    roomNo: "B-203",
    amount: 18500,
    paymentDate: "2026-05-07T12:30:00.000Z",
    paymentMode: "Bank",
    receiptNumber: "HST-RCT-2402",
    status: "Outstanding",
  },
  {
    studentName: "Sneha Paul",
    registrationNo: "HOST-2403",
    roomNo: "C-112",
    amount: 29200,
    paymentDate: "2026-05-11T09:15:00.000Z",
    paymentMode: "Cash",
    receiptNumber: "HST-RCT-2403",
    status: "Collected",
  },
];

function uniqueId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIsoDate(value = new Date()) {
  return new Date(value).toISOString();
}

function normalizeBudget(item = {}) {
  const yearlyBudget = Math.max(toNumber(item.yearlyBudget), 0);
  const approvedBudget = Math.max(
    toNumber(item.approvedBudget, yearlyBudget + toNumber(item.carryForwardAmount)),
    0
  );
  const utilizedBudget = Math.max(toNumber(item.utilizedBudget), 0);
  const pendingBudget = Math.max(toNumber(item.pendingBudget), 0);
  const carryForwardAmount = Math.max(toNumber(item.carryForwardAmount), 0);
  const remainingBudget = Math.max(approvedBudget - utilizedBudget - pendingBudget, 0);
  const baseForUtilization = approvedBudget || yearlyBudget || 1;

  return {
    budgetId: String(item.budgetId || uniqueId("BGT")).trim(),
    department: String(item.department || "General").trim(),
    institutionGroup: String(item.institutionGroup || "Common Departments").trim(),
    semester: String(item.semester || "Annual").trim(),
    financialYear: String(item.financialYear || "FY 2026-27").trim(),
    academicYear: String(item.academicYear || "2026-27").trim(),
    yearlyBudget,
    semesterBudget: Math.max(toNumber(item.semesterBudget, yearlyBudget), 0),
    approvedBudget,
    utilizedBudget,
    pendingBudget,
    carryForwardAmount,
    remainingBudget,
    utilizationPercentage: Math.min(
      100,
      Math.round(((utilizedBudget + pendingBudget) / baseForUtilization) * 100)
    ),
    status: String(item.status || "Approved").trim(),
    approvedBy: String(item.approvedBy || "Finance Controller").trim(),
    remarks: String(item.remarks || "").trim(),
  };
}

function normalizeExpense(item = {}) {
  return {
    expenseId: String(item.expenseId || uniqueId("EXP")).trim(),
    department: String(item.department || "General").trim(),
    category: String(item.category || "Miscellaneous").trim(),
    tag: String(item.tag || "Expense").trim(),
    semester: String(item.semester || "Annual").trim(),
    amount: Math.max(toNumber(item.amount), 0),
    requestedBy: String(item.requestedBy || "Department User").trim(),
    requestedAt: String(item.requestedAt || toIsoDate()).trim(),
    status: String(item.status || "Pending").trim(),
    currentStage: String(item.currentStage || "Pending HOD").trim(),
    balanceNote: String(item.balanceNote || "").trim(),
    remarks: String(item.remarks || "").trim(),
    auditTrail: Array.isArray(item.auditTrail)
      ? item.auditTrail.map((entry) => ({
          action: String(entry?.action || "").trim(),
          actor: String(entry?.actor || "").trim(),
          note: String(entry?.note || "").trim(),
          timestamp: String(entry?.timestamp || toIsoDate()).trim(),
        }))
      : [],
  };
}

function normalizeHostelLedger(item = {}) {
  return {
    ledgerId: String(item.ledgerId || uniqueId("HST")).trim(),
    studentName: String(item.studentName || "Hostel Student").trim(),
    registrationNo: String(item.registrationNo || uniqueId("REG")).trim(),
    roomNo: String(item.roomNo || "").trim(),
    amount: Math.max(toNumber(item.amount), 0),
    paymentDate: String(item.paymentDate || toIsoDate()).trim(),
    paymentMode: String(item.paymentMode || "UPI").trim(),
    receiptNumber: String(item.receiptNumber || uniqueId("HST-RCT")).trim(),
    status: String(item.status || "Collected").trim(),
  };
}

function normalizeAlert(item = {}) {
  return {
    title: String(item.title || "Alert").trim(),
    note: String(item.note || "").trim(),
    level: String(item.level || "info").trim(),
    createdAtLabel: String(item.createdAtLabel || new Date().toLocaleString("en-IN")).trim(),
  };
}

async function ensureFinanceSeeded() {
  let doc = await DepartmentFinance.findOne({ moduleKey: "department-finance" });

  if (doc) {
    const cleanupKey = "initial-demo-finance-cleanup-v1";
    const cleanup = await FinanceDataMigration.findOne({ key: cleanupKey }).lean();
    if (!cleanup) {
      doc.departmentBudgets = doc.departmentBudgets.map((budget) => ({
        ...budget.toObject(),
        yearlyBudget: 0,
        semesterBudget: 0,
        approvedBudget: 0,
        utilizedBudget: 0,
        pendingBudget: 0,
        carryForwardAmount: 0,
        remainingBudget: 0,
        utilizationPercentage: 0,
      }));
      doc.expenses = [];
      doc.hostelLedgers = [];
      doc.alerts = [];
      await doc.save();
      try {
        await FinanceDataMigration.create({ key: cleanupKey });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }
    return doc;
  }

  const departmentBudgets = departmentSeeds.map(
    ([department, institutionGroup, semester, yearlyBudget, utilizedBudget, pendingBudget]) =>
      normalizeBudget({
        department,
        institutionGroup,
        semester,
        yearlyBudget,
        semesterBudget: semester === "Annual" ? yearlyBudget : Math.round(yearlyBudget / 2),
        approvedBudget: yearlyBudget,
        utilizedBudget,
        pendingBudget,
        carryForwardAmount: Math.round(yearlyBudget * 0.04),
        financialYear: "FY 2026-27",
        academicYear: "2026-27",
      })
  );

  const expenses = expenseSeeds.map((item) =>
    normalizeExpense({
      ...item,
      balanceNote: "",
      auditTrail: [
        {
          action: "Submitted",
          actor: item.requestedBy,
          note: item.remarks,
          timestamp: toIsoDate("2026-05-12T08:00:00.000Z"),
        },
      ],
    })
  );

  doc = await DepartmentFinance.create({
    moduleKey: "department-finance",
    institutionUnits,
    departmentBudgets,
    expenses,
    hostelLedgers: hostelLedgerSeeds.map(normalizeHostelLedger),
    alerts: [
      normalizeAlert({
        title: "Low balance alert",
        note: "Administration electricity budget crossed 80% utilization.",
        level: "danger",
      }),
      normalizeAlert({
        title: "Approval reminder",
        note: "Hostel kitchen maintenance request pending admin sign-off.",
        level: "warning",
      }),
      normalizeAlert({
        title: "Audit verified",
        note: "Semester 2 expense closure locked by Accounts for Apr 2026.",
        level: "success",
      }),
    ],
  });

  doc.departmentBudgets = doc.departmentBudgets.map((budget) => ({
    ...budget.toObject(),
    yearlyBudget: 0,
    semesterBudget: 0,
    approvedBudget: 0,
    utilizedBudget: 0,
    pendingBudget: 0,
    carryForwardAmount: 0,
    remainingBudget: 0,
    utilizationPercentage: 0,
  }));
  doc.expenses = [];
  doc.hostelLedgers = [];
  doc.alerts = [];
  await doc.save();
  await FinanceDataMigration.create({ key: "initial-demo-finance-cleanup-v1" });

  return doc;
}

function getBudgetForDepartment(doc, department) {
  return doc.departmentBudgets.find((item) => item.department === department);
}

function recomputeBudget(budget) {
  const normalized = normalizeBudget(budget);
  Object.assign(budget, normalized);
}

function buildOverview(doc) {
  const totalBudget = doc.departmentBudgets.reduce((sum, item) => sum + item.approvedBudget, 0);
  const totalExpenses = doc.departmentBudgets.reduce((sum, item) => sum + item.utilizedBudget, 0);
  const remainingBudget = Math.max(totalBudget - totalExpenses, 0);
  const hostelCollection = doc.hostelLedgers
    .filter((item) => item.status === "Collected")
    .reduce((sum, item) => sum + item.amount, 0);
  const hostelOutstanding = doc.hostelLedgers
    .filter((item) => item.status !== "Collected")
    .reduce((sum, item) => sum + item.amount, 0);
  const pendingApprovals = doc.expenses.filter((item) => item.status === "Pending").length;
  const lowBalanceAlerts = doc.departmentBudgets.filter(
    (item) => item.utilizationPercentage >= 80 || item.remainingBudget <= item.approvedBudget * 0.2
  ).length;

  return {
    institutionBudget: totalBudget,
    totalExpenses,
    remainingBudget,
    hostelRevenue: hostelCollection,
    hostelOutstanding,
    pendingApprovals,
    lowBalanceAlerts,
  };
}

function buildScopedDoc(doc, departments) {
  const scope = departments?.length ? new Set(departments) : null;
  const filterByScope = (item) => !scope || scope.has(item.department);

  return {
    ...doc,
    departmentBudgets: doc.departmentBudgets.filter(filterByScope),
    expenses: doc.expenses.filter(filterByScope),
    alerts: doc.alerts,
    hostelLedgers:
      !scope || scope.has("Hostel")
        ? doc.hostelLedgers
        : [],
  };
}

function getAvailableScopes(doc, role) {
  const academicDepartments = doc.departmentBudgets
    .filter((item) => item.institutionGroup !== "Common Departments")
    .map((item) => item.department);
  const commonDepartments = doc.departmentBudgets
    .filter((item) => item.institutionGroup === "Common Departments")
    .map((item) => item.department);
  const allDepartments = doc.departmentBudgets.map((item) => item.department);

  const byRole = {
    "super-admin": ["All Departments", ...allDepartments],
    principal: ["All Departments", ...allDepartments],
    hod: academicDepartments,
    accounts: ["All Departments", "Common Departments", ...allDepartments],
    staff: academicDepartments,
    hostel: ["Hostel"],
    library: ["Library"],
    student: academicDepartments,
  };

  return [...new Set(byRole[role] || ["All Departments", ...allDepartments])];
}

function getScopeDepartments(doc, role, scope, view) {
  const availableScopes = getAvailableScopes(doc, role);
  const safeScope =
    scope && availableScopes.includes(scope) ? scope : availableScopes[0] || "All Departments";

  const applyView = (budgets) => {
    if (view === "Academic Units") {
      return budgets.filter((item) => item.institutionGroup !== "Common Departments");
    }

    if (view === "Hostel & Common") {
      return budgets.filter(
        (item) => item.institutionGroup === "Common Departments" || item.department === "Hostel"
      );
    }

    return budgets;
  };

  const applyScope = (budgets) => {
    if (safeScope === "All Departments") {
      return budgets;
    }

    if (safeScope === "Common Departments") {
      return budgets.filter((item) => item.institutionGroup === "Common Departments");
    }

    return budgets.filter(
      (item) => item.department === safeScope || item.institutionGroup === safeScope
    );
  };

  const viewScoped = applyView(doc.departmentBudgets);
  const scopedBudgets = applyScope(viewScoped);
  const fallbackBudgets = scopedBudgets.length > 0 ? scopedBudgets : applyScope(doc.departmentBudgets);

  return {
    activeScope: safeScope,
    availableScopes,
    departments: fallbackBudgets.map((item) => item.department),
  };
}

function buildDepartmentRows(doc) {
  return [...doc.departmentBudgets].sort((a, b) => b.approvedBudget - a.approvedBudget);
}

function buildSemesterAllocations(doc) {
  const grouped = new Map();

  doc.departmentBudgets.forEach((item) => {
    const key = item.semester || "Annual";
    const current = grouped.get(key) || {
      semester: key,
      budget: 0,
      expense: 0,
      remaining: 0,
      utilization: 0,
    };

    current.budget += item.semesterBudget || item.approvedBudget;
    current.expense += item.utilizedBudget;
    current.remaining += item.remainingBudget;
    grouped.set(key, current);
  });

  return [...grouped.values()].map((item) => ({
    ...item,
    utilization: item.budget > 0 ? Math.round((item.expense / item.budget) * 100) : 0,
  }));
}

function buildExpenseRows(doc) {
  return [...doc.expenses]
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    .map((item) => {
      const budget = getBudgetForDepartment(doc, item.department);
      const remaining = budget ? budget.remainingBudget : 0;

      return {
        ...item,
        balanceNote:
          item.balanceNote ||
          (item.status === "Pending"
            ? "Approval required before posting"
            : `Balance after post: ${(remaining / 100000).toFixed(2)}L`),
      };
    });
}

function buildApprovalQueue(doc) {
  return doc.expenses
    .filter((item) => item.status !== "Approved")
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    .map((item) => ({
      expenseId: item.expenseId,
      request: item.tag,
      requestedBy: item.requestedBy,
      amount: item.amount,
      stage: item.currentStage,
      remarks: item.remarks,
      history: item.auditTrail.map((entry) => entry.action).join(" -> "),
      status: item.status,
      department: item.department,
    }));
}

function buildHostelMetrics(doc) {
  const hostelCollection = doc.hostelLedgers
    .filter((item) => item.status === "Collected")
    .reduce((sum, item) => sum + item.amount, 0);
  const outstanding = doc.hostelLedgers
    .filter((item) => item.status !== "Collected")
    .reduce((sum, item) => sum + item.amount, 0);
  const roomCount = new Set(doc.hostelLedgers.map((item) => item.roomNo).filter(Boolean)).size;

  return [
    {
      title: "Hostel Fee Collection",
      value: hostelCollection,
      note: `${doc.hostelLedgers.length} active hostel ledger entries`,
      plain: false,
    },
    {
      title: "Outstanding Dues",
      value: outstanding,
      note: `${doc.hostelLedgers.filter((item) => item.status !== "Collected").length} students pending`,
      plain: false,
    },
    {
      title: "Meal & Canteen Recovery",
      value: Math.round(hostelCollection * 0.34),
      note: "Mess and canteen ledger",
      plain: false,
    },
    {
      title: "Room-wise Billing",
      value: roomCount,
      note: "Occupied rooms tracked",
      plain: true,
    },
  ];
}

function buildMonthlyTrend(doc) {
  const baseBudget = doc.departmentBudgets.reduce((sum, item) => sum + item.approvedBudget, 0) / 100000;
  const baseExpense = doc.departmentBudgets.reduce((sum, item) => sum + item.utilizedBudget, 0) / 100000;
  const hostel = doc.hostelLedgers
    .filter((item) => item.status === "Collected")
    .reduce((sum, item) => sum + item.amount, 0) / 100000;

  return ["Apr", "May", "Jun", "Jul", "Aug", "Sep"].map((month, index) => ({
    month,
    budget: Math.max(Math.round(baseBudget * (0.62 + index * 0.04)), 5),
    expense: Math.max(Math.round(baseExpense * (0.48 + index * 0.04)), 4),
    hostel: Math.max(Math.round(hostel * (0.32 + index * 0.03)), 3),
  }));
}

function buildAlerts(doc) {
  const computed = doc.departmentBudgets
    .filter((item) => item.utilizationPercentage >= 80)
    .map((item) =>
      normalizeAlert({
        title: "Low balance alert",
        note: `${item.department} budget crossed ${item.utilizationPercentage}% utilization.`,
        level: "danger",
      })
    );

  return [...computed, ...doc.alerts].slice(0, 6);
}

function buildDashboardPayload(doc, filters = {}) {
  const activeRole = String(filters.role || "super-admin").trim();
  const activeView = String(filters.view || "All Departments").trim();
  const scopeResult = getScopeDepartments(doc, activeRole, filters.scope, activeView);
  const scopedDoc = buildScopedDoc(doc, scopeResult.departments);

  return {
    overview: buildOverview(scopedDoc),
    institutionUnits: doc.institutionUnits,
    departmentBudgets: buildDepartmentRows(scopedDoc),
    semesterAllocations: buildSemesterAllocations(scopedDoc),
    expenses: buildExpenseRows(scopedDoc),
    approvalQueue: buildApprovalQueue(scopedDoc),
    hostelMetrics: buildHostelMetrics(scopedDoc),
    hostelLedgers: scopedDoc.hostelLedgers,
    roleCards,
    reportCards,
    alerts: buildAlerts(scopedDoc),
    monthlyTrend: buildMonthlyTrend(scopedDoc),
    accessControl: {
      activeRole,
      activeView,
      activeScope: scopeResult.activeScope,
      availableScopes: scopeResult.availableScopes,
      permissions: rolePermissions[activeRole] || [],
    },
  };
}

router.get("/dashboard", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const doc = await ensureFinanceSeeded();
    res.status(200).json({
      message: "Department finance dashboard fetched successfully",
      ...buildDashboardPayload(doc, req.query),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error fetching department finance dashboard",
    });
  }
});

router.get("/reports", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const doc = await ensureFinanceSeeded();
    const payload = buildDashboardPayload(doc);

    res.status(200).json({
      message: "Department finance reports fetched successfully",
      reports: {
        departmentBudgetReport: payload.departmentBudgets,
        semesterExpenseReport: payload.semesterAllocations,
        expenseApprovalReport: payload.approvalQueue,
        hostelLedgerReport: payload.hostelLedgers,
        financialAlerts: payload.alerts,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error fetching department finance reports",
    });
  }
});

router.delete("/demo-data", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (_req, res) => {
  try {
    const doc = await ensureFinanceSeeded();
    doc.departmentBudgets = doc.departmentBudgets.map((budget) => ({
      ...budget.toObject(),
      yearlyBudget: 0,
      semesterBudget: 0,
      approvedBudget: 0,
      utilizedBudget: 0,
      pendingBudget: 0,
      carryForwardAmount: 0,
      remainingBudget: 0,
      utilizationPercentage: 0,
    }));
    doc.expenses = [];
    doc.hostelLedgers = [];
    doc.alerts = [];
    await doc.save();

    return res.status(200).json({ message: "Demo finance data cleared successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error clearing demo finance data" });
  }
});

router.post("/budgets", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const department = req.body.department?.trim();
    if (!department) {
      return res.status(400).json({ message: "Department is required" });
    }

    const doc = await ensureFinanceSeeded();
    const existing = getBudgetForDepartment(doc, department);
    const incoming = normalizeBudget({
      ...req.body,
      department,
      approvedBy: req.body.approvedBy?.trim() || "Finance Controller",
    });

    if (existing) {
      Object.assign(existing, incoming);
      recomputeBudget(existing);
    } else {
      doc.departmentBudgets.push(incoming);
    }

    await doc.save();
    res.status(201).json({
      message: existing ? "Department budget updated successfully" : "Department budget created successfully",
      budget: buildDepartmentRows(doc).find((item) => item.department === department),
      overview: buildOverview(doc),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error saving department budget" });
  }
});

router.post("/expenses", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const department = req.body.department?.trim();
    const category = req.body.category?.trim();
    const tag = req.body.tag?.trim();
    const amount = Math.max(toNumber(req.body.amount), 0);

    if (!department || !category || !tag || amount <= 0) {
      return res.status(400).json({
        message: "Department, category, tag, and a valid amount are required",
      });
    }

    const doc = await ensureFinanceSeeded();
    const budget = getBudgetForDepartment(doc, department);

    if (!budget) {
      return res.status(404).json({ message: "Department budget not found" });
    }

    if (amount > budget.remainingBudget) {
      return res.status(400).json({
        message: `Expense exceeds remaining budget for ${department}`,
      });
    }

    budget.pendingBudget += amount;
    recomputeBudget(budget);

    const expense = normalizeExpense({
      ...req.body,
      amount,
      requestedAt: toIsoDate(),
      status: "Pending",
      currentStage: "Pending HOD",
      balanceNote: `Reserved against remaining budget of ${Math.round(budget.remainingBudget / 1000)}K`,
      auditTrail: [
        {
          action: "Submitted",
          actor: req.body.requestedBy?.trim() || "Department User",
          note: req.body.remarks?.trim() || "Expense request submitted",
          timestamp: toIsoDate(),
        },
      ],
    });

    doc.expenses.unshift(expense);

    if (budget.utilizationPercentage >= 80) {
      doc.alerts.unshift(
        normalizeAlert({
          title: "Low balance alert",
          note: `${department} budget crossed ${budget.utilizationPercentage}% utilization.`,
          level: "danger",
        })
      );
    }

    await doc.save();

    res.status(201).json({
      message: "Expense request submitted successfully",
      expense,
      overview: buildOverview(doc),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error submitting expense request" });
  }
});

router.patch("/approvals/:expenseId", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const status = req.body.status?.trim();
    if (!["Approved", "Rejected", "Pending"].includes(status)) {
      return res.status(400).json({
        message: "Status must be Approved, Rejected, or Pending",
      });
    }

    const doc = await ensureFinanceSeeded();
    const expense = doc.expenses.find((item) => item.expenseId === req.params.expenseId);
    if (!expense) {
      return res.status(404).json({ message: "Expense request not found" });
    }

    const budget = getBudgetForDepartment(doc, expense.department);
    if (!budget) {
      return res.status(404).json({ message: "Department budget not found" });
    }

    const previousStatus = expense.status;
    expense.status = status;
    expense.currentStage =
      status === "Approved"
        ? "Completed"
        : status === "Rejected"
          ? "Closed"
          : "Accounts Review";
    expense.remarks = req.body.remarks?.trim() || expense.remarks;
    expense.auditTrail.unshift({
      action: status,
      actor: req.body.actor?.trim() || "Finance Approver",
      note: expense.remarks || `${status} by workflow`,
      timestamp: toIsoDate(),
    });

    if (previousStatus !== "Approved" && status === "Approved") {
      budget.pendingBudget = Math.max(budget.pendingBudget - expense.amount, 0);
      budget.utilizedBudget += expense.amount;
      recomputeBudget(budget);
    } else if (previousStatus !== "Rejected" && status === "Rejected") {
      budget.pendingBudget = Math.max(budget.pendingBudget - expense.amount, 0);
      recomputeBudget(budget);
    }

    await doc.save();
    res.status(200).json({
      message: `Expense request ${status.toLowerCase()} successfully`,
      expense,
      overview: buildOverview(doc),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error updating approval status" });
  }
});

router.post("/hostel-payments", verifyToken, attachCurrentUser, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const studentName = req.body.studentName?.trim();
    const registrationNo = req.body.registrationNo?.trim();
    const roomNo = req.body.roomNo?.trim();
    const amount = Math.max(toNumber(req.body.amount), 0);

    if (!studentName || !registrationNo || !roomNo || amount <= 0) {
      return res.status(400).json({
        message: "Student name, registration number, room number, and valid amount are required",
      });
    }

    const doc = await ensureFinanceSeeded();
    const hostelEntry = normalizeHostelLedger({
      ...req.body,
      studentName,
      registrationNo,
      roomNo,
      amount,
      paymentDate: toIsoDate(),
      status: req.body.status?.trim() || "Collected",
      receiptNumber: req.body.receiptNumber?.trim() || uniqueId("HST-RCT"),
    });

    doc.hostelLedgers.unshift(hostelEntry);

    const hostelBudget = getBudgetForDepartment(doc, "Hostel");
    if (hostelBudget) {
      hostelBudget.utilizedBudget = Math.max(hostelBudget.utilizedBudget - Math.round(amount * 0.12), 0);
      recomputeBudget(hostelBudget);
    }

    await doc.save();
    res.status(201).json({
      message: "Hostel payment recorded successfully",
      receipt: hostelEntry,
      overview: buildOverview(doc),
      hostelMetrics: buildHostelMetrics(doc),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error recording hostel payment" });
  }
});

export default router;
