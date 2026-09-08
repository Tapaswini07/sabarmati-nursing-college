import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HandCoins,
  Hotel,
  IndianRupee,
  Landmark,
  Library,
  LoaderCircle,
  RefreshCcw,
  School,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
  WalletCards,
} from "lucide-react";
import { apiRequest } from "../config/api";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const filterYears = ["FY 2026-27", "FY 2025-26", "FY 2024-25"];
const filterViews = ["All Departments", "Academic Units", "Hostel & Common"];

const roleOptions = [
  {
    key: "super-admin",
    label: "Super Admin",
    icon: ShieldCheck,
    description: "Full access to all connected budget, approval, and hostel controls.",
  },
  {
    key: "principal",
    label: "Principal",
    icon: Landmark,
    description: "Institution overview, reports, and approval visibility.",
  },
  {
    key: "hod",
    label: "HOD",
    icon: GraduationCap,
    description: "Department-level budget and expense planning.",
  },
  {
    key: "accounts",
    label: "Accounts",
    icon: IndianRupee,
    description: "Expense control, approvals, and finance summary.",
  },
  {
    key: "hostel",
    label: "Hostel",
    icon: Hotel,
    description: "Hostel collections, room receipts, and dues tracking.",
  },
  {
    key: "library",
    label: "Library",
    icon: Library,
    description: "Library-scoped reporting and budget visibility.",
  },
  {
    key: "staff",
    label: "Staff",
    icon: Users,
    description: "Department-level academic and operational access.",
  },
  {
    key: "student",
    label: "Student",
    icon: School,
    description: "Read-only academic and finance summary access.",
  },
];

const defaultBudgetForm = {
  department: "Library",
  institutionGroup: "Common Departments",
  semester: "Annual",
  yearlyBudget: "",
  carryForwardAmount: "",
  remarks: "",
};

const defaultExpenseForm = {
  department: "Library",
  category: "Software & Licensing",
  tag: "",
  semester: "Annual",
  amount: "",
  requestedBy: "Department User",
  remarks: "",
};

const defaultHostelForm = {
  studentName: "",
  registrationNo: "",
  roomNo: "",
  amount: "",
  paymentMode: "UPI",
  status: "Collected",
};

function getDefaultScopeForRole(roleKey) {
  if (roleKey === "hostel") {
    return "Hostel";
  }

  if (roleKey === "library") {
    return "Library";
  }

  if (roleKey === "hod") {
    return "B.Sc Nursing";
  }

  return "All Departments";
}

function formatCurrency(value) {
  if (typeof value !== "number") {
    return value;
  }

  return currencyFormatter.format(value);
}

function getStatusTone(status) {
  if (status === "Approved" || status === "Collected" || status === "Active") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "Pending") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "Rejected" || status === "Auto Alert") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
}

