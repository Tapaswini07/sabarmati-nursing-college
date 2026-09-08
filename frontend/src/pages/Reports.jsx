import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Award,
  BellRing,
  Building2,
  CalendarRange,
  CheckCircle2,
  Download,
  FileBadge2,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  Landmark,
  LoaderCircle,
  Printer,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Logo from "../assets/Logo.png";
import { apiRequest } from "../config/api";
import { downloadStudentLetterPdf } from "../utils/pdfLetters";
import { downloadMoneyReceiptPdf } from "../utils/receiptPdf";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const reportTabs = [
  { id: "ledger", label: "Student Ledger" },
  { id: "receipt", label: "Fee Receipt" },
  { id: "outstanding", label: "Outstanding" },
  { id: "statements", label: "Financial Statements" },
  { id: "demand", label: "Demand Letters" },
  { id: "bonafide", label: "Bonafide Certificates" },
  { id: "scholarship", label: "Scholarship Reports" },
  { id: "refund", label: "Refund Reports" },
];

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function inferDepartment(course = "") {
  const value = String(course).toLowerCase();

  if (value.includes("nursing")) {
    return "Nursing";
  }
  if (value.includes("polytechnic") || value.includes("engineering") || value.includes("b.tech")) {
    return "Engineering";
  }
  if (value.includes("dmlt") || value.includes("lab") || value.includes("medical")) {
    return "Allied Health";
  }
  if (value.includes("mba") || value.includes("management") || value.includes("bba")) {
    return "Management";
  }
  if (value.includes("b.com") || value.includes("commerce")) {
    return "Commerce";
  }
  if (value.includes("b.sc") || value.includes("science")) {
    return "Science";
  }
  if (value.includes("ba") || value.includes("arts")) {
    return "Arts";
  }

  return "General";
}

function downloadCsv(filename, rows) {
  if (!rows.length) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const escaped = String(value).replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ];

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadReceiptPdf(student, payment) {
  await downloadMoneyReceiptPdf({ payment, student });
}

async function downloadLetterPdf(student, type) {
  await downloadStudentLetterPdf({ student, type });
}

function normalizeStudent(student = {}) {
  return {
    ...student,
    studentName: student.studentName || student.fullName || "Student",
    department: student.department || inferDepartment(student.course),
    scholarshipAmount: Number(student.scholarshipAmount || 0),
    scholarshipStatus: student.scholarshipStatus || "Not Applied",
    paidAmount: Number(student.paidAmount || 0),
    pendingAmount: Number(student.pendingAmount || 0),
    totalFee: Number(student.totalFee || 0),
    totalFine: Number(student.totalFine || 0),
    totalDiscount: Number(student.totalDiscount || 0),
    refunds: Array.isArray(student.refunds) ? student.refunds : [],
    paymentHistory: Array.isArray(student.paymentHistory) ? student.paymentHistory : [],
    ledgerEntries: Array.isArray(student.ledgerEntries) ? student.ledgerEntries : [],
  };
}

