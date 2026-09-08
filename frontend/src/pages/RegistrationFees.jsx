import { useCallback, useEffect, useState, useMemo } from "react";
import {
  AlertCircle,
  BadgeIndianRupee,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Edit,
  Eye,
  Filter,
  GraduationCap,
  History,
  IndianRupee,
  Layers,
  Mail,
  MessageSquare,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  UserRound,
  X,
  AlertTriangle,
  BarChart3,
  FileText,
} from "lucide-react";
import { apiRequest } from "../config/api";
import { printMoneyReceipt } from "../utils/receiptPdf";

const COURSES = [
  "B.Sc Nursing",
  "M.Sc Nursing",
  "P.B.B.Sc Nursing",
  "ANM",
  "GNM",
];

const COURSE_SEMESTERS = {
  "B.Sc Nursing": ["1st Semester", "2nd Semester", "3rd Semester", "4th Semester", "5th Semester", "6th Semester", "7th Semester", "8th Semester"],
  "M.Sc Nursing": ["1st Year", "2nd Year"],
  "P.B.B.Sc Nursing": ["1st Year", "2nd Year"],
  "ANM": ["1st Year", "2nd Year"],
  "GNM": ["1st Year", "2nd Year", "3rd Year"],
};

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque", "Online Payment"];

const ACADEMIC_YEARS = [
  "2024-2025",
  "2025-2026",
  "2026-2027",
  "2027-2028",
  "2028-2029",
];

const API_BASE = "/api/registration-fees";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const DEFAULT_FEE_FORM = {
  studentId: "",
  studentName: "",
  course: "",
  semester: "",
  academicYear: "",
  registrationFee: "",
  otherFees: "",
  studentAdjustment: "",
  adjustmentReason: "",
  lastDate: "",
  paymentMethod: "",
  paymentStatus: "Unpaid",
  paidAmount: "",
};

function toAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function calculatePayableAmount(data = {}) {
  return Math.max(
    toAmount(data.registrationFee) + toAmount(data.otherFees) + toAmount(data.studentAdjustment),
    0
  );
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });
  const queryString = query.toString();
  return queryString ? "?" + queryString : "";
}

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLegacyTodayDateString() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  return `${day}-${month}-${year}`;
}

function isTodayDate(value) {
  if (!value) return false;
  const dateText = String(value);
  return (
    dateText === getTodayDateString() ||
    dateText === getLegacyTodayDateString() ||
    dateText.slice(0, 10) === getTodayDateString()
  );
}

function getCollectedAmount(fee = {}) {
  if (Array.isArray(fee.paymentHistory) && fee.paymentHistory.length > 0) {
    return fee.paymentHistory.reduce((sum, payment) => sum + toAmount(payment.amount), 0);
  }

  const paidAmount = toAmount(fee.paidAmount);
  if (paidAmount > 0) return paidAmount;

  return fee.paymentStatus === "Paid" ? toAmount(fee.totalPayable) : 0;
}

function getTodayCollectedAmount(fee = {}) {
  if (Array.isArray(fee.paymentHistory) && fee.paymentHistory.length > 0) {
    return fee.paymentHistory.reduce((sum, payment) => {
      const paymentDate = payment.date || payment.paidDate || payment.paymentDate;
      return isTodayDate(paymentDate) ? sum + toAmount(payment.amount) : sum;
    }, 0);
  }

  const fallbackDate = fee.paymentDate || fee.paidDate || fee.updatedAt || fee.createdAt;
  return isTodayDate(fallbackDate) ? getCollectedAmount(fee) : 0;
}

function FilterSelect({ icon, value, onChange, children, label, className = "" }) {
  return (
    <label
      className={"flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[#dce7f4] bg-[#f8fbff] px-4 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition focus-within:border-teal-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-100 " + className}
    >
      {icon}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Unpaid: "bg-amber-100 text-amber-700 border-amber-200",
    Partial: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold " + (styles[status] || styles.Unpaid)}
    >
      {status === "Paid" && <CheckCircle2 className="h-3.5 w-3.5" />}
      {status === "Unpaid" && <Clock className="h-3.5 w-3.5" />}
      {status === "Partial" && <AlertCircle className="h-3.5 w-3.5" />}
      {status}
    </span>
  );
}

