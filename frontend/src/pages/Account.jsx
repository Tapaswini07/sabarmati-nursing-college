import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BadgeCheck,
  BanknoteArrowDown,
  BanknoteArrowUp,
  BookOpenCheck,
  Building2,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  FileBadge2,
  FileSpreadsheet,
  FileText,
  Landmark,
  Layers3,
  ReceiptText,
  ScanSearch,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const quickStats = [
  {
    title: "Total Income",
    value: 2845000,
    change: "+12.4%",
    tone: "text-emerald-300",
  },
  {
    title: "Total Expenses",
    value: 1760000,
    change: "+5.1%",
    tone: "text-amber-300",
  },
  {
    title: "Cash in Hand",
    value: 248000,
    change: "Closing matched",
    tone: "text-cyan-300",
  },
  {
    title: "Bank Balance",
    value: 968000,
    change: "4 banks synced",
    tone: "text-sky-300",
  },
  {
    title: "Pending Payments",
    value: 362000,
    change: "18 approvals pending",
    tone: "text-rose-300",
  },
  {
    title: "GST & TDS",
    value: 194000,
    change: "Filed through Apr 2026",
    tone: "text-violet-300",
  },
];

const entryRows = [
  {
    date: "17 May 2026",
    voucher: "JV-2026-0517-014",
    category: "Tuition Collection",
    ledger: "Student Ledger / Nursing Year 1",
    debit: 0,
    credit: 125000,
    status: "Posted",
  },
  {
    date: "17 May 2026",
    voucher: "CP-2026-0517-008",
    category: "Vendor Payment",
    ledger: "Vendor Ledger / Medisupply",
    debit: 46500,
    credit: 0,
    status: "Approved",
  },
  {
    date: "16 May 2026",
    voucher: "BR-2026-0516-006",
    category: "Bank Reconciliation",
    ledger: "HDFC Current Account",
    debit: 0,
    credit: 87500,
    status: "Matched",
  },
  {
    date: "16 May 2026",
    voucher: "CB-2026-0516-010",
    category: "Cash Expense",
    ledger: "Department Ledger / Hostel",
    debit: 12800,
    credit: 0,
    status: "Under Review",
  },
];

const journalQueue = [
  {
    title: "Monthly salary provision",
    voucher: "JV-2026-0520-001",
    owner: "Accounts Office",
    workflow: "Maker -> Reviewer -> Finance Controller",
    amount: 685000,
    status: "Pending Approval",
  },
  {
    title: "Library asset capitalization",
    voucher: "JV-2026-0518-004",
    owner: "Admin Branch",
    workflow: "Maker -> Auto Post",
    amount: 214000,
    status: "Auto Posted",
  },
  {
    title: "Vendor TDS adjustment",
    voucher: "JV-2026-0517-009",
    owner: "Purchase Desk",
    workflow: "Maker -> Reviewer",
    amount: 34200,
    status: "Edited",
  },
];

const ledgerCards = [
  {
    title: "Student Ledger",
    subtitle: "Admission fees, dues, refunds, scholarships",
    balance: 1265000,
    tone: "from-sky-500 to-blue-700",
  },
  {
    title: "Vendor Ledger",
    subtitle: "Purchases, settlement cycles, tax deductions",
    balance: 482000,
    tone: "from-emerald-500 to-teal-700",
  },
  {
    title: "Staff Ledger",
    subtitle: "Payroll, reimbursements, advances",
    balance: 734000,
    tone: "from-amber-500 to-orange-700",
  },
  {
    title: "Department Ledger",
    subtitle: "Branch-wise budgets and utilization",
    balance: 548000,
    tone: "from-fuchsia-500 to-rose-700",
  },
];