function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const isValidInitialTab = reportTabs.some((tab) => tab.id === initialTab);
  const [activeTab, setActiveTab] = useState(isValidInitialTab ? initialTab : "ledger");
  const [search, setSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [dateRange, setDateRange] = useState("Financial Year");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [reports, setReports] = useState(null);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && reportTabs.some((tab) => tab.id === tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [summaryResponse, reportsResponse] = await Promise.all([
          apiRequest("/api/students/fees/summary"),
          apiRequest("/api/students/fees/reports"),
        ]);

        if (ignore) {
          return;
        }

        setSummary(summaryResponse.overview || null);
        setStudents(
          Array.isArray(summaryResponse.students)
            ? summaryResponse.students.map(normalizeStudent)
            : []
        );
        setReports(reportsResponse.reports || null);
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message);
          setSummary(null);
          setStudents([]);
          setReports(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, []);

  const studentOptions = useMemo(
    () => ["All", ...students.map((student) => student.studentName)],
    [students]
  );
  const courseOptions = useMemo(
    () => ["All", ...new Set(students.map((student) => student.course).filter(Boolean))],
    [students]
  );
  const departmentOptions = useMemo(
    () => ["All", ...new Set(students.map((student) => student.department).filter(Boolean))],
    [students]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        search.trim() === "" ||
        [
          student.studentName,
          student.registrationNo,
          student.course,
          student.department,
          student.paymentHistory?.[0]?.receiptNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStudent =
        studentFilter === "All" || student.studentName === studentFilter;
      const matchesCourse =
        courseFilter === "All" || student.course === courseFilter;
      const matchesDepartment =
        departmentFilter === "All" || student.department === departmentFilter;

      return matchesSearch && matchesStudent && matchesCourse && matchesDepartment;
    });
  }, [courseFilter, departmentFilter, search, studentFilter, students]);

  const selectedStudent = filteredStudents[0] || null;
  const selectedReceipt = selectedStudent?.paymentHistory?.[0] || null;

  const visibleSummary = useMemo(() => {
    if (!filteredStudents.length) {
      return {
        totalFeeCollection: 0,
        totalOutstanding: 0,
        totalRefunds: 0,
        scholarshipSummary: 0,
      };
    }

    return {
      totalFeeCollection: filteredStudents.reduce((sum, student) => sum + student.paidAmount, 0),
      totalOutstanding: filteredStudents.reduce((sum, student) => sum + student.pendingAmount, 0),
      totalRefunds: filteredStudents.reduce(
        (sum, student) =>
          sum +
          student.refunds.reduce((refundSum, refund) => refundSum + Number(refund.amount || 0), 0),
        0
      ),
      scholarshipSummary: filteredStudents.reduce(
        (sum, student) => sum + student.scholarshipAmount,
        0
      ),
    };
  }, [filteredStudents]);

  const ledgerRows = useMemo(() => {
    return filteredStudents.flatMap((student) =>
      student.ledgerEntries.map((entry) => ({
        key: entry.entryId,
        studentName: student.studentName,
        registrationNo: student.registrationNo,
        department: student.department,
        title: entry.title,
        type: entry.entryType,
        amount: Number(entry.amount || 0),
        dueAmount: student.pendingAmount,
        date: entry.entryDate,
      }))
    );
  }, [filteredStudents]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(ledgerRows.length / pageSize));
  const currentPageRows = ledgerRows.slice((page - 1) * pageSize, page * pageSize);

  const outstandingRows = useMemo(() => {
    return filteredStudents
      .filter((student) => student.pendingAmount > 0)
      .sort((a, b) => b.pendingAmount - a.pendingAmount);
  }, [filteredStudents]);

  const scholarshipRows = useMemo(() => {
    return filteredStudents.filter((student) => student.scholarshipAmount > 0);
  }, [filteredStudents]);

  const refundRows = useMemo(() => {
    return filteredStudents.flatMap((student) =>
      student.refunds.map((refund) => ({
        key: refund.refundNumber,
        studentName: student.studentName,
        registrationNo: student.registrationNo,
        department: student.department,
        amount: Number(refund.amount || 0),
        reason: refund.reason || "Fee refund",
        status: refund.status || "Processed",
        paymentMode: refund.reference || "Reference available",
        refundDate: refund.refundDate,
      }))
    );
  }, [filteredStudents]);

  const analytics = useMemo(() => {
    const collected = visibleSummary.totalFeeCollection;
    const outstanding = visibleSummary.totalOutstanding;
    const refunds = visibleSummary.totalRefunds;
    const scholarships = visibleSummary.scholarshipSummary;
    const total = collected + outstanding + refunds + scholarships || 1;

    return [
      {
        label: "Collection",
        value: collected,
        width: `${(collected / total) * 100}%`,
        color: "bg-blue-600",
      },
      {
        label: "Outstanding",
        value: outstanding,
        width: `${(outstanding / total) * 100}%`,
        color: "bg-amber-500",
      },
      {
        label: "Refunds",
        value: refunds,
        width: `${(refunds / total) * 100}%`,
        color: "bg-rose-500",
      },
      {
        label: "Scholarships",
        value: scholarships,
        width: `${(scholarships / total) * 100}%`,
        color: "bg-slate-600",
      },
    ];
  }, [visibleSummary]);

  const financialStatements = useMemo(() => {
    const income = visibleSummary.totalFeeCollection;
    const refunds = visibleSummary.totalRefunds;
    const receivable = visibleSummary.totalOutstanding;
    const discounts = filteredStudents.reduce((sum, student) => sum + student.totalDiscount, 0);
    const fines = filteredStudents.reduce((sum, student) => sum + student.totalFine, 0);

    return [
      {
        title: "Balance Sheet",
        primary: `Assets ${formatCurrency(income + receivable)}`,
        secondary: `Receivables ${formatCurrency(receivable)}`,
      },
      {
        title: "Income & Expenditure",
        primary: `Income ${formatCurrency(income + fines)}`,
        secondary: `Discounts ${formatCurrency(discounts)}`,
      },
      {
        title: "Receipt & Payment",
        primary: `Receipts ${formatCurrency(income)}`,
        secondary: `Refunds ${formatCurrency(refunds)}`,
      },
      {
        title: "Trial Balance",
        primary: `Credits ${formatCurrency(income)}`,
        secondary: `Debits ${formatCurrency(discounts + refunds)}`,
      },
    ];
  }, [filteredStudents, visibleSummary]);

  const exportLedger = () => {
    downloadCsv(
      "student-ledger-report.csv",
      ledgerRows.map((row) => ({
        registrationNo: row.registrationNo,
        studentName: row.studentName,
        department: row.department,
        entry: row.title,
        type: row.type,
        amount: row.amount,
        dueAmount: row.dueAmount,
        date: row.date,
      }))
    );
  };

  const exportOutstanding = () => {
    downloadCsv(
      "outstanding-report.csv",
      outstandingRows.map((student) => ({
        registrationNo: student.registrationNo,
        studentName: student.studentName,
        course: student.course,
        department: student.department,
        totalDue: student.pendingAmount,
        fineAmount: student.totalFine,
        lastPaymentDate: student.lastPaymentDate,
        deadline: student.nextDueDate,
        status: student.outstandingStatus,
      }))
    );
  };

  const exportScholarships = () => {
    downloadCsv(
      "scholarship-report.csv",
      scholarshipRows.map((student) => ({
        registrationNo: student.registrationNo,
        studentName: student.studentName,
        course: student.course,
        department: student.department,
        scholarshipAmount: student.scholarshipAmount,
        scholarshipStatus: student.scholarshipStatus,
      }))
    );
  };

  const exportRefunds = () => {
    downloadCsv("refund-report.csv", refundRows);
  };

  const exportReceipts = () => {
    downloadCsv(
      "fee-receipt-report.csv",
      filteredStudents
        .filter((student) => student.paymentHistory.length > 0)
        .map((student) => {
          const receipt = student.paymentHistory[0];
          return {
            registrationNo: student.registrationNo,
            studentName: student.studentName,
            course: student.course,
            department: student.department,
            receiptNumber: receipt.receiptNumber,
            paymentMethod: receipt.method,
            amountPaid: receipt.amount,
            paymentDate: receipt.paymentDate,
          };
        })
    );
  };

  const reportCounts = {
    ledger: ledgerRows.length,
    receipt: filteredStudents.filter((student) => student.paymentHistory.length > 0).length,
    outstanding: outstandingRows.length,
    statements: financialStatements.length,
    demand: outstandingRows.length,
    bonafide: filteredStudents.length,
    scholarship: scholarshipRows.length,
    refund: refundRows.length,
  };

  const activeDatasetLabel = reportTabs.find((tab) => tab.id === activeTab)?.label || "Reports";

  const changeTab = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tabId);
    setSearchParams(nextParams);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "ledger":
        return (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Student Ledger Report</h3>
                <p className="text-sm text-slate-500">
                  Live ledger rows from student fee records with debit, credit, fine, and refund movement.
                </p>
              </div>
              <button
                type="button"
                onClick={exportLedger}
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
                    <th className="px-3 py-3 font-semibold">Student</th>
                    <th className="px-3 py-3 font-semibold">Department</th>
                    <th className="px-3 py-3 font-semibold">Entry</th>
                    <th className="px-3 py-3 font-semibold">Type</th>
                    <th className="px-3 py-3 font-semibold">Amount</th>
                    <th className="px-3 py-3 font-semibold">Due</th>
                    <th className="px-3 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageRows.length ? (
                    currentPageRows.map((row) => (
                      <tr key={row.key} className="border-b border-slate-100">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{row.studentName}</p>
                          <p className="text-xs text-slate-500">{row.registrationNo}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{row.department}</td>
                        <td className="px-3 py-3 text-slate-700">{row.title}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {row.type}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-900">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="px-3 py-3 text-slate-700">{formatCurrency(row.dueAmount)}</td>
                        <td className="px-3 py-3 text-slate-700">{formatDate(row.date)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-3 py-8 text-center text-slate-500">
                        No ledger rows found for the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        );
      case "receipt":
        return (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Fee Receipt Report</h3>
                <p className="text-sm text-slate-500">
                  Student details, receipt number, payment method, amount, date, and logo.
                </p>
              </div>
              <ReceiptText className="text-blue-600" size={22} />
            </div>

            {selectedStudent && selectedReceipt ? (
              <div className="mt-5 rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                      Receipt Preview
                    </p>
                    <h4 className="mt-2 text-lg font-bold text-slate-900">Institution Finance Office</h4>
                    <p className="mt-1 text-sm text-slate-600">Receipt No: {selectedReceipt.receiptNumber}</p>
                  </div>
                  <img src={Logo} alt="Institution logo" className="h-12 w-12 rounded-2xl object-contain" />
                </div>
                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-slate-500">Student</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedStudent.studentName}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-slate-500">Course</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedStudent.course}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-slate-500">Payment Method</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedReceipt.method}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-slate-500">Amount Paid</p>
                    <p className="mt-1 font-semibold text-slate-900">{formatCurrency(selectedReceipt.amount)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadReceiptPdf(selectedStudent, selectedReceipt)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Download size={16} />
                    Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={exportReceipts}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    <FileSpreadsheet size={16} />
                    Export Excel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No receipt records available for the current student filters.
              </div>
            )}
          </div>
        );
      case "outstanding":
        return (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Outstanding Report</h3>
                <p className="text-sm text-slate-500">
                  Student-wise pending dues, fine amounts, and payment reminders.
                </p>
              </div>
              <button
                type="button"
                onClick={exportOutstanding}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Download size={16} />
                Export
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {outstandingRows.length ? (
                outstandingRows.map((student) => (
                  <div key={student.registrationNo} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{student.studentName}</p>
                        <p className="text-xs text-slate-500">
                          {student.course} • {student.department}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700">
                        {student.outstandingStatus}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Due</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(student.pendingAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Fine Amount</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(student.totalFine)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Last Payment</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{formatDate(student.lastPaymentDate)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => downloadLetterPdf(student, "demand")}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
                      >
                        <BellRing size={14} />
                        Generate Reminder
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                      >
                        <Printer size={14} />
                        Print Summary
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  No outstanding students found for the current filters.
                </div>
              )}
            </div>
          </div>
        );
      case "statements":
        return (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Financial Statements</h3>
                <p className="text-sm text-slate-500">
                  Auto-calculated from the connected fee dataset.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {dateRange}
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {financialStatements.map((statement) => (
                <div key={statement.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{statement.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{statement.primary}</p>
                      <p className="mt-1 text-sm text-slate-500">{statement.secondary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={exportLedger}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Export
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "demand":
        return (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Demand Letter Generation</h3>
                <p className="text-sm text-slate-500">
                  Generate the institution demand-letter format with student academic details.
                </p>
              </div>
              <Wallet className="text-amber-500" size={22} />
            </div>

            {selectedStudent ? (
              <div className="mt-5 rounded-[24px] border border-amber-100 bg-amber-50 p-5">
                <p className="text-sm leading-7 text-slate-700">
                  The downloaded PDF uses the DEMAND-LETTER layout with institution letterhead,
                  student name, parent details, admission number, roll number, course, academic year,
                  issue date, and principal signature.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadLetterPdf(selectedStudent, "demand")}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                  >
                    <Download size={16} />
                    Download Demand Letter
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    <Printer size={16} />
                    Print Letter
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No student found for demand letter generation.
              </div>
            )}
          </div>
        );
      case "bonafide":
        return (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Bonafide Certificate</h3>
                <p className="text-sm text-slate-500">
                  Generate the bonafide certificate format with fee-ledger details.
                </p>
              </div>
              <FileBadge2 className="text-emerald-600" size={22} />
            </div>

            {selectedStudent ? (
              <div className="mt-5 rounded-[24px] border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-sm leading-7 text-slate-700">
                  The downloaded PDF uses the BONAFIDE CERTIFICATE layout with institution,
                  student name, admission number, course, admission batch, current year, due date,
                  fee breakup, due amount, and principal signature.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadLetterPdf(selectedStudent, "bonafide")}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 target:-_blank"
                  >
                    <Download size={16} />
                    Download Bonafide Certificate 
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <Printer size={16} />
                    Print Certificate
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No student found for certificate generation.
              </div>
            )}
          </div>
        );
      case "scholarship":
        return (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Scholarship Reports</h3>
                <p className="text-sm text-slate-500">
                  Department-wise and student-wise scholarship tracking.
                </p>
              </div>
              <button
                type="button"
                onClick={exportScholarships}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Award size={16} />
                Export
              </button>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Student</th>
                    <th className="px-3 py-3 font-semibold">Department</th>
                    <th className="px-3 py-3 font-semibold">Amount</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scholarshipRows.length ? (
                    scholarshipRows.map((student) => (
                      <tr key={student.registrationNo} className="border-b border-slate-100">
                        <td className="px-3 py-3 font-medium text-slate-900">{student.studentName}</td>
                        <td className="px-3 py-3 text-slate-700">{student.department}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900">
                          {formatCurrency(student.scholarshipAmount)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {student.scholarshipStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-3 py-8 text-center text-slate-500">
                        No scholarship records are available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "refund":
        return (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Refund Reports</h3>
                <p className="text-sm text-slate-500">
                  Refund amount, reason, status, and reference mode.
                </p>
              </div>
              <button
                type="button"
                onClick={exportRefunds}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <RefreshCcw size={16} />
                Export
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {refundRows.length ? (
                refundRows.map((refund) => (
                  <div key={refund.key} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{refund.studentName}</p>
                        <p className="text-xs text-slate-500">{refund.reason}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700">
                        {refund.status}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Refund Amount</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(refund.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reference</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{refund.paymentMode}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Refund Date</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{formatDate(refund.refundDate)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  No refund records found.
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_28%),linear-gradient(180deg,#eff6ff_0%,#f8fafc_50%,#edf2f7_100%)] p-4 md:p-6 lg:p-8">
      <div className="page-enter mx-auto max-w-[1600px] space-y-6">
        <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
          <div className="relative p-6 md:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_25%),radial-gradient(circle_at_bottom_left,_rgba(148,163,184,0.12),_transparent_28%)]" />
            <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_56%,#2563eb_100%)] p-6 text-white shadow-[0_24px_70px_rgba(30,64,175,0.28)] md:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                    <ShieldCheck size={14} />
                    Reports & Certificate
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-slate-100">
                    <Building2 size={14} />
                    Live Backend Connected
                  </span>
                </div>

                <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                  Professional reporting center for finance, receipts, certificates, and dues.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
                  Track live student fee activity, export official reports, and generate PDF-ready
                  documents from the connected fee backend.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                      Total Collection
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {formatCurrency(visibleSummary.totalFeeCollection)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                      Total Outstanding
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {formatCurrency(visibleSummary.totalOutstanding)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                      Total Refunds
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {formatCurrency(visibleSummary.totalRefunds)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                      Scholarship Summary
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {formatCurrency(visibleSummary.scholarshipSummary)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                        Dashboard Controls
                      </p>
                      <h2 className="mt-3 text-2xl font-bold text-slate-900">
                        Role-based reporting access
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Built for accounts, department heads, and institutional administrators with
                        export, print, and analytics actions.
                      </p>
                    </div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Landmark size={22} />
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["Super Admin", "Accounts", "Department Head", "Principal"].map((role) => (
                      <span
                        key={role}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_100%)] p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                    Active Scope
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-3xl font-black text-slate-900">{dateRange}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {filteredStudents.length} students matched in {activeDatasetLabel}.
                      </p>
                    </div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                      <CalendarRange size={22} />
                    </span>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
                    Quick Actions
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={exportLedger}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      <FileSpreadsheet size={16} />
                      Excel Ledger
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedStudent && selectedReceipt && downloadReceiptPdf(selectedStudent, selectedReceipt)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      <Download size={16} />
                      PDF Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedStudent && downloadLetterPdf(selectedStudent, "demand")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      <FileBadge2 size={16} />
                      Demand Letter
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedStudent && downloadLetterPdf(selectedStudent, "bonafide")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      <FileBadge2 size={16} />
                      Bonafide Certificate
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-8 grid gap-4 rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <Search size={14} />
                    Search
                  </span>
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Student, receipt, course..."
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </label>

                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <Filter size={14} />
                    Student
                  </span>
                  <select
                    value={studentFilter}
                    onChange={(event) => {
                      setStudentFilter(event.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  >
                    {studentOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <GraduationCap size={14} />
                    Course
                  </span>
                  <select
                    value={courseFilter}
                    onChange={(event) => {
                      setCourseFilter(event.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  >
                    {courseOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <Building2 size={14} />
                    Department
                  </span>
                  <select
                    value={departmentFilter}
                    onChange={(event) => {
                      setDepartmentFilter(event.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  >
                    {departmentOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {["This Month", "This Quarter", "Financial Year", "Custom Range"].map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setDateRange(range)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        dateRange === range
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "bg-white text-slate-600 hover:bg-blue-50"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Backend reports loaded:{" "}
                  <span className="font-semibold text-slate-900">
                    {reports ? "Yes" : "No"}
                  </span>
                  {" "}• Active dataset count:{" "}
                  <span className="font-semibold text-slate-900">
                    {reportCounts[activeTab]}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-10 shadow-sm">
            <div className="flex items-center justify-center gap-3 text-slate-600">
              <LoaderCircle className="animate-spin" size={20} />
              Loading live reports from backend...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5" />
              <div>
                <p className="font-semibold">Unable to load reports</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-3">
                  {reportTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => changeTab(tab.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        activeTab === tab.id
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              {renderTabContent()}
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Financial Analytics</h3>
                    <p className="text-sm text-slate-500">
                      Filter-aware collection, due, refund, and scholarship mix.
                    </p>
                  </div>
                  <CheckCircle2 className="text-slate-700" size={22} />
                </div>

                <div className="mt-5 space-y-4">
                  {analytics.map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700">{item.label}</span>
                        <span className="text-slate-500">{formatCurrency(item.value)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} />
                      </div>
                    </div>
                  ))}
                </div>

                {summary?.monthlyRevenue?.length ? (
                  <div className="mt-6 grid grid-cols-6 gap-2">
                    {summary.monthlyRevenue.map((entry) => {
                      const maxValue = Math.max(...summary.monthlyRevenue.map((item) => item.total), 1);
                      const height = `${Math.max((entry.total / maxValue) * 100, 12)}%`;

                      return (
                        <div key={entry.label} className="flex h-32 flex-col items-center justify-end gap-2">
                          <div className="flex h-24 w-full items-end rounded-2xl bg-slate-100 p-2">
                            <div className="w-full rounded-xl bg-blue-600" style={{ height }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-500">{entry.label}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default Reports;