function StatCard({ icon, label, value, color }) {
  const Icon = icon;
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div className={"flex items-center gap-4 rounded-2xl border p-4 " + (colorClasses[color] || colorClasses.blue)}>
      <div className={"flex h-12 w-12 items-center justify-center rounded-xl " + (colorClasses[color].split(" ")[0])}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

async function printReceipt(fee) {
  const printWindow = window.open("", "_blank");
  const lastPayment = fee.paymentHistory?.[fee.paymentHistory.length - 1] || {};
  const amount = toAmount(lastPayment.amount ?? fee.paidAmount ?? fee.totalPayable ?? fee.registrationFee);
  const paymentDate = lastPayment.date || lastPayment.paymentDate || fee.paymentDate || fee.paidDate || new Date();
  const receiptNumber = lastPayment.receiptNumber || fee.receiptNumber || `REG-RCPT-${fee.studentId || "RECEIPT"}`;
  const transactionId = lastPayment.transactionId || lastPayment.paymentReference || fee.transactionId || fee.paymentReference || "-";
  const courseLabel = [fee.course, fee.semester].filter(Boolean).join(" - ");

  await printMoneyReceipt({
    student: {
      studentName: fee.studentName,
      registrationNo: fee.studentId,
      admissionNumber: fee.studentId,
      course: courseLabel || "Not available",
      academicYear: fee.academicYear || "Not available",
    },
    payment: {
      amount,
      method: lastPayment.method || fee.paymentMethod || "Cash",
      status: fee.paymentStatus === "Unpaid" ? "Pending" : "Confirmed",
      receiptNumber,
      paymentDate,
      transactionId,
      purpose: "Registration Fee Payment",
      particular: `Registration Fee - ${courseLabel || "Academic Fees"}`,
    },
    printWindow,
  });
}

export default function RegistrationFees() {
  const isSemesterCourse = (course) => !course || course === "B.Sc Nursing";

  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [academicYearFilter, setAcademicYearFilter] = useState("All");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("All");
  const [dueDateFilter, setDueDateFilter] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCollectPaymentModal, setShowCollectPaymentModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [showLateFeeModal, setShowLateFeeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [selectedFee, setSelectedFee] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FEE_FORM);
  const [selectedReportType, setSelectedReportType] = useState("");
  const [reportData, setReportData] = useState([]);
  const fetchFees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (courseFilter !== "All") params.course = courseFilter;
      if (semesterFilter !== "All") params.semester = semesterFilter;
      if (academicYearFilter !== "All") params.academicYear = academicYearFilter;
      if (statusFilter !== "All") params.paymentStatus = statusFilter;
      if (paymentMethodFilter !== "All") params.paymentMethod = paymentMethodFilter;
      if (dueDateFilter) params.dueDate = dueDateFilter;
      const response = await apiRequest.get(API_BASE + buildQuery(params));
      setFees(response.data || []);
    } catch (err) {
      console.error("Error fetching registration fees:", err);
      setError("Failed to load registration fees. Please try again.");
      setFees([]);
    } finally {
      setLoading(false);
    }
  }, [courseFilter, semesterFilter, academicYearFilter, statusFilter, paymentMethodFilter, dueDateFilter]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const handleCourseFilterChange = (val) => {
    setCourseFilter(val);
    setSemesterFilter("All");
  };

  const availableSemesters = useMemo(() => {
    if (courseFilter === "All") {
      return [
        "1st Semester", "2nd Semester", "3rd Semester", "4th Semester", "5th Semester", "6th Semester", "7th Semester", "8th Semester",
        "1st Year", "2nd Year", "3rd Year"
      ];
    }
    return COURSE_SEMESTERS[courseFilter] || [];
  }, [courseFilter]);

  const formSemesters = useMemo(
    () => (formData.course ? COURSE_SEMESTERS[formData.course] || [] : []),
    [formData.course]
  );

  const payablePreview = useMemo(() => calculatePayableAmount(formData), [formData]);

  const updateStudentFeeForm = (changes) => {
    setFormData((prev) => {
      const next = { ...prev, ...changes };
      return next;
    });
  };

  const validateFeePayload = (data) => {
    const registrationFee = Number(data.registrationFee);
    const otherFees = Number(data.otherFees || 0);
    const studentAdjustment = Number(data.studentAdjustment || 0);
    const total = registrationFee + otherFees + studentAdjustment;

    if (!Number.isFinite(registrationFee) || registrationFee < 0) {
      return "Enter a valid registration fee.";
    }
    if (!Number.isFinite(otherFees) || otherFees < 0) {
      return "Enter a valid other fees amount.";
    }
    if (!Number.isFinite(studentAdjustment)) {
      return "Enter a valid student adjustment.";
    }
    if (total <= 0) {
      return "Total payable amount must be greater than zero.";
    }
    return "";
  };

  const handleGenerateReport = async (reportType) => {
    try {
      const params = {};
      if (courseFilter !== "All") params.course = courseFilter;
      if (academicYearFilter !== "All") params.academicYear = academicYearFilter;
      const response = await apiRequest.get(API_BASE + "/reports/" + reportType + buildQuery(params));
      setReportData(response.data || []);
      setSelectedReportType(reportType);
      setShowReportModal(true);
    } catch (err) {
      console.error("Error generating report:", err);
      alert("Failed to generate report. Please try again.");
    }
  };

  const handleCollectPayment = (fee) => {
    setSelectedFee(fee);
    setShowCollectPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const formDataObj = new FormData(e.target);
    const amount = parseFloat(formDataObj.get("amount"));
    const paymentMethod = formDataObj.get("paymentMethod");
    const notes = formDataObj.get("notes");
    const pendingAmount = (selectedFee?.totalPayable || 0) - toAmount(selectedFee?.paidAmount);

    if (!Number.isFinite(amount) || amount <= 0 || amount > pendingAmount) {
      alert("Enter a valid payment amount up to the pending amount.");
      return;
    }

    try {
      const response = await apiRequest.post(API_BASE + "/" + selectedFee._id + "/payment", {
        amount,
        paymentMethod,
        notes,
      });
      const updatedFee = response.data;
      setShowCollectPaymentModal(false);
      setSelectedFee(null);
      fetchFees();
      printReceipt(updatedFee);
    } catch (err) {
      console.error("Error recording payment:", err);
      alert("Failed to record payment. Please try again.");
    }
  };

  const handleAddInstallment = async (e) => {
    e.preventDefault();
    const formDataObj = new FormData(e.target);
    const amount = parseFloat(formDataObj.get("amount"));
    const dueDate = formDataObj.get("dueDate");

    if (!Number.isFinite(amount) || amount <= 0 || !dueDate) {
      alert("Enter a valid installment amount and due date.");
      return;
    }

    try {
      await apiRequest.post(API_BASE + "/" + selectedFee._id + "/installments", { amount, dueDate });
      setShowInstallmentModal(false);
      setSelectedFee(null);
      fetchFees();
      alert("Installment added successfully!");
    } catch (err) {
      console.error("Error adding installment:", err);
      alert("Failed to add installment. Please try again.");
    }
  };

  const handleApplyLateFee = async (e) => {
    e.preventDefault();
    const formDataObj = new FormData(e.target);
    const lateFeeAmount = parseFloat(formDataObj.get("lateFeeAmount"));

    if (!Number.isFinite(lateFeeAmount) || lateFeeAmount <= 0) {
      alert("Enter a valid late fee amount.");
      return;
    }

    try {
      await apiRequest.post(API_BASE + "/" + selectedFee._id + "/late-fee", { lateFeeAmount });
      setShowLateFeeModal(false);
      setSelectedFee(null);
      fetchFees();
      alert("Late fee applied successfully!");
    } catch (err) {
      console.error("Error applying late fee:", err);
      alert("Failed to apply late fee. Please try again.");
    }
  };

  const filteredFees = useMemo(() => {
    let filtered = fees;

    if (searchQuery) {
      filtered = filtered.filter(
        (fee) =>
          normalizeText(fee.studentId).includes(normalizeText(searchQuery)) ||
          normalizeText(fee.studentName).includes(normalizeText(searchQuery))
      );
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter((fee) => fee.paymentStatus === statusFilter);
    }

    if (courseFilter !== "All") {
      filtered = filtered.filter((fee) => fee.course === courseFilter);
    }

    if (semesterFilter !== "All") {
      filtered = filtered.filter((fee) => fee.semester === semesterFilter);
    }

    return filtered;
  }, [fees, searchQuery, statusFilter, courseFilter, semesterFilter]);

  const statistics = useMemo(() => {
    const total = fees.length;
    const paid = fees.filter((f) => f.paymentStatus === "Paid").length;
    const pending = fees.filter((f) => f.paymentStatus === "Unpaid").length;
    const totalCollection = fees.reduce((sum, f) => sum + getCollectedAmount(f), 0);
    const todayCollection = fees.reduce((sum, f) => sum + getTodayCollectedAmount(f), 0);
    return { total, paid, pending, totalCollection, todayCollection };
  }, [fees]);

  const handleAddFee = async (e) => {
    e.preventDefault();
    const validationError = validateFeePayload(formData);
    if (validationError) {
      alert(validationError);
      return;
    }
    try {
      await apiRequest.post(API_BASE, {
        ...formData,
        registrationFee: Number(formData.registrationFee),
        otherFees: Number(formData.otherFees || 0),
        studentAdjustment: Number(formData.studentAdjustment || 0),
      });
      setShowAddModal(false);
      setFormData(DEFAULT_FEE_FORM);
      fetchFees();
    } catch (err) {
      console.error("Error adding registration fee:", err);
      alert("Failed to add registration fee. Please try again.");
    }
  };

  const handleEditFee = async (e) => {
    e.preventDefault();
    const validationError = validateFeePayload(formData);
    if (validationError) {
      alert(validationError);
      return;
    }
    try {
      await apiRequest.put(API_BASE + "/" + selectedFee._id, {
        ...formData,
        registrationFee: Number(formData.registrationFee),
        otherFees: Number(formData.otherFees || 0),
        studentAdjustment: Number(formData.studentAdjustment || 0),
      });
      setShowEditModal(false);
      setSelectedFee(null);
      fetchFees();
    } catch (err) {
      console.error("Error updating registration fee:", err);
      alert("Failed to update registration fee. Please try again.");
    }
  };

  const handleDeleteFee = async (id) => {
    if (!window.confirm("Are you sure you want to delete this registration fee?")) return;
    try {
      await apiRequest.delete(API_BASE + "/" + id);
      fetchFees();
    } catch (err) {
      console.error("Error deleting registration fee:", err);
      alert("Failed to delete registration fee. Please try again.");
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await apiRequest.get(API_BASE + "/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "registration_fees.xls");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting data:", err);
      alert("Failed to export data. Please try again.");
    }
  };

  const handleSendReminder = async (fee, type = "email") => {
    try {
      await apiRequest.post(API_BASE + "/" + fee._id + "/reminder", { type });
      alert((type === "email" ? "Email" : "SMS") + " reminder sent successfully!");
    } catch (err) {
      console.error("Error sending reminder:", err);
      alert("Failed to send " + type + " reminder. Please try again.");
    }
  };

  const openEditModal = (fee) => {
    setSelectedFee(fee);
    setFormData({
      studentId: fee.studentId,
      studentName: fee.studentName,
      course: fee.course,
      semester: fee.semester || "",
      academicYear: fee.academicYear || "",
      registrationFee: fee.registrationFee ?? fee.baseRegistrationFee ?? "",
      otherFees: fee.otherFees || "",
      studentAdjustment: fee.studentAdjustment || "",
      adjustmentReason: fee.adjustmentReason || "",
      lastDate: fee.lastDate,
      paymentMethod: fee.paymentMethod,
      paymentStatus: fee.paymentStatus,
      paidAmount: fee.paidAmount || "",
    });
    setShowEditModal(true);
  };

  const openViewModal = (fee) => {
    setSelectedFee(fee);
    setShowViewModal(true);
  };

  const openHistoryModal = (fee) => {
    setSelectedFee(fee);
    setShowHistoryModal(true);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <RefreshCcw className="mx-auto h-12 w-12 animate-spin text-teal-600" />
          <p className="mt-4 text-slate-600">Loading registration fees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Registration Fees</h1>
          <p className="text-slate-600">Manage student registration fees, adjustments, and payments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setFormData(DEFAULT_FEE_FORM);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Add Student Fee
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <BarChart3 className="h-4 w-4" />
            Reports
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard icon={UserRound} label="Total Students" value={statistics.total} color="blue" />
        <StatCard icon={CheckCircle2} label="Paid" value={statistics.paid} color="green" />
        <StatCard icon={Clock} label="Pending" value={statistics.pending} color="amber" />
        <StatCard icon={BadgeIndianRupee} label="Total Collection" value={currencyFormatter.format(statistics.totalCollection)} color="purple" />
        <StatCard icon={Calendar} label="Today Collection" value={currencyFormatter.format(statistics.todayCollection)} color="blue" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Student ID or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 w-full rounded-2xl border border-[#dce7f4] bg-[#f8fbff] pl-12 pr-4 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100 outline-none"
          />
        </div>
        <FilterSelect icon={<Filter className="h-5 w-5 text-slate-400" />} value={statusFilter} onChange={setStatusFilter} label="Status Filter">
          <option value="All">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Partial">Partial</option>
        </FilterSelect>
        <FilterSelect icon={<GraduationCap className="h-5 w-5 text-slate-400" />} value={courseFilter} onChange={handleCourseFilterChange} label="Course Filter">
          <option value="All">All Courses</option>
          {COURSES.map((course) => (
            <option key={course} value={course}>{course}</option>
          ))}
        </FilterSelect>
        <FilterSelect icon={<Layers className="h-5 w-5 text-slate-400" />} value={semesterFilter} onChange={setSemesterFilter} label={courseFilter === "All" ? "Semester/Year Filter" : isSemesterCourse(courseFilter) ? "Semester Filter" : "Year Filter"}>
          <option value="All">{courseFilter === "All" ? "All Semesters/Years" : isSemesterCourse(courseFilter) ? "All Semesters" : "All Years"}</option>
          {availableSemesters.map((semester) => (
            <option key={semester} value={semester}>{semester}</option>
          ))}
        </FilterSelect>
        <FilterSelect icon={<Calendar className="h-5 w-5 text-slate-400" />} value={academicYearFilter} onChange={setAcademicYearFilter} label="Academic Year">
          <option value="All">All Years</option>
          {ACADEMIC_YEARS.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </FilterSelect>
        <FilterSelect icon={<CreditCard className="h-5 w-5 text-slate-400" />} value={paymentMethodFilter} onChange={setPaymentMethodFilter} label="Payment Method">
          <option value="All">All Methods</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>{method}</option>
          ))}
        </FilterSelect>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            placeholder="Due Date"
            value={dueDateFilter}
            onChange={(e) => setDueDateFilter(e.target.value)}
            className="h-12 w-full rounded-2xl border border-[#dce7f4] bg-[#f8fbff] pl-12 pr-4 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Student ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Student Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Course</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Semester</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Payable</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Last Date</th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredFees.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">No registration fees found</td>
              </tr>
            ) : (
              filteredFees.map((fee) => (
                <tr key={fee._id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{fee.studentId}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{fee.studentName}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{fee.course}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{fee.semester || "-"}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    {currencyFormatter.format(fee.totalPayable || fee.registrationFee || 0)}
                    {toAmount(fee.studentAdjustment) !== 0 && (
                      <span className="mt-1 block text-xs font-medium text-teal-600">Custom adjusted</span>
                    )}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={fee.paymentStatus} /></td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {fee.lastDate ? new Date(fee.lastDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openViewModal(fee)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-600" title="View Details">
                        <Eye className="h-4 w-4" />
                      </button>
                      {fee.paymentStatus !== "Paid" && (
                        <button onClick={() => handleCollectPayment(fee)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-green-600" title="Collect Payment">
                          <DollarSign className="h-4 w-4" />
                        </button>
                      )}
                      {fee.paymentStatus === "Paid" && (
                        <button onClick={() => printReceipt(fee)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-600" title="Print Receipt">
                          <Printer className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => openEditModal(fee)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-600" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setSelectedFee(fee); setShowInstallmentModal(true); }} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-600" title="Add Installment">
                        <Layers className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setSelectedFee(fee); setShowLateFeeModal(true); }} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-orange-600" title="Apply Late Fee">
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteFee(fee._id)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => openHistoryModal(fee)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-600" title="Payment History">
                        <History className="h-4 w-4" />
                      </button>
                      {fee.paymentStatus === "Unpaid" && (
                        <>
                          <button onClick={() => handleSendReminder(fee, "email")} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-600" title="Send Email Reminder">
                            <Mail className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleSendReminder(fee, "sms")} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-green-600" title="Send SMS Reminder">
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Add Student Registration Fee</h2>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddFee} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Student ID</label>
                  <input type="text" required value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Student Name</label>
                  <input type="text" required value={formData.studentName} onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Course</label>
                  <select required value={formData.course} onChange={(e) => updateStudentFeeForm({ course: e.target.value, semester: "" })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none">
                    <option value="">Select Course</option>
                    {COURSES.map((course) => (<option key={course} value={course}>{course}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Semester</label>
                  <select required value={formData.semester} onChange={(e) => updateStudentFeeForm({ semester: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none">
                    <option value="">Select Semester</option>
                    {formSemesters.map((semester) => (<option key={semester} value={semester}>{semester}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Registration Fee</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="number" required min="0" value={formData.registrationFee} onChange={(e) => setFormData({ ...formData, registrationFee: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Other Applicable Fees</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="number" min="0" value={formData.otherFees} onChange={(e) => setFormData({ ...formData, otherFees: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Student Custom Adjustment</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="number" value={formData.studentAdjustment} onChange={(e) => setFormData({ ...formData, studentAdjustment: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Adjustment Reason</label>
                  <input type="text" value={formData.adjustmentReason} onChange={(e) => setFormData({ ...formData, adjustmentReason: e.target.value })}
                    placeholder="Optional note for student-specific change"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                </div>
              </div>
              <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Total Payable</p>
                <p className="mt-1 text-xl font-bold text-teal-955">{currencyFormatter.format(payablePreview)}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Academic Year</label>
                  <select value={formData.academicYear || ""} onChange={(e) => updateStudentFeeForm({ academicYear: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none">
                    <option value="">Select Academic Year</option>
                    {ACADEMIC_YEARS.map((year) => (<option key={year} value={year}>{year}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Last Date</label>
                  <input type="date" required value={formData.lastDate} onChange={(e) => setFormData({ ...formData, lastDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment Status</label>
                  <select value={formData.paymentStatus} onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none">
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
                {formData.paymentStatus !== "Unpaid" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment Method</label>
                    <select value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none">
                      <option value="">Select Payment Method</option>
                      {PAYMENT_METHODS.map((method) => (<option key={method} value={method}>{method}</option>))}
                    </select>
                  </div>
                )}
                {formData.paymentStatus === "Partial" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Paid Amount</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input type="number" min="1" value={formData.paidAmount} onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">Add Fee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Edit Registration Fee</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedFee(null); }} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditFee} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Student ID</label>
                  <input type="text" required value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Student Name</label>
                  <input type="text" required value={formData.studentName} onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Course</label>
                  <select required value={formData.course} onChange={(e) => updateStudentFeeForm({ course: e.target.value, semester: "" })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none">
                    <option value="">Select Course</option>
                    {COURSES.map((course) => (<option key={course} value={course}>{course}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Semester</label>
                  <select required value={formData.semester} onChange={(e) => updateStudentFeeForm({ semester: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none">
                    <option value="">Select Semester</option>
                    {formSemesters.map((semester) => (<option key={semester} value={semester}>{semester}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Registration Fee</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="number" required min="0" value={formData.registrationFee} onChange={(e) => setFormData({ ...formData, registrationFee: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Other Fees</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="number" min="0" value={formData.otherFees} onChange={(e) => setFormData({ ...formData, otherFees: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Student Adjustment</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="number" value={formData.studentAdjustment} onChange={(e) => setFormData({ ...formData, studentAdjustment: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Adjustment Reason</label>
                  <input type="text" value={formData.adjustmentReason} onChange={(e) => setFormData({ ...formData, adjustmentReason: e.target.value })}
                    placeholder="Optional note"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                </div>
              </div>
              <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Total Payable</p>
                <p className="mt-1 text-xl font-bold text-teal-955">{currencyFormatter.format(payablePreview)}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Academic Year</label>
                  <select value={formData.academicYear || ""} onChange={(e) => updateStudentFeeForm({ academicYear: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none">
                    <option value="">Select Academic Year</option>
                    {ACADEMIC_YEARS.map((year) => (<option key={year} value={year}>{year}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Last Date</label>
                  <input type="date" required value={formData.lastDate} onChange={(e) => setFormData({ ...formData, lastDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment Method</label>
                  <select value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none">
                    <option value="">Select Payment Method</option>
                    {PAYMENT_METHODS.map((method) => (<option key={method} value={method}>{method}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment Status</label>
                  <select value={formData.paymentStatus} onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none">
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setSelectedFee(null); }} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">Update Fee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Registration Fee Details</h2>
              <button onClick={() => { setShowViewModal(false); setSelectedFee(null); }} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs font-medium text-slate-500">Student ID</p><p className="text-sm font-semibold text-slate-950">{selectedFee.studentId}</p></div>
                <div><p className="text-xs font-medium text-slate-500">Student Name</p><p className="text-sm font-semibold text-slate-955">{selectedFee.studentName}</p></div>
                <div><p className="text-xs font-medium text-slate-500">Course</p><p className="text-sm font-semibold text-slate-955">{selectedFee.course}</p></div>
                <div><p className="text-xs font-medium text-slate-500">Semester</p><p className="text-sm font-semibold text-slate-955">{selectedFee.semester || "-"}</p></div>
                <div><p className="text-xs font-medium text-slate-500">Registration Fee</p><p className="text-sm font-semibold text-slate-955">{currencyFormatter.format(selectedFee.registrationFee || selectedFee.baseRegistrationFee || 0)}</p></div>
                <div><p className="text-xs font-medium text-slate-500">Other Fees</p><p className="text-sm font-semibold text-slate-955">{currencyFormatter.format(selectedFee.otherFees || 0)}</p></div>
                <div><p className="text-xs font-medium text-slate-500">Student Adjustment</p><p className="text-sm font-semibold text-slate-955">{currencyFormatter.format(selectedFee.studentAdjustment || 0)}</p></div>
                <div><p className="text-xs font-medium text-slate-500">Total Payable</p><p className="text-sm font-semibold text-slate-955">{currencyFormatter.format(selectedFee.totalPayable || selectedFee.registrationFee || 0)}</p></div>
                <div><p className="text-xs font-medium text-slate-500">Last Date</p><p className="text-sm font-semibold text-slate-955">{selectedFee.lastDate ? new Date(selectedFee.lastDate).toLocaleDateString() : "-"}</p></div>
                <div><p className="text-xs font-medium text-slate-500">Payment Status</p><StatusBadge status={selectedFee.paymentStatus} /></div>
                <div><p className="text-xs font-medium text-slate-500">Payment Method</p><p className="text-sm font-semibold text-slate-955">{selectedFee.paymentMethod || "-"}</p></div>
              </div>
              {selectedFee.paymentStatus === "Paid" && (
                <button onClick={() => printReceipt(selectedFee)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">
                  <Printer className="h-4 w-4" /> Print Money Receipt
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showHistoryModal && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Payment History</h2>
              <button onClick={() => { setShowHistoryModal(false); setSelectedFee(null); }} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Student</p>
                <p className="text-sm font-semibold text-slate-955">{selectedFee.studentName} ({selectedFee.studentId})</p>
                <p className="mt-2 text-xs font-medium text-slate-500">Total Payable</p>
                <p className="text-sm font-semibold text-slate-955">{currencyFormatter.format(selectedFee.totalPayable || selectedFee.registrationFee || 0)}</p>
              </div>
              {(selectedFee.paymentHistory || []).length > 0 ? (
                <div className="space-y-3">
                  {selectedFee.paymentHistory.map((item) => (
                    <div key={item.receiptNumber || item.date + "-" + item.amount} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-955">{item.receiptNumber || "Receipt"}</p>
                        <p className="text-sm font-bold text-slate-955">{currencyFormatter.format(item.amount || 0)}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.date || "-"} | {item.method || "N/A"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-slate-500">No payment history yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {showCollectPaymentModal && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Collect Payment</h2>
              <button onClick={() => { setShowCollectPaymentModal(false); setSelectedFee(null); }} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-5 rounded-xl bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-955">{selectedFee.studentName}</p>
              <p className="mt-1 text-slate-600">{selectedFee.course} | {selectedFee.semester || "-"}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div><p className="text-xs text-slate-500">Total Payable</p><p className="font-bold text-slate-955">{currencyFormatter.format(selectedFee.totalPayable || selectedFee.registrationFee || 0)}</p></div>
                <div><p className="text-xs text-slate-500">Pending</p><p className="font-bold text-rose-700">{currencyFormatter.format(Math.max((selectedFee.totalPayable || selectedFee.registrationFee || 0) - toAmount(selectedFee.paidAmount), 0))}</p></div>
              </div>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount</label>
                <input name="amount" type="number" min="1" max={Math.max((selectedFee.totalPayable || selectedFee.registrationFee || 0) - toAmount(selectedFee.paidAmount), 0)} defaultValue={Math.max((selectedFee.totalPayable || selectedFee.registrationFee || 0) - toAmount(selectedFee.paidAmount), 0)} required
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment Method</label>
                <select name="paymentMethod" required defaultValue={selectedFee.paymentMethod || "Cash"}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200">
                  {PAYMENT_METHODS.map((method) => (<option key={method} value={method}>{method}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
                <textarea name="notes" rows="3" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200" placeholder="Optional payment note" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCollectPaymentModal(false); setSelectedFee(null); }} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700">Save & Print Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Installment Modal */}
      {showInstallmentModal && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Add Installment</h2>
              <button onClick={() => setShowInstallmentModal(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddInstallment} className="space-y-4">
              <input name="amount" type="number" min="1" required placeholder="Installment amount" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200" />
              <input name="dueDate" type="date" required className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200" />
              <button type="submit" className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">Save Installment</button>
            </form>
          </div>
        </div>
      )}

      {/* Late Fee Modal */}
      {showLateFeeModal && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Apply Late Fee</h2>
              <button onClick={() => setShowLateFeeModal(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleApplyLateFee} className="space-y-4">
              <input name="lateFeeAmount" type="number" min="1" required placeholder="Late fee amount" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200" />
              <button type="submit" className="w-full rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700">Apply Late Fee</button>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Generate Reports</h2>
              <button onClick={() => { setShowReportModal(false); setReportData([]); }} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button onClick={() => handleGenerateReport("registration-fee")} className="rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50">
                <FileText className="mb-2 h-5 w-5 text-teal-600" />
                <p className="font-semibold text-slate-800">All Registration Fees</p>
                <p className="text-xs text-slate-500">View all registration fee records</p>
              </button>
              <button onClick={() => handleGenerateReport("paid")} className="rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50">
                <CheckCircle2 className="mb-2 h-5 w-5 text-green-600" />
                <p className="font-semibold text-slate-800">Paid Students</p>
                <p className="text-xs text-slate-500">Students who have paid</p>
              </button>
              <button onClick={() => handleGenerateReport("pending")} className="rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50">
                <Clock className="mb-2 h-5 w-5 text-amber-600" />
                <p className="font-semibold text-slate-800">Pending Payments</p>
                <p className="text-xs text-slate-500">Students with pending fees</p>
              </button>
              <button onClick={() => handleGenerateReport("course-wise")} className="rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50">
                <GraduationCap className="mb-2 h-5 w-5 text-purple-600" />
                <p className="font-semibold text-slate-800">Course-wise Collection</p>
                <p className="text-xs text-slate-500">Collection summary by course</p>
              </button>
              <button onClick={() => handleGenerateReport("daily")} className="rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50">
                <Calendar className="mb-2 h-5 w-5 text-teal-600" />
                <p className="font-semibold text-slate-800">Daily Collection</p>
                <p className="text-xs text-slate-500">Today's collection report</p>
              </button>
              <button onClick={() => handleGenerateReport("monthly")} className="rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50">
                <BarChart3 className="mb-2 h-5 w-5 text-indigo-600" />
                <p className="font-semibold text-slate-800">Monthly Collection</p>
                <p className="text-xs text-slate-500">This month's collection</p>
              </button>
            </div>

            {reportData.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Report: {selectedReportType} ({reportData.length} records)
                </h3>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-xs font-semibold text-slate-500">Student</th>
                        <th className="px-3 py-2 text-xs font-semibold text-slate-500">Amount</th>
                        <th className="px-3 py-2 text-xs font-semibold text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.map((item, index) => (
                        <tr key={item._id || `${selectedReportType}-${index}`}>
                          <td className="px-3 py-2">{item.studentName || item._id}</td>
                          <td className="px-3 py-2">{currencyFormatter.format(item.totalPayable || item.registrationFee || item.totalAmount || 0)}</td>
                          <td className="px-3 py-2"><StatusBadge status={item.paymentStatus || "N/A"} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
