import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeIndianRupee,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Filter,
  IndianRupee,
  Plus,
  RefreshCcw,
  Printer,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest } from "../config/api";
import { printFineReceipt } from "../utils/receiptPdf";

const INSTITUTIONS = [
  "Sabarmati School of Nursing",
  "Sabarmati College of Nursing",
];

const COURSE_OPTIONS = [
  { institution: "Sabarmati School of Nursing", course: "ANM" },
  { institution: "Sabarmati School of Nursing", course: "GNM" },
  { institution: "Sabarmati College of Nursing", course: "B.Sc Nursing" },
  { institution: "Sabarmati College of Nursing", course: "M.Sc Nursing" },
  { institution: "Sabarmati College of Nursing", course: "P.B.B.Sc Nursing" },
];

const COURSES = COURSE_OPTIONS.map((item) => item.course);

const FINE_TYPES = [
  "Library",
  "Late Fee",
  "Hostel",
  "Transport",
  "Examination",
  "Discipline",
  "Uniform",
  "Document",
  "Miscellaneous",
];

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque", "Online Payment"];

const DEFAULT_FORM = {
  studentId: "",
  studentName: "",
  institution: "Sabarmati College of Nursing",
  course: "",
  fineType: "",
  fineAmount: "",
  fineDate: "",
  dueDate: "",
  paymentStatus: "Unpaid",
  paidAmount: "",
  paymentMethod: "",
  remarks: "",
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "All") {
      query.set(key, value);
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function toAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function inferInstitutionFromCourse(course = "") {
  const courseKey = normalizeText(course);
  const match = COURSE_OPTIONS.find((item) => normalizeText(item.course) === courseKey);
  return match?.institution || "Sabarmati College of Nursing";
}

function getFineInstitution(fine = {}) {
  return fine.institution || inferInstitutionFromCourse(fine.course);
}

function getInstitutionCourses(institution = "") {
  return COURSE_OPTIONS.filter((item) => item.institution === institution).map((item) => item.course);
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDate(value, targetDate) {
  if (!value || !targetDate) return false;
  const dateText = String(value).slice(0, 10);
  if (dateText === targetDate) return true;
  const [year, month, day] = targetDate.split("-");
  return dateText === `${day}-${month}-${year}`;
}

function getPendingAmount(fine = {}) {
  return Math.max(toAmount(fine.fineAmount) - toAmount(fine.paidAmount), 0);
}

function getFinePaidAmount(fine = {}) {
  if (Array.isArray(fine.paymentHistory) && fine.paymentHistory.length > 0) {
    return fine.paymentHistory.reduce((sum, payment) => sum + toAmount(payment.amount), 0);
  }
  const paidAmount = toAmount(fine.paidAmount);
  if (paidAmount > 0) return paidAmount;
  return fine.paymentStatus === "Paid" ? toAmount(fine.fineAmount) : 0;
}

function getFineCollectionForDate(fine = {}, date) {
  if (Array.isArray(fine.paymentHistory) && fine.paymentHistory.length > 0) {
    return fine.paymentHistory.reduce(
      (sum, payment) => sum + (isSameDate(payment.date, date) ? toAmount(payment.amount) : 0),
      0
    );
  }
  return isSameDate(fine.paidDate, date) ? getFinePaidAmount(fine) : 0;
}

function StatusBadge({ status }) {
  const styles = {
    Paid: "border-emerald-200 bg-emerald-100 text-emerald-700",
    Partial: "border-blue-200 bg-blue-100 text-blue-700",
    Unpaid: "border-amber-200 bg-amber-100 text-amber-700",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${styles[status] || styles.Unpaid}`}>
      {status === "Paid" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {status === "Partial" ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
      {status === "Unpaid" ? <Clock className="h-3.5 w-3.5" /> : null}
      {status || "Unpaid"}
    </span>
  );
}

function StatCard({ icon, label, value, tone = "blue" }) {
  const CardIcon = icon;
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-4 ${tones[tone] || tones.blue}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/70">
        <CardIcon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

export default function FineCollection() {
  const [fines, setFines] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingFine, setEditingFine] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const fetchFines = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        course: courseFilter,
        fineType: typeFilter,
        paymentStatus: statusFilter,
        date: dateFilter,
      };
      const [fineResponse, statsResponse] = await Promise.all([
        apiRequest.get(`/api/fines${buildQuery(params)}`),
        apiRequest.get(`/api/fines/stats/summary${buildQuery(params)}`).catch(() => ({ data: null })),
      ]);
      setFines(fineResponse.data || []);
      setStats(statsResponse.data || null);
    } catch (err) {
      console.error("Error loading fines:", err);
      setError(err.message || "Failed to load fine collection data.");
      setFines([]);
    } finally {
      setLoading(false);
    }
  }, [courseFilter, typeFilter, statusFilter, dateFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchFines();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchFines]);

  const filteredFines = useMemo(() => {
    const term = normalizeText(searchQuery);
    if (!term) return fines;
    return fines.filter((fine) =>
      normalizeText(fine.studentId).includes(term) ||
      normalizeText(fine.studentName).includes(term) ||
      normalizeText(fine.receiptNumber).includes(term)
    );
  }, [fines, searchQuery]);

  const summary = useMemo(() => {
    const totalCollection = stats?.totalCollection ?? filteredFines.reduce((sum, item) => sum + getFinePaidAmount(item), 0);
    const totalPending = stats?.totalPending ?? filteredFines.reduce((sum, item) => sum + toAmount(item.pendingAmount), 0);
    const students = stats?.totalStudentsWithFine ?? new Set(filteredFines.map((item) => item.studentId).filter(Boolean)).size;
    const collectionDate = dateFilter || getTodayDateString();
    const todayCollection = stats?.todayCollection ?? filteredFines.reduce(
      (sum, item) => sum + getFineCollectionForDate(item, collectionDate),
      0
    );

    return { totalCollection, totalPending, students, todayCollection };
  }, [dateFilter, filteredFines, stats]);

  const institutionCourses = useMemo(
    () => getInstitutionCourses(formData.institution),
    [formData.institution]
  );

  const handleInstitutionChange = (institution) => {
    const nextCourses = getInstitutionCourses(institution);
    setFormData((current) => ({
      ...current,
      institution,
      course: nextCourses.includes(current.course) ? current.course : "",
    }));
  };

  const handleCourseChange = (course) => {
    setFormData((current) => ({
      ...current,
      course,
      institution: inferInstitutionFromCourse(course),
    }));
  };

  const openAddForm = () => {
    setEditingFine(null);
    setFormData(DEFAULT_FORM);
    setShowForm(true);
  };

  const openEditForm = (fine) => {
    setEditingFine(fine);
    setFormData({
      studentId: fine.studentId || "",
      studentName: fine.studentName || "",
      institution: getFineInstitution(fine),
      course: fine.course || "",
      fineType: fine.fineType || "",
      fineAmount: String(fine.fineAmount ?? ""),
      fineDate: fine.fineDate || "",
      dueDate: fine.dueDate || "",
      paymentStatus: fine.paymentStatus || "Unpaid",
      paidAmount: String(fine.paidAmount ?? ""),
      paymentMethod: fine.paymentMethod || "",
      remarks: fine.remarks || "",
    });
    setShowForm(true);
  };

  const validateForm = () => {
    const amount = Number(formData.fineAmount);
    const paid = Number(formData.paidAmount || 0);

    if (!formData.studentId.trim() || !formData.studentName.trim() || !formData.institution || !formData.course || !formData.fineType) {
      return "Student ID, student name, institution, course and fine type are required.";
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return "Fine amount must be greater than zero.";
    }
    if (!formData.fineDate || !formData.dueDate) {
      return "Fine date and due date are required.";
    }
    if (formData.paymentStatus === "Partial" && (!Number.isFinite(paid) || paid <= 0 || paid > amount)) {
      return "Partial paid amount must be greater than zero and not more than the fine amount.";
    }
    if (formData.paymentStatus === "Paid" && !formData.paymentMethod) {
      return "Select payment method for paid fines.";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    const payload = {
      ...formData,
      fineAmount: Number(formData.fineAmount),
      paidAmount: formData.paymentStatus === "Partial" ? Number(formData.paidAmount || 0) : undefined,
      paymentMethod: formData.paymentStatus !== "Unpaid" ? formData.paymentMethod || "Cash" : "",
    };

    try {
      setSaving(true);
      if (editingFine?._id) {
        await apiRequest.put(`/api/fines/${editingFine._id}`, payload);
      } else {
        await apiRequest.post("/api/fines", payload);
      }
      setShowForm(false);
      setEditingFine(null);
      setFormData(DEFAULT_FORM);
      fetchFines();
    } catch (err) {
      console.error("Error saving fine:", err);
      alert(err.message || "Failed to save fine record.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fine) => {
    if (!window.confirm(`Delete fine record for ${fine.studentName}?`)) return;
    try {
      await apiRequest.delete(`/api/fines/${fine._id}`);
      fetchFines();
    } catch (err) {
      console.error("Error deleting fine:", err);
      alert(err.message || "Failed to delete fine record.");
    }
  };

  const printReceipt = async (fine) => {
    const printWindow = window.open("", "_blank");
    try {
      await printFineReceipt({
        fine: {
          ...fine,
          institution: getFineInstitution(fine),
        },
        printWindow,
      });
    } catch (err) {
      console.error("Error printing fine receipt:", err);
      alert(err.message || "Failed to print fine receipt.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <RefreshCcw className="mx-auto h-12 w-12 animate-spin text-red-600" />
          <p className="mt-4 text-slate-600">Loading fine collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fine Collection</h1>
          <p className="text-slate-600">Create, collect, and track student fine payments.</p>
        </div>
        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          Add Fine
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={BadgeIndianRupee} label="Collected" value={currencyFormatter.format(summary.totalCollection)} tone="green" />
        <StatCard icon={Clock} label="Pending" value={currencyFormatter.format(summary.totalPending)} tone="amber" />
        <StatCard icon={AlertTriangle} label="Students With Fine" value={summary.students} tone="red" />
        <StatCard
          icon={Calendar}
          label={dateFilter ? "Selected Date" : "Today"}
          value={currencyFormatter.format(summary.todayCollection)}
          tone="blue"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="relative min-w-[220px] flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, ID or receipt..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-12 w-full rounded-2xl border border-[#dce7f4] bg-[#f8fbff] pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </label>
        <label className="flex h-12 items-center gap-3 rounded-2xl border border-[#dce7f4] bg-[#f8fbff] px-4 text-sm text-slate-700">
          <Filter className="h-5 w-5 text-slate-400" />
          <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="bg-transparent outline-none">
            <option value="All">All Courses</option>
            {COURSES.map((course) => <option key={course} value={course}>{course}</option>)}
          </select>
        </label>
        <label className="flex h-12 items-center gap-3 rounded-2xl border border-[#dce7f4] bg-[#f8fbff] px-4 text-sm text-slate-700">
          <AlertTriangle className="h-5 w-5 text-slate-400" />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="bg-transparent outline-none">
            <option value="All">All Fine Types</option>
            {FINE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="flex h-12 items-center gap-3 rounded-2xl border border-[#dce7f4] bg-[#f8fbff] px-4 text-sm text-slate-700">
          <CheckCircle2 className="h-5 w-5 text-slate-400" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="bg-transparent outline-none">
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </label>
        <label className="flex h-12 items-center gap-3 rounded-2xl border border-[#dce7f4] bg-[#f8fbff] px-4 text-sm text-slate-700">
          <Calendar className="h-5 w-5 text-slate-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            aria-label="Collection date"
            title="Filter by collection date"
            className="bg-transparent outline-none"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {["Student", "Institution", "Course", "Fine Type", "Amount", "Paid", "Pending", "Due Date", "Status", "Actions"].map((heading) => (
                <th key={heading} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredFines.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-12 text-center text-slate-500">
                  No fine records found.
                </td>
              </tr>
            ) : (
              filteredFines.map((fine) => (
                <tr key={fine._id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900">{fine.studentName}</p>
                    <p className="text-xs text-slate-500">{fine.studentId}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">{getFineInstitution(fine).includes("School") ? "School" : "College"}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{fine.course}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{fine.fineType}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-900">{currencyFormatter.format(fine.fineAmount || 0)}</td>
                  <td className="px-5 py-4 text-sm text-emerald-700">{currencyFormatter.format(fine.paidAmount || 0)}</td>
                  <td className="px-5 py-4 text-sm text-rose-700">{currencyFormatter.format(fine.pendingAmount ?? getPendingAmount(fine))}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{fine.dueDate || "-"}</td>
                  <td className="px-5 py-4"><StatusBadge status={fine.paymentStatus} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {fine.paymentStatus !== "Unpaid" ? (
                        <button type="button" onClick={() => printReceipt(fine)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-purple-600" title="Print Receipt">
                          <Printer className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button type="button" onClick={() => openEditForm(fine)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(fine)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">{editingFine ? "Edit Fine" : "Add Fine"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Student ID / Roll No</span>
                  <input required value={formData.studentId} onChange={(event) => setFormData({ ...formData, studentId: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Student Name</span>
                  <input required value={formData.studentName} onChange={(event) => setFormData({ ...formData, studentName: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">School / College</span>
                  <select required value={formData.institution} onChange={(event) => handleInstitutionChange(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                    {INSTITUTIONS.map((institution) => <option key={institution} value={institution}>{institution.includes("School") ? "School" : "College"}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Course</span>
                  <select required value={formData.course} onChange={(event) => handleCourseChange(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                    <option value="">Select Course</option>
                    {institutionCourses.map((course) => <option key={course} value={course}>{course}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Fine Type</span>
                  <select required value={formData.fineType} onChange={(event) => setFormData({ ...formData, fineType: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                    <option value="">Select Fine Type</option>
                    {FINE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Fine Amount</span>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input required min="1" type="number" value={formData.fineAmount} onChange={(event) => setFormData({ ...formData, fineAmount: event.target.value })} className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Fine Date</span>
                  <input required type="date" value={formData.fineDate} onChange={(event) => setFormData({ ...formData, fineDate: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Due Date</span>
                  <input required type="date" value={formData.dueDate} onChange={(event) => setFormData({ ...formData, dueDate: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Payment Status</span>
                  <select value={formData.paymentStatus} onChange={(event) => setFormData({ ...formData, paymentStatus: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>
                </label>
                {formData.paymentStatus === "Partial" ? (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Paid Amount</span>
                    <input min="1" type="number" value={formData.paidAmount} onChange={(event) => setFormData({ ...formData, paidAmount: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                  </label>
                ) : null}
                {formData.paymentStatus !== "Unpaid" ? (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Payment Method</span>
                    <select value={formData.paymentMethod} onChange={(event) => setFormData({ ...formData, paymentMethod: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                      <option value="">Select Method</option>
                      {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                    </select>
                  </label>
                ) : null}
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Remarks</span>
                <textarea value={formData.remarks} onChange={(event) => setFormData({ ...formData, remarks: event.target.value })} rows="3" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
              </label>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                  <span className="inline-flex items-center justify-center gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Fine"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