const financialReports = [
  {
    name: "Trial Balance",
    summary: "Debit and credit summary with FY filter and export support",
    primary: "Debits 24.8L",
    secondary: "Credits 24.8L",
  },
  {
    name: "Balance Sheet",
    summary: "Assets, liabilities, reserves, and year-wise comparison",
    primary: "Assets 42.4L",
    secondary: "Liabilities 18.2L",
  },
  {
    name: "Income & Expenditure",
    summary: "Monthly and annual operating position by department",
    primary: "Surplus 10.9L",
    secondary: "Expense ratio 61.8%",
  },
  {
    name: "Receipt & Payment",
    summary: "Cash and bank movement across daily to yearly views",
    primary: "Receipts 31.6L",
    secondary: "Payments 20.7L",
  },
];

const operations = [
  {
    title: "Bank Reconciliation Statement",
    desc: "Statement matching, pending cheques, mismatch verification workflow",
    metric: "14 pending items",
    icon: ScanSearch,
  },
  {
    title: "Cash Book Management",
    desc: "Opening/closing balance control with cash flow reporting",
    metric: "Cash closing verified",
    icon: Wallet,
  },
  {
    title: "Bank Transactions",
    desc: "Multi-bank deposits, withdrawals, and account monitoring",
    metric: "4 linked bank accounts",
    icon: Landmark,
  },
  {
    title: "UPI Tracking",
    desc: "Payment verification, QR collection, status monitoring",
    metric: "182 UPI transactions",
    icon: CircleDollarSign,
  },
  {
    title: "Cheque Tracking",
    desc: "Issue, receive, clearance status, and reminder controls",
    metric: "9 cheques awaiting clearance",
    icon: ReceiptText,
  },
  {
    title: "GST & TDS Reporting",
    desc: "Tax automation, compliance summaries, and export-ready statements",
    metric: "Returns ready for filing",
    icon: FileBadge2,
  },
];

const adminControls = [
  "Role-based access for accountant, approver, auditor, and branch admin",
  "Approval workflow for journal edits, high-value payments, and tax filings",
  "Immutable audit logs for posted vouchers and reconciliation actions",
  "Financial year setup with active, locked, and archived states",
  "Multi-branch accounting with centralized analytics and ledger isolation",
];

const auditItems = [
  {
    action: "Daily entry posted",
    note: "Tuition collection voucher auto-mapped to student ledger",
    time: "17 May 2026, 10:42 AM",
  },
  {
    action: "BRS mismatch flagged",
    note: "Cheque #002481 still pending in ICICI statement import",
    time: "17 May 2026, 09:18 AM",
  },
  {
    action: "TDS payment approved",
    note: "Vendor deduction batch released by Finance Controller",
    time: "16 May 2026, 06:15 PM",
  },
];

const financeYears = ["FY 2026-27", "FY 2025-26", "FY 2024-25"];
const branches = ["Central Campus", "North Branch", "Skill Center"];

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function getEntryStatusClass(status) {
  if (status === "Posted" || status === "Approved" || status === "Matched") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "Under Review") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

