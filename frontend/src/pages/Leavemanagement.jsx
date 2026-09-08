import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  FolderClock,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
  Users2,
  XCircle,
} from "lucide-react";
import { API_BASE_URL, apiRequest } from "../config/api";

const workspaceNav = [
  { id: "dashboard", label: "Dashboard", description: "Overview and KPIs", icon: ShieldCheck },
  { id: "request", label: "New Request", description: "Apply for leave", icon: FileText },
  { id: "history", label: "History", description: "Track previous requests", icon: FolderClock },
  { id: "approvals", label: "Approvals", description: "Manager actions", icon: FileCheck2 },
];

const statusClassMap = {
  Approved: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  Pending: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  Rejected: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
};

const emptyForm = {
  employeeName: "",
  employeeId: "",
  department: "",
  leaveType: "",
  startDate: "",
  endDate: "",
  reason: "",
};

const fallbackSummary = {
  totalLeaves: 0,
  approvedLeaves: 0,
  pendingRequests: 0,
  rejectedLeaves: 0,
};

const fallbackStats = [
  { label: "Average leave balance", value: "30.0 Days", tone: "text-blue-700 bg-blue-50" },
  { label: "High utilization team", value: "No requests yet", tone: "text-amber-700 bg-amber-50" },
  { label: "On-time approvals", value: "0%", tone: "text-emerald-700 bg-emerald-50" },
];

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function formatDisplayDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDocumentUrl(path) {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

const Leavemanagement = () => {
  const [dashboard, setDashboard] = useState({
    summary: fallbackSummary,
    leaves: [],
    pendingApprovals: [],
    employeeStats: fallbackStats,
    recentActivities: [],
  });
  const [formData, setFormData] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");

  const overviewCards = [
    {
      title: "Total Leaves",
      value: dashboard.summary.totalLeaves,
      note: "All requests in the system",
      icon: CalendarDays,
      iconClass: "bg-blue-100 text-blue-700",
      accentClass: "from-blue-600 to-sky-500",
    },
    {
      title: "Approved Leaves",
      value: dashboard.summary.approvedLeaves,
      note: "Processed and accepted",
      icon: CheckCircle2,
      iconClass: "bg-emerald-100 text-emerald-700",
      accentClass: "from-emerald-600 to-teal-500",
    },
    {
      title: "Pending Requests",
      value: dashboard.summary.pendingRequests,
      note: "Awaiting manager review",
      icon: Clock3,
      iconClass: "bg-amber-100 text-amber-700",
      accentClass: "from-amber-500 to-orange-500",
    },
    {
      title: "Rejected Leaves",
      value: dashboard.summary.rejectedLeaves,
      note: "Returned for correction",
      icon: XCircle,
      iconClass: "bg-rose-100 text-rose-700",
      accentClass: "from-rose-500 to-red-500",
    },
  ];

  const filteredLeaves = dashboard.leaves.filter((leave) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return [
      leave.employeeName,
      leave.employeeId,
      leave.department,
      leave.leaveType,
      leave.status,
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term));
  });

  const fetchDashboard = async () => {
    setLoading(true);

    try {
      const data = await apiRequest("/api/leaves");
      setDashboard({
        summary: data.summary || fallbackSummary,
        leaves: Array.isArray(data.leaves) ? data.leaves : [],
        pendingApprovals: Array.isArray(data.pendingApprovals) ? data.pendingApprovals : [],
        employeeStats:
          Array.isArray(data.employeeStats) && data.employeeStats.length
            ? data.employeeStats
            : fallbackStats,
        recentActivities: Array.isArray(data.recentActivities) ? data.recentActivities : [],
      });
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleNavClick = (sectionId) => {
    setActiveSection(sectionId);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value);
      });

      if (selectedFile) {
        payload.append("document", selectedFile);
      }

      const response = await apiRequest("/api/leaves", {
        method: "POST",
        body: payload,
      });

      setFormData(emptyForm);
      setSelectedFile(null);
      setSuccess(response.message || "Leave request submitted successfully.");
      await fetchDashboard();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusAction = async (id, status) => {
    setActionId(`${id}-${status}`);
    setError("");
    setSuccess("");

    try {
      const response = await apiRequest(`/api/leaves/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          reviewedBy: "HR Manager",
        }),
      });

      setSuccess(response.message || `Leave request ${status.toLowerCase()} successfully.`);
      await fetchDashboard();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionId("");
    }
  };

  const renderActivePage = () => {
    if (activeSection === "dashboard") {
      return (
        <div className="space-y-8">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.title}
                  className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        {card.title}
                      </p>
                      <p className="mt-3 text-4xl font-black tracking-tight text-slate-900">
                        {loading ? "--" : card.value}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">{card.note}</p>
                    </div>
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.iconClass}`}
                    >
                      <Icon size={24} />
                    </span>
                  </div>
                  <div
                    className={`mt-5 h-2 rounded-full bg-gradient-to-r ${card.accentClass} transition duration-300 group-hover:scale-x-[1.02]`}
                  />
                </article>
              );
            })}
          </div>

          <div className="grid gap-8 2xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
            <div className="space-y-8">
              <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                      Employee Leave Statistics
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      Team availability snapshot
                    </h3>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Users2 size={22} />
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {dashboard.employeeStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4"
                    >
                      <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stat.tone}`}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eff6ff_100%)] p-6 shadow-sm lg:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Recent Leave Activities
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  Latest workflow updates
                </h3>

                <div className="mt-6 space-y-4">
                  {dashboard.recentActivities.length === 0 ? (
                    <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-4 text-sm text-slate-500 shadow-sm">
                      Activity will appear here as employees submit and managers process requests.
                    </div>
                  ) : (
                    dashboard.recentActivities.map((activity, index) => (
                      <div
                        key={`${activity.message}-${index}`}
                        className="flex gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 py-4 shadow-sm"
                      >
                        <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                          <FileCheck2 size={18} />
                        </span>
                        <div>
                          <p className="text-sm leading-6 text-slate-600">{activity.message}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDisplayDate(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Admin Panel
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  Pending approval summary
                </h3>

                <div className="mt-6 space-y-4">
                  {dashboard.pendingApprovals.length === 0 ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                      No pending approvals right now.
                    </div>
                  ) : (
                    dashboard.pendingApprovals.slice(0, 3).map((request) => (
                      <article
                        key={request._id}
                        className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-base font-semibold text-slate-900">
                              {request.employeeName}
                            </h4>
                            <p className="mt-1 text-sm text-slate-500">
                              {request.department}
                            </p>
                          </div>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                            {request.status}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === "request") {
      return (
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                Leave Request Form
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">
                Submit a new leave application
              </h3>
            </div>
            <p className="text-sm text-slate-500">
              Complete all required fields before submission.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Employee Name
                </span>
                <input
                  name="employeeName"
                  value={formData.employeeName}
                  onChange={handleChange}
                  type="text"
                  placeholder="Enter full name"
                  className={inputClassName}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Employee ID
                </span>
                <input
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  type="text"
                  placeholder="EMP-2048"
                  className={inputClassName}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Department
                </span>
                <input
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  type="text"
                  placeholder="Human Resources"
                  className={inputClassName}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Leave Type
                </span>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleChange}
                  className={inputClassName}
                  required
                >
                  <option value="" disabled>
                    Select leave type
                  </option>
                  <option>Casual Leave</option>
                  <option>Sick Leave</option>
                  <option>Earned Leave</option>
                  <option>Maternity Leave</option>
                  <option>Emergency Leave</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Start Date
                </span>
                <input
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  type="date"
                  className={inputClassName}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  End Date
                </span>
                <input
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  type="date"
                  className={inputClassName}
                  required
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Reason
                </span>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  rows="5"
                  placeholder="Add a clear professional reason for the leave request"
                  className={`${inputClassName} resize-none`}
                  required
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Upload Document
                </span>
                <div className="rounded-[24px] border border-dashed border-blue-200 bg-blue-50/60 p-5 transition hover:border-blue-400 hover:bg-blue-50">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                        <Upload size={20} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Medical certificate or supporting proof
                        </p>
                        <p className="text-xs text-slate-500">
                          PDF, JPG, or PNG up to 5MB
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                      className="block w-full max-w-xs text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-blue-700"
                    />
                  </div>
                  {selectedFile && (
                    <p className="mt-3 text-xs text-slate-500">
                      Selected file: {selectedFile.name}
                    </p>
                  )}
                </div>
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                All requests are routed to reporting managers and HR for approval.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </section>
      );
    }

    if (activeSection === "approvals") {
      return (
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
            Admin Panel
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">
            Approve or reject requests
          </h3>

          <div className="mt-6 space-y-4">
            {dashboard.pendingApprovals.length === 0 ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No pending approvals right now.
              </div>
            ) : (
              dashboard.pendingApprovals.map((request) => (
                <article
                  key={request._id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900">
                        {request.employeeName}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        {request.department}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                      {request.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Leave Type
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {request.leaveType}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Duration
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatDisplayDate(request.startDate)} - {formatDisplayDate(request.endDate)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={actionId === `${request._id}-Approved`}
                      onClick={() => handleStatusAction(request._id, "Approved")}
                      className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionId === `${request._id}-Approved` ? "Approving..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={actionId === `${request._id}-Rejected`}
                      onClick={() => handleStatusAction(request._id, "Rejected")}
                      className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionId === `${request._id}-Rejected` ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      );
    }

    return (
      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
              Leave History
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900 sm:text-[2rem]">
              Previous leave requests
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              View a complete record of submitted leave requests, approval outcomes,
              and supporting documents in one official register.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Records
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {loading ? "--" : filteredLeaves.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Search Scope
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {searchTerm.trim() ? "Filtered results" : "All leave requests"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-6 py-4">Leave Type</th>
                  <th className="px-6 py-4">From Date</th>
                  <th className="px-6 py-4">To Date</th>
                  <th className="px-6 py-4">Days</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-sm text-slate-500">
                      Loading leave requests...
                    </td>
                  </tr>
                ) : filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-14">
                      <div className="flex flex-col items-center justify-center rounded-[22px] bg-slate-50 px-6 py-10 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                          <FolderClock size={24} />
                        </span>
                        <p className="mt-4 text-base font-semibold text-slate-800">
                          No leave requests found
                        </p>
                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                          Submitted requests will appear here with approval status,
                          dates, and supporting documentation.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeaves.map((item) => (
                    <tr key={item._id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-5 text-sm font-semibold text-slate-800">
                        <div>{item.leaveType}</div>
                        <div className="mt-1 text-xs font-normal text-slate-500">
                          {item.employeeName} | {item.employeeId}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-600">
                        {formatDisplayDate(item.startDate)}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-600">
                        {formatDisplayDate(item.endDate)}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-600">
                        {item.days} {item.days === 1 ? "Day" : "Days"}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClassMap[item.status]}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          {item.documentUrl ? (
                            <a
                              href={getDocumentUrl(item.documentUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                            >
                              View Document
                            </a>
                          ) : (
                            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400">
                              No Document
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  };

  return (
    <section className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#eef4fb_0%,#f8fbff_42%,#f8fafc_100%)] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1760px]">
        <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="grid xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200 bg-[linear-gradient(180deg,#0f172a_0%,#162c4a_45%,#1d4f91_100%)] p-6 text-white xl:min-h-[calc(100vh-170px)] xl:border-b-0 xl:border-r xl:border-white/10">
              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">
                  Leave Hub
                </p>
                <h1 className="mt-3 text-2xl font-black tracking-tight">
                  HR Leave Portal
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  Manage employee requests, approvals, and leave compliance from one
                  official workspace.
                </p>
              </div>

              <nav className="mt-6 space-y-3">
                {workspaceNav.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      aria-current={activeSection === item.id ? "page" : undefined}
                      className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition duration-200 ${
                        activeSection === item.id
                          ? "border-cyan-200/40 bg-white/16 shadow-lg ring-1 ring-white/20"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-blue-50">
                        <Icon size={20} />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-white">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-300">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 rounded-[28px] border border-cyan-300/20 bg-cyan-400/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                  Policy Window
                </p>
                <p className="mt-3 text-3xl font-black text-white">May 2026</p>
                <p className="mt-2 text-sm leading-6 text-cyan-50/90">
                  Monthly leave reconciliation closes on 31 May 2026 for payroll and HR review.
                </p>
              </div>
            </aside>

            <div className="min-w-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
              <div className="border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-700">
                      Employee Leave Management
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                      Professional leave operations dashboard
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      Review leave balances, submit requests, and process approvals with a
                      structured corporate workflow.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                      <Search size={18} className="text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search employee or request"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                      />
                    </label>

                    <button
                      type="button"
                      className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700"
                      aria-label="Notifications"
                    >
                      <Bell size={20} />
                      {dashboard.summary.pendingRequests > 0 && (
                        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500" />
                      )}
                    </button>

                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                        <UserRound size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">HR Manager</p>
                        <p className="text-xs text-slate-500">HR Manager</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 lg:p-8">
                {error && (
                  <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {success}
                  </div>
                )}

                {renderActivePage()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Leavemanagement;