function FieldCard({ label, children }) {
  return (
    <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({ title, value, note, icon: Icon }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{note}</p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

export default function Department() {
  const [selectedYear, setSelectedYear] = useState(filterYears[0]);
  const [selectedView, setSelectedView] = useState(filterViews[0]);
  const [activeRole, setActiveRole] = useState("super-admin");
  const [selectedScope, setSelectedScope] = useState(getDefaultScopeForRole("super-admin"));
  const [loading, setLoading] = useState(true);
  const [savingBudget, setSavingBudget] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingHostel, setSavingHostel] = useState(false);
  const [approvingId, setApprovingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [budgetForm, setBudgetForm] = useState(defaultBudgetForm);
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm);
  const [hostelForm, setHostelForm] = useState(defaultHostelForm);
  const [lastReceipt, setLastReceipt] = useState(null);

  useEffect(() => {
    let ignore = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          year: selectedYear,
          view: selectedView,
          role: activeRole,
          scope: selectedScope,
        });
        const payload = await apiRequest(
          `/api/department-finance/dashboard?${params.toString()}`
        );

        if (!ignore) {
          setDashboard(payload);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message);
          setDashboard(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [activeRole, selectedScope, selectedView, selectedYear]);

  const refreshDashboard = async () => {
    setError("");
    const params = new URLSearchParams({
      year: selectedYear,
      view: selectedView,
      role: activeRole,
      scope: selectedScope,
    });
    const payload = await apiRequest(
      `/api/department-finance/dashboard?${params.toString()}`
    );
    setDashboard(payload);
  };

  const availableScopes = dashboard?.accessControl?.availableScopes || [selectedScope];
  const activeRoleConfig =
    roleOptions.find((role) => role.key === activeRole) || roleOptions[0];

  useEffect(() => {
    if (availableScopes.length > 0 && !availableScopes.includes(selectedScope)) {
      setSelectedScope(availableScopes[0]);
    }
  }, [availableScopes, selectedScope]);

  useEffect(() => {
    if (
      selectedScope &&
      selectedScope !== "All Departments" &&
      selectedScope !== "Common Departments"
    ) {
      const scopeBudget = (dashboard?.departmentBudgets || []).find(
        (item) => item.department === selectedScope
      );

      setBudgetForm((current) => ({
        ...current,
        department: selectedScope,
        institutionGroup:
          scopeBudget?.institutionGroup || current.institutionGroup,
      }));

      setExpenseForm((current) => ({
        ...current,
        department: selectedScope,
      }));
    }
  }, [dashboard, selectedScope]);

  const overview = dashboard?.overview || {};

  const summaryCards = useMemo(
    () => [
      {
        title: "Institution Budget",
        value: formatCurrency(overview.institutionBudget || 0),
        note: `${selectedYear} approved budget`,
        icon: WalletCards,
      },
      {
        title: "Total Expenses",
        value: formatCurrency(overview.totalExpenses || 0),
        note: "Connected expense utilization",
        icon: IndianRupee,
      },
      {
        title: "Remaining Budget",
        value: formatCurrency(overview.remainingBudget || 0),
        note: "Available balance across scope",
        icon: TrendingUp,
      },
      {
        title: "Pending Approvals",
        value: overview.pendingApprovals || 0,
        note: "Workflow items awaiting decision",
        icon: CheckCircle2,
      },
    ],
    [overview, selectedYear]
  );

  const budgetUtilization = useMemo(() => {
    const budgets = dashboard?.departmentBudgets || [];
    const totalBudget = budgets.reduce((sum, item) => sum + item.approvedBudget, 0);
    const totalUsed = budgets.reduce((sum, item) => sum + item.utilizedBudget, 0);

    return totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;
  }, [dashboard]);

  const handleRoleSwitch = (roleKey) => {
    setActiveRole(roleKey);
    setSelectedScope(getDefaultScopeForRole(roleKey));
    setSuccess("");
    setError("");
  };

  const handleBudgetSubmit = async () => {
    try {
      setSavingBudget(true);
      setError("");
      setSuccess("");

      await apiRequest("/api/department-finance/budgets", {
        method: "POST",
        body: JSON.stringify({
          ...budgetForm,
          financialYear: selectedYear,
          academicYear: "2026-27",
          yearlyBudget: Number(budgetForm.yearlyBudget || 0),
          approvedBudget: Number(budgetForm.yearlyBudget || 0),
          semesterBudget: Number(budgetForm.yearlyBudget || 0),
          carryForwardAmount: Number(budgetForm.carryForwardAmount || 0),
          pendingBudget: 0,
          utilizedBudget: 0,
        }),
      });

      setBudgetForm(defaultBudgetForm);
      setSuccess("Department budget saved successfully.");
      await refreshDashboard();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSavingBudget(false);
    }
  };

  const handleExpenseSubmit = async () => {
    try {
      setSavingExpense(true);
      setError("");
      setSuccess("");

      await apiRequest("/api/department-finance/expenses", {
        method: "POST",
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount || 0),
        }),
      });

      setExpenseForm(defaultExpenseForm);
      setSuccess("Expense request submitted successfully.");
      await refreshDashboard();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleApproval = async (expenseId, status) => {
    try {
      setApprovingId(`${expenseId}:${status}`);
      setError("");
      setSuccess("");

      await apiRequest(`/api/department-finance/approvals/${expenseId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          actor: "Finance Approver",
          remarks:
            status === "Approved"
              ? "Approved from department dashboard"
              : "Rejected after review",
        }),
      });

      setSuccess(`Expense request ${status.toLowerCase()} successfully.`);
      await refreshDashboard();
    } catch (approvalError) {
      setError(approvalError.message);
    } finally {
      setApprovingId("");
    }
  };

  const handleHostelSubmit = async () => {
    try {
      setSavingHostel(true);
      setError("");
      setSuccess("");

      const payload = await apiRequest("/api/department-finance/hostel-payments", {
        method: "POST",
        body: JSON.stringify({
          ...hostelForm,
          amount: Number(hostelForm.amount || 0),
        }),
      });

      setLastReceipt(payload.receipt);
      setHostelForm(defaultHostelForm);
      setSuccess("Hostel payment recorded and receipt generated.");
      await refreshDashboard();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSavingHostel(false);
    }
  };

  const showBudgetForm = ["super-admin", "hod"].includes(activeRole);
  const showExpenseForm = ["super-admin", "accounts", "hod"].includes(activeRole);
  const showApprovalList = ["super-admin", "accounts", "principal"].includes(activeRole);
  const showHostelForm = ["super-admin", "hostel"].includes(activeRole);

  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_46%,#e2e8f0_100%)] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
            <div className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] p-6 text-white">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                <ShieldCheck size={14} />
                Department Finance Dashboard
              </span>
              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                Simple and official department access management
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">
                This page is connected to the backend for budgets, expenses,
                approvals, hostel receipts, and department reporting with a cleaner
                institutional layout.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
                    Active Role
                  </p>
                  <p className="mt-2 text-xl font-bold text-white">
                    {activeRoleConfig.label}
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {activeRoleConfig.description}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
                    Active Scope
                  </p>
                  <p className="mt-2 text-xl font-bold text-white">
                    {dashboard?.accessControl?.activeScope || selectedScope}
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    Budget utilization: {budgetUtilization}%
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                      Filters
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      Connected controls
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={refreshDashboard}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <RefreshCcw size={13} />
                    Refresh
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <FieldCard label="Financial Year">
                    <select
                      value={selectedYear}
                      onChange={(event) => setSelectedYear(event.target.value)}
                      className="w-full bg-transparent text-sm text-slate-900 outline-none"
                    >
                      {filterYears.map((year) => (
                        <option key={year}>{year}</option>
                      ))}
                    </select>
                  </FieldCard>

                  <FieldCard label="View">
                    <select
                      value={selectedView}
                      onChange={(event) => setSelectedView(event.target.value)}
                      className="w-full bg-transparent text-sm text-slate-900 outline-none"
                    >
                      {filterViews.map((view) => (
                        <option key={view}>{view}</option>
                      ))}
                    </select>
                  </FieldCard>

                  <FieldCard label="Scope">
                    <select
                      value={selectedScope}
                      onChange={(event) => setSelectedScope(event.target.value)}
                      className="w-full bg-transparent text-sm text-slate-900 outline-none"
                    >
                      {availableScopes.map((scope) => (
                        <option key={scope}>{scope}</option>
                      ))}
                    </select>
                  </FieldCard>

                  <FieldCard label="Permissions">
                    <div className="text-sm text-slate-700">
                      {(dashboard?.accessControl?.permissions || []).length} active
                    </div>
                  </FieldCard>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Institution Units</h3>
                    <p className="text-sm text-slate-500">From connected backend data</p>
                  </div>
                  <Building2 size={20} className="text-slate-700" />
                </div>

                <div className="mt-4 space-y-3">
                  {(dashboard?.institutionUnits || []).slice(0, 3).map((unit) => (
                    <div
                      key={unit.title}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="font-semibold text-slate-900">{unit.title}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        {(unit.items || []).join(" • ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-12 shadow-sm">
            <div className="flex items-center justify-center gap-3 text-slate-600">
              <LoaderCircle className="animate-spin" size={20} />
              Loading department dashboard...
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((item) => (
                <SummaryCard key={item.title} {...item} />
              ))}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                    Role Panels
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    Simple access buttons
                  </h3>
                </div>
                <UserCog size={22} className="text-slate-700" />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {roleOptions.map((role) => {
                  const Icon = role.icon;
                  const isActive = role.key === activeRole;

                  return (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => handleRoleSwitch(role.key)}
                      className={`rounded-[22px] border p-4 text-left transition ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                        <Icon size={18} />
                      </span>
                      <p className="mt-4 font-bold">{role.label}</p>
                      <p
                        className={`mt-2 text-sm leading-6 ${
                          isActive ? "text-slate-200" : "text-slate-500"
                        }`}
                      >
                        {role.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                {showBudgetForm ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          Department Budget Form
                        </h3>
                        <p className="text-sm text-slate-500">
                          Create or update department budget records.
                        </p>
                      </div>
                      <WalletCards size={22} className="text-slate-700" />
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <input
                        value={budgetForm.department}
                        onChange={(event) =>
                          setBudgetForm((current) => ({
                            ...current,
                            department: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        placeholder="Department"
                      />
                      <input
                        value={budgetForm.institutionGroup}
                        onChange={(event) =>
                          setBudgetForm((current) => ({
                            ...current,
                            institutionGroup: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        placeholder="Institution group"
                      />
                      <input
                        value={budgetForm.semester}
                        onChange={(event) =>
                          setBudgetForm((current) => ({
                            ...current,
                            semester: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        placeholder="Semester"
                      />
                      <input
                        type="number"
                        value={budgetForm.yearlyBudget}
                        onChange={(event) =>
                          setBudgetForm((current) => ({
                            ...current,
                            yearlyBudget: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        placeholder="Yearly budget"
                      />
                      <input
                        type="number"
                        value={budgetForm.carryForwardAmount}
                        onChange={(event) =>
                          setBudgetForm((current) => ({
                            ...current,
                            carryForwardAmount: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        placeholder="Carry forward amount"
                      />
                      <textarea
                        rows="4"
                        value={budgetForm.remarks}
                        onChange={(event) =>
                          setBudgetForm((current) => ({
                            ...current,
                            remarks: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 md:col-span-2"
                        placeholder="Remarks"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleBudgetSubmit}
                      disabled={savingBudget}
                      className="mt-5 inline-flex items-center justify-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingBudget ? "Saving..." : "Save Budget"}
                    </button>
                  </div>
                ) : null}

                {showExpenseForm ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          Expense Request Form
                        </h3>
                        <p className="text-sm text-slate-500">
                          Submit expense requests into the connected approval workflow.
                        </p>
                      </div>
                      <HandCoins size={22} className="text-slate-700" />
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {[
                        ["department", "Department"],
                        ["category", "Category"],
                        ["tag", "Expense tag"],
                        ["semester", "Semester"],
                        ["requestedBy", "Requested by"],
                      ].map(([key, label]) => (
                        <input
                          key={key}
                          value={expenseForm[key]}
                          onChange={(event) =>
                            setExpenseForm((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                          className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-900"
                          placeholder={label}
                        />
                      ))}
                      <input
                        type="number"
                        value={expenseForm.amount}
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-900"
                        placeholder="Amount"
                      />
                      <textarea
                        rows="4"
                        value={expenseForm.remarks}
                        onChange={(event) =>
                          setExpenseForm((current) => ({
                            ...current,
                            remarks: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-900 md:col-span-2"
                        placeholder="Remarks"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleExpenseSubmit}
                      disabled={savingExpense}
                      className="mt-5 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingExpense ? "Submitting..." : "Submit Expense"}
                    </button>
                  </div>
                ) : null}

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        Department Budget Table
                      </h3>
                      <p className="text-sm text-slate-500">
                        Official budget records from the backend.
                      </p>
                    </div>
                    <FileSpreadsheet size={22} className="text-slate-700" />
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="px-3 py-3 font-semibold">Department</th>
                          <th className="px-3 py-3 font-semibold">Semester</th>
                          <th className="px-3 py-3 font-semibold">Budget</th>
                          <th className="px-3 py-3 font-semibold">Used</th>
                          <th className="px-3 py-3 font-semibold">Remaining</th>
                          <th className="px-3 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(dashboard?.departmentBudgets || []).map((item) => (
                          <tr key={item.budgetId} className="border-b border-slate-100">
                            <td className="px-3 py-3 font-semibold text-slate-900">
                              {item.department}
                            </td>
                            <td className="px-3 py-3 text-slate-700">{item.semester}</td>
                            <td className="px-3 py-3 text-slate-700">
                              {formatCurrency(item.approvedBudget)}
                            </td>
                            <td className="px-3 py-3 text-slate-700">
                              {formatCurrency(item.utilizedBudget)}
                            </td>
                            <td className="px-3 py-3 text-slate-700">
                              {formatCurrency(item.remainingBudget)}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(
                                  item.status
                                )}`}
                              >
                                {item.utilizationPercentage}% used
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {showApprovalList ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          Approval Workflow
                        </h3>
                        <p className="text-sm text-slate-500">
                          Review pending requests and approve or reject them.
                        </p>
                      </div>
                      <ShieldCheck size={22} className="text-slate-700" />
                    </div>

                    <div className="mt-5 space-y-4">
                      {(dashboard?.approvalQueue || []).length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                          No approval items available.
                        </div>
                      ) : (
                        (dashboard?.approvalQueue || []).map((item) => (
                          <div
                            key={item.expenseId}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{item.request}</p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {item.department} • {item.requestedBy}
                                </p>
                              </div>
                              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                                {item.stage}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                                Amount: {formatCurrency(item.amount)}
                              </div>
                              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                                {item.remarks}
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => handleApproval(item.expenseId, "Approved")}
                                disabled={approvingId === `${item.expenseId}:Approved`}
                                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                              >
                                {approvingId === `${item.expenseId}:Approved`
                                  ? "Approving..."
                                  : "Approve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproval(item.expenseId, "Rejected")}
                                disabled={approvingId === `${item.expenseId}:Rejected`}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                              >
                                {approvingId === `${item.expenseId}:Rejected`
                                  ? "Rejecting..."
                                  : "Reject"}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}

                {showHostelForm ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          Hostel Collection Form
                        </h3>
                        <p className="text-sm text-slate-500">
                          Record hostel payments and generate receipts.
                        </p>
                      </div>
                      <Hotel size={22} className="text-slate-700" />
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <input
                        value={hostelForm.studentName}
                        onChange={(event) =>
                          setHostelForm((current) => ({
                            ...current,
                            studentName: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-700"
                        placeholder="Student name"
                      />
                      <input
                        value={hostelForm.registrationNo}
                        onChange={(event) =>
                          setHostelForm((current) => ({
                            ...current,
                            registrationNo: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-700"
                        placeholder="Registration number"
                      />
                      <input
                        value={hostelForm.roomNo}
                        onChange={(event) =>
                          setHostelForm((current) => ({
                            ...current,
                            roomNo: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-700"
                        placeholder="Room number"
                      />
                      <input
                        type="number"
                        value={hostelForm.amount}
                        onChange={(event) =>
                          setHostelForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-700"
                        placeholder="Amount"
                      />
                      <input
                        value={hostelForm.paymentMode}
                        onChange={(event) =>
                          setHostelForm((current) => ({
                            ...current,
                            paymentMode: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-700"
                        placeholder="Payment mode"
                      />
                      <input
                        value={hostelForm.status}
                        onChange={(event) =>
                          setHostelForm((current) => ({
                            ...current,
                            status: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-700"
                        placeholder="Status"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleHostelSubmit}
                      disabled={savingHostel}
                      className="mt-5 inline-flex items-center justify-center rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingHostel ? "Recording..." : "Record Hostel Payment"}
                    </button>

                    {lastReceipt ? (
                      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                        Receipt generated:{" "}
                        <span className="font-semibold">
                          {lastReceipt.receiptNumber}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        Expenses and Alerts
                      </h3>
                      <p className="text-sm text-slate-500">
                        Live expense rows and alert cards from the API.
                      </p>
                    </div>
                    <FileText size={22} className="text-slate-700" />
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="px-3 py-3 font-semibold">Department</th>
                          <th className="px-3 py-3 font-semibold">Tag</th>
                          <th className="px-3 py-3 font-semibold">Amount</th>
                          <th className="px-3 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(dashboard?.expenses || []).slice(0, 6).map((row) => (
                          <tr key={row.expenseId} className="border-b border-slate-100">
                            <td className="px-3 py-3 font-semibold text-slate-900">
                              {row.department}
                            </td>
                            <td className="px-3 py-3 text-slate-700">{row.tag}</td>
                            <td className="px-3 py-3 text-slate-700">
                              {formatCurrency(row.amount)}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(
                                  row.status
                                )}`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 space-y-3">
                    {(dashboard?.alerts || []).slice(0, 4).map((alert) => (
                      <div
                        key={`${alert.title}-${alert.note}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="font-semibold text-slate-900">{alert.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {alert.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