const Account = () => {
  const [selectedYear, setSelectedYear] = useState(financeYears[0]);
  const [selectedBranch, setSelectedBranch] = useState(branches[0]);
  const [approvalMode, setApprovalMode] = useState("Approval Required");

  const totals = useMemo(() => {
    const debitTotal = entryRows.reduce((sum, item) => sum + item.debit, 0);
    const creditTotal = entryRows.reduce((sum, item) => sum + item.credit, 0);

    return {
      debitTotal,
      creditTotal,
      dailyEntries: entryRows.length,
      openApprovals: journalQueue.filter((item) => item.status !== "Auto Posted").length,
    };
  }, []);

  return (
    <section className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_24%),linear-gradient(180deg,#f3faf7_0%,#f8fafc_46%,#edf4f7_100%)] p-4 md:p-6 lg:p-8">
      <div className="page-enter mx-auto max-w-[1600px] space-y-6">
        <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
          <div className="relative p-6 md:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.10),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.12),_transparent_28%)]" />

            <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[30px] bg-[linear-gradient(135deg,#052e2b_0%,#0f172a_52%,#14532d_100%)] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] md:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
                    <ShieldCheck size={14} />
                    Secure Finance Module
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
                    <BookOpenCheck size={14} />
                    Audit Ready
                  </span>
                </div>

                <h1 className="mt-5 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                  Accounting and finance management workspace for complete institutional control.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
                  Manage daily accounting entries, journal workflows, ledgers, tax reporting,
                  reconciliation, and financial statements from one modern, branch-aware dashboard.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {quickStats.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                        {item.title}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        {formatCurrency(item.value)}
                      </p>
                      <p className={`mt-2 text-sm font-medium ${item.tone}`}>{item.change}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                        Finance Scope
                      </p>
                      <h2 className="mt-3 text-2xl font-bold text-slate-900">
                        {selectedYear}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Live accounting view for {selectedBranch} with protected posting,
                        workflow approvals, and multi-branch visibility.
                      </p>
                    </div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <Building2 size={22} />
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["Accountant", "Finance Controller", "Branch Admin", "Auditor"].map((role) => (
                      <span
                        key={role}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_100%)] p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                    Posting Health
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-3xl font-black text-slate-900">{totals.dailyEntries}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Daily entries captured with {totals.openApprovals} workflow items still
                        requiring attention.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                      Healthy
                      <CheckCircle2 size={16} />
                    </span>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
                    Quick Actions
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {["New Journal Entry", "Post Daily Entry", "Export Trial Balance", "Reconcile Bank"].map(
                      (action) => (
                        <button
                          key={action}
                          type="button"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                        >
                          <ArrowRightLeft size={16} />
                          {action}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-8 grid gap-4 rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur lg:grid-cols-[1.15fr_0.85fr]">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Financial Year
                  </span>
                  <select
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  >
                    {financeYears.map((year) => (
                      <option key={year}>{year}</option>
                    ))}
                  </select>
                </label>

                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Branch
                  </span>
                  <select
                    value={selectedBranch}
                    onChange={(event) => setSelectedBranch(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  >
                    {branches.map((branch) => (
                      <option key={branch}>{branch}</option>
                    ))}
                  </select>
                </label>

                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Approval Mode
                  </span>
                  <select
                    value={approvalMode}
                    onChange={(event) => setApprovalMode(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  >
                    {["Approval Required", "Auto Post Enabled", "Audit Review Only"].map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_100%)] p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Debit Total
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {formatCurrency(totals.debitTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Credit Total
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {formatCurrency(totals.creditTotal)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Daily entry, journal posting, ledger updates, and report generation are aligned
                  to the selected financial year and branch context.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Daily Accounting Entry</h3>
                  <p className="text-sm text-slate-500">
                    Date-wise debit and credit records with voucher tracking and category control.
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <FileSpreadsheet size={16} />
                  Export Excel
                </button>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-3 py-3 font-semibold">Date</th>
                      <th className="px-3 py-3 font-semibold">Voucher</th>
                      <th className="px-3 py-3 font-semibold">Category</th>
                      <th className="px-3 py-3 font-semibold">Ledger</th>
                      <th className="px-3 py-3 font-semibold">Debit</th>
                      <th className="px-3 py-3 font-semibold">Credit</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entryRows.map((row) => (
                      <tr key={row.voucher} className="border-b border-slate-100">
                        <td className="px-3 py-3 text-slate-700">{row.date}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900">{row.voucher}</td>
                        <td className="px-3 py-3 text-slate-700">{row.category}</td>
                        <td className="px-3 py-3 text-slate-700">{row.ledger}</td>
                        <td className="px-3 py-3 text-slate-700">{formatCurrency(row.debit)}</td>
                        <td className="px-3 py-3 text-slate-700">{formatCurrency(row.credit)}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEntryStatusClass(row.status)}`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Journal Entry Workflow</h3>
                  <p className="text-sm text-slate-500">
                    Manual journal creation, auto posting, voucher generation, edit control, and approval routing.
                  </p>
                </div>
                <BookOpenCheck className="text-slate-700" size={22} />
              </div>

              <div className="mt-5 grid gap-4">
                {journalQueue.map((item) => (
                  <div
                    key={item.voucher}
                    className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{item.title}</h4>
                        <p className="mt-1 text-sm text-slate-500">{item.workflow}</p>
                      </div>
                      <span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Voucher</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{item.voucher}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Owner</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{item.owner}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Amount</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatCurrency(item.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Ledger Management</h3>
                  <p className="text-sm text-slate-500">
                    Structured ledgers for students, vendors, staff, and departments with opening and closing balance visibility.
                  </p>
                </div>
                <Layers3 className="text-slate-700" size={22} />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {ledgerCards.map((item) => (
                  <div
                    key={item.title}
                    className={`rounded-[26px] bg-[linear-gradient(135deg,var(--tw-gradient-stops))] from-slate-900 ${item.tone} p-5 text-white shadow-lg`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                      {item.title}
                    </p>
                    <p className="mt-3 text-2xl font-bold">{formatCurrency(item.balance)}</p>
                    <p className="mt-3 text-sm leading-6 text-white/85">{item.subtitle}</p>
                    <div className="mt-5 flex items-center justify-between text-sm text-white/80">
                      <span>Opening verified</span>
                      <span>Closing live</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Financial Statements</h3>
                  <p className="text-sm text-slate-500">
                    Automated reports with analytics, year filters, and export actions.
                  </p>
                </div>
                <Calculator className="text-slate-700" size={22} />
              </div>

              <div className="mt-5 space-y-4">
                {financialReports.map((item) => (
                  <div key={item.name} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{item.name}</h4>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{item.summary}</p>
                      </div>
                      <FileText size={20} className="text-slate-600" />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Primary</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{item.primary}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Secondary</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{item.secondary}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Transactions & Compliance</h3>
                  <p className="text-sm text-slate-500">
                    Operational coverage for bank, cash, UPI, cheque, GST, and TDS workflows.
                  </p>
                </div>
                <ReceiptText className="text-slate-700" size={22} />
              </div>

              <div className="mt-5 grid gap-4">
                {operations.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-4">
                      <div className="flex items-start gap-4">
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                          <Icon size={22} />
                        </span>
                        <div>
                          <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                          <p className="mt-2 text-sm leading-6 text-slate-500">{item.desc}</p>
                          <p className="mt-3 text-sm font-semibold text-emerald-700">{item.metric}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Dashboard Analytics</h3>
                <p className="text-sm text-slate-500">
                  Snapshot of receipts, payments, cash, bank, and tax progress.
                </p>
              </div>
              <BadgeCheck className="text-slate-700" size={22} />
            </div>

            <div className="mt-5 space-y-4">
              {[
                { label: "Income Collection", value: 82, color: "bg-emerald-500" },
                { label: "Expense Utilization", value: 61, color: "bg-amber-500" },
                { label: "Bank Reconciliation", value: 74, color: "bg-sky-500" },
                { label: "GST & TDS Filing", value: 88, color: "bg-violet-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="text-slate-500">{item.value}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <BanknoteArrowUp className="text-emerald-700" size={18} />
                  <p className="text-sm font-semibold text-slate-900">Receipt Stream</p>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">1,248 txns</p>
                <p className="mt-2 text-sm text-slate-500">Cash, bank, and UPI receipts in current cycle.</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <BanknoteArrowDown className="text-rose-700" size={18} />
                  <p className="text-sm font-semibold text-slate-900">Payment Stream</p>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">642 txns</p>
                <p className="mt-2 text-sm text-slate-500">Vendor, payroll, and branch operating payments.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Admin Controls & Audit Logs</h3>
                <p className="text-sm text-slate-500">
                  Governance tools for secure access, workflow approvals, and historical verification.
                </p>
              </div>
              <ShieldCheck className="text-slate-700" size={22} />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[24px] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                  Governance
                </p>
                <div className="mt-4 space-y-3">
                  {adminControls.map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {auditItems.map((item) => (
                  <div key={item.action} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={18} />
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{item.action}</h4>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{item.note}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Audit Logs</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">2,486</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Branches</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">03</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Exports</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">PDF / XLS</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Account;
