import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Filter,
  PlusCircle,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

const EXAM_STORAGE_KEY = "exam-dashboard-records";

const defaultExams = [];

const initialExamForm = {
  subject: "",
  department: "",
  examDate: "",
  hallNumber: "",
  status: "Upcoming",
  attendancePercentage: "",
  passPercentage: "",
  resultPublished: false,
};

function loadStoredExams() {
  if (typeof window === "undefined") {
    return defaultExams;
  }

  try {
    const rawValue = window.localStorage.getItem(EXAM_STORAGE_KEY);
    if (!rawValue) {
      return defaultExams;
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : defaultExams;
  } catch {
    return defaultExams;
  }
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusClasses(status) {
  if (status === "Completed") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Ongoing") {
    return "border border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border border-amber-200 bg-amber-50 text-amber-700";
}

function MetricCard({ title, value, note, icon: Icon, accentClasses }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
        </div>

        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accentClasses}`}
        >
          <Icon size={22} />
        </span>
      </div>
    </div>
  );
}

function FieldShell({ label, children }) {
  return (
    <label className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-blue-200 hover:bg-white">
      <span className="mb-3 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export default function ExamDashboard() {
  const [exams, setExams] = useState(loadStoredExams);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [formData, setFormData] = useState(initialExamForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(exams));
    }
  }, [exams]);

  const statusOptions = useMemo(
    () => ["All Status", ...Array.from(new Set(exams.map((exam) => exam.status)))],
    [exams]
  );

  const departmentOptions = useMemo(
    () => [
      "All Departments",
      ...Array.from(new Set(exams.map((exam) => exam.department))).sort(),
    ],
    [exams]
  );

  const filteredExams = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return exams.filter((exam) => {
      const matchesSearch =
        query.length === 0 ||
        exam.subject.toLowerCase().includes(query) ||
        exam.department.toLowerCase().includes(query) ||
        exam.hallNumber.toLowerCase().includes(query) ||
        exam.id.toLowerCase().includes(query);

      const matchesStatus =
        selectedStatus === "All Status" || exam.status === selectedStatus;

      const matchesDepartment =
        selectedDepartment === "All Departments" ||
        exam.department === selectedDepartment;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [exams, searchTerm, selectedStatus, selectedDepartment]);

  const analytics = useMemo(() => {
    const completedExams = exams.filter((exam) => exam.status === "Completed");
    const averagePassPercentage = completedExams.length
      ? Math.round(
          completedExams.reduce((sum, exam) => sum + Number(exam.passPercentage || 0), 0) /
            completedExams.length
        )
      : 0;

    const averageAttendancePercentage = completedExams.length
      ? Math.round(
          completedExams.reduce(
            (sum, exam) => sum + Number(exam.attendancePercentage || 0),
            0
          ) / completedExams.length
        )
      : 0;

    const publishedResults = exams.filter((exam) => exam.resultPublished).length;

    return {
      totalExams: exams.length,
      upcomingExams: exams.filter((exam) => exam.status === "Upcoming").length,
      ongoingExams: exams.filter((exam) => exam.status === "Ongoing").length,
      completedExams: exams.filter((exam) => exam.status === "Completed").length,
      passPercentage: `${averagePassPercentage}%`,
      attendancePercentage: `${averageAttendancePercentage}%`,
      resultPublicationStatus: `${publishedResults}/${exams.length}`,
      activeDepartments: new Set(exams.map((exam) => exam.department)).size,
    };
  }, [exams]);

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const generateExamId = () => {
    const nextNumber = exams.reduce((maxValue, exam) => {
      const numericPart = Number(String(exam.id).replace(/\D/g, ""));
      return Number.isFinite(numericPart) ? Math.max(maxValue, numericPart) : maxValue;
    }, 100);

    return `EXM-${nextNumber + 1}`;
  };

  const resetForm = () => {
    setFormData(initialExamForm);
  };

  const handleCreateExam = (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const subject = formData.subject.trim();
    const department = formData.department.trim();
    const hallNumber = formData.hallNumber.trim();

    if (!subject || !department || !formData.examDate || !hallNumber) {
      setError("Please complete subject, department, exam date, and hall number.");
      return;
    }

    const normalizedStatus = formData.status;
    const attendancePercentage =
      normalizedStatus === "Completed" ? Number(formData.attendancePercentage || 0) : 0;
    const passPercentage =
      normalizedStatus === "Completed" ? Number(formData.passPercentage || 0) : 0;

    const nextExam = {
      id: generateExamId(),
      subject,
      department,
      examDate: formData.examDate,
      hallNumber,
      status: normalizedStatus,
      attendancePercentage,
      resultPublished: normalizedStatus === "Completed" ? formData.resultPublished : false,
      passPercentage,
    };

    setExams((current) =>
      [...current, nextExam].sort((left, right) =>
        left.examDate.localeCompare(right.examDate)
      )
    );
    setMessage(`Exam schedule created for ${subject}.`);
    resetForm();
  };

  const handleStatusChange = (examId, nextStatus) => {
    setExams((current) =>
      current.map((exam) => {
        if (exam.id !== examId) {
          return exam;
        }

        const isCompleted = nextStatus === "Completed";
        return {
          ...exam,
          status: nextStatus,
          resultPublished: isCompleted ? exam.resultPublished : false,
          attendancePercentage: isCompleted ? exam.attendancePercentage : 0,
          passPercentage: isCompleted ? exam.passPercentage : 0,
        };
      })
    );
    setMessage(`Exam status updated to ${nextStatus}.`);
  };

  const handleExamMetricChange = (examId, fieldName, value) => {
    const normalizedValue = Math.max(0, Math.min(100, Number(value || 0)));

    setExams((current) =>
      current.map((exam) =>
        exam.id === examId ? { ...exam, [fieldName]: normalizedValue } : exam
      )
    );
  };

  const handleResultPublishToggle = (examId) => {
    setExams((current) =>
      current.map((exam) =>
        exam.id === examId
          ? { ...exam, resultPublished: exam.status === "Completed" ? !exam.resultPublished : false }
          : exam
      )
    );
  };

  const handleDeleteExam = (examId) => {
    setExams((current) => current.filter((exam) => exam.id !== examId));
    setMessage(`Exam record ${examId} removed from the schedule.`);
  };

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.12),_transparent_28%),linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#e2e8f0_100%)] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <div className="grid xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="relative overflow-hidden bg-[linear-gradient(180deg,#0f172a_0%,#123b74_52%,#1d4ed8_100%)] px-6 py-7 text-white sm:px-8">
              <div className="hero-grid" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                  <ShieldCheck size={14} />
                  Official Exam Control
                </span>

                <h1 className="mt-5 text-3xl font-black tracking-tight">
                  Examination management dashboard
                </h1>
                <p className="mt-4 text-sm leading-7 text-slate-200">
                  Create exam schedules, manage hall assignments, update progress,
                  and track result publication from one administrative workspace.
                </p>

                <div className="mt-7 space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
                      Session Snapshot
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {analytics.upcomingExams} upcoming, {analytics.ongoingExams} ongoing
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      Completed records and live scheduling controls stay aligned in
                      one exam register.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
                      Search Result
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {filteredExams.length} records visible
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      Filters update the management table and mobile cards in real time.
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid gap-3">
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                      Result Publication
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {analytics.resultPublicationStatus}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                      Active Departments
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {analytics.activeDepartments}
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            <div className="bg-white px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <div className="rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Examination Office
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                  Exam dashboard overview
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Create exam schedules, monitor department coverage, manage status,
                  and update attendance and result records from one streamlined panel.
                </p>
              </div>

              {error ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              ) : null}

              <div className="mt-5 rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                      Schedule Creation
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">
                      Create and manage exam schedules
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Add new exam records with subject, department, date, hall
                      number, and optional completion metrics.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">{analytics.totalExams}</span>{" "}
                    scheduled exams in register
                  </div>
                </div>

                <form onSubmit={handleCreateExam} className="mt-5 space-y-5">
                  <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
                    <FieldShell label="Subject">
                      <input
                        name="subject"
                        value={formData.subject}
                        onChange={handleFormChange}
                        placeholder="Anatomy"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </FieldShell>

                    <FieldShell label="Department">
                      <input
                        name="department"
                        value={formData.department}
                        onChange={handleFormChange}
                        placeholder="B.Sc Nursing"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </FieldShell>

                    <FieldShell label="Exam Date">
                      <input
                        name="examDate"
                        type="date"
                        value={formData.examDate}
                        onChange={handleFormChange}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </FieldShell>

                    <FieldShell label="Hall Number">
                      <input
                        name="hallNumber"
                        value={formData.hallNumber}
                        onChange={handleFormChange}
                        placeholder="Hall C-204"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </FieldShell>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
                    <FieldShell label="Status">
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleFormChange}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="Upcoming">Upcoming</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </FieldShell>

                    <FieldShell label="Attendance %">
                      <input
                        name="attendancePercentage"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.attendancePercentage}
                        onChange={handleFormChange}
                        placeholder="95"
                        disabled={formData.status !== "Completed"}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </FieldShell>

                    <FieldShell label="Pass %">
                      <input
                        name="passPercentage"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.passPercentage}
                        onChange={handleFormChange}
                        placeholder="88"
                        disabled={formData.status !== "Completed"}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </FieldShell>

                    <label className="flex rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-blue-200 hover:bg-white">
                      <span className="flex w-full items-center justify-between gap-4">
                        <span>
                          <span className="block text-sm font-semibold text-slate-700">
                            Publish Result
                          </span>
                          <span className="mt-2 block text-xs leading-5 text-slate-500">
                            Enabled when the exam status is completed.
                          </span>
                        </span>
                        <input
                          name="resultPublished"
                          type="checkbox"
                          checked={formData.resultPublished}
                          onChange={handleFormChange}
                          disabled={formData.status !== "Completed"}
                          className="h-5 w-5 rounded border-slate-300 text-blue-600"
                        />
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                      New exams are stored in the browser register for active management.
                    </p>

                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1d4ed8_0%,#0f172a_100%)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                    >
                      <PlusCircle size={17} />
                      Create Exam Schedule
                    </button>
                  </div>
                </form>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <MetricCard
                  title="Total Exams"
                  value={analytics.totalExams}
                  note="Total exam records available"
                  icon={CalendarDays}
                  accentClasses="bg-blue-100 text-blue-700"
                />
                <MetricCard
                  title="Upcoming"
                  value={analytics.upcomingExams}
                  note="Scheduled exams awaiting conduct"
                  icon={ClipboardCheck}
                  accentClasses="bg-amber-100 text-amber-700"
                />
                <MetricCard
                  title="Completed"
                  value={analytics.completedExams}
                  note="Exams completed and reviewed"
                  icon={FileCheck2}
                  accentClasses="bg-emerald-100 text-emerald-700"
                />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <MetricCard
                  title="Pass Percentage"
                  value={analytics.passPercentage}
                  note="Average across completed exams"
                  icon={BarChart3}
                  accentClasses="bg-indigo-100 text-indigo-700"
                />
                <MetricCard
                  title="Attendance"
                  value={analytics.attendancePercentage}
                  note="Average attendance for completed exams"
                  icon={Users}
                  accentClasses="bg-cyan-100 text-cyan-700"
                />
                <MetricCard
                  title="Published Results"
                  value={analytics.resultPublicationStatus}
                  note="Published result records out of total exams"
                  icon={ShieldCheck}
                  accentClasses="bg-violet-100 text-violet-700"
                />
              </div>

              <div className="mt-6 rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                      Exam Register
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">
                      Advanced exam management table
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      View subject, department, date, hall assignment, status,
                      attendance, pass result, and management actions in one register.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <Filter size={16} className="text-blue-700" />
                      <select
                        value={selectedDepartment}
                        onChange={(event) => setSelectedDepartment(event.target.value)}
                        className="w-full bg-transparent outline-none"
                      >
                        {departmentOptions.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                    </div>

                    <select
                      value={selectedStatus}
                      onChange={(event) => setSelectedStatus(event.target.value)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <label className="relative min-w-0 lg:min-w-[340px]">
                    <Search
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search subject, hall, code..."
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>

                  <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      Visible Records: {filteredExams.length}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      Department: {selectedDepartment}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      Status: {selectedStatus}
                    </span>
                  </div>
                </div>

                <div className="mt-6 hidden overflow-x-auto xl:block">
                  <table className="min-w-full border-separate border-spacing-y-3">
                    <thead>
                      <tr>
                        {[
                          "Subject",
                          "Department",
                          "Exam Date",
                          "Hall",
                          "Status",
                          "Attendance",
                          "Pass",
                          "Result",
                          "Actions",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExams.map((exam) => (
                        <tr
                          key={exam.id}
                          className="group align-top transition duration-200 hover:-translate-y-0.5"
                        >
                          <td className="rounded-l-3xl border border-r-0 border-slate-200 bg-slate-50 px-4 py-4 transition duration-200 group-hover:bg-white">
                            <p className="font-semibold text-slate-900">{exam.subject}</p>
                            <p className="mt-1 text-xs text-slate-500">{exam.id}</p>
                          </td>
                          <td className="border-y border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 transition duration-200 group-hover:bg-white">
                            {exam.department}
                          </td>
                          <td className="border-y border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 transition duration-200 group-hover:bg-white">
                            {formatDate(exam.examDate)}
                          </td>
                          <td className="border-y border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 transition duration-200 group-hover:bg-white">
                            {exam.hallNumber}
                          </td>
                          <td className="border-y border-slate-200 bg-slate-50 px-4 py-4 transition duration-200 group-hover:bg-white">
                            <div className="space-y-3">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusClasses(
                                  exam.status
                                )}`}
                              >
                                {exam.status}
                              </span>
                              <select
                                value={exam.status}
                                onChange={(event) =>
                                  handleStatusChange(exam.id, event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                              >
                                <option value="Upcoming">Upcoming</option>
                                <option value="Ongoing">Ongoing</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </div>
                          </td>
                          <td className="border-y border-slate-200 bg-slate-50 px-4 py-4 transition duration-200 group-hover:bg-white">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={exam.attendancePercentage}
                              onChange={(event) =>
                                handleExamMetricChange(
                                  exam.id,
                                  "attendancePercentage",
                                  event.target.value
                                )
                              }
                              disabled={exam.status !== "Completed"}
                              className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </td>
                          <td className="border-y border-slate-200 bg-slate-50 px-4 py-4 transition duration-200 group-hover:bg-white">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={exam.passPercentage}
                              onChange={(event) =>
                                handleExamMetricChange(
                                  exam.id,
                                  "passPercentage",
                                  event.target.value
                                )
                              }
                              disabled={exam.status !== "Completed"}
                              className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </td>
                          <td className="border-y border-slate-200 bg-slate-50 px-4 py-4 transition duration-200 group-hover:bg-white">
                            <button
                              type="button"
                              onClick={() => handleResultPublishToggle(exam.id)}
                              disabled={exam.status !== "Completed"}
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                                exam.resultPublished
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              <CheckCircle2 size={14} />
                              {exam.resultPublished ? "Published" : "Draft"}
                            </button>
                          </td>
                          <td className="rounded-r-3xl border border-l-0 border-slate-200 bg-slate-50 px-4 py-4 transition duration-200 group-hover:bg-white">
                            <button
                              type="button"
                              onClick={() => handleDeleteExam(exam.id)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              <Trash2 size={15} />
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid gap-4 xl:hidden">
                  {filteredExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900">{exam.subject}</h3>
                          <p className="mt-1 text-xs text-slate-500">{exam.id}</p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusClasses(
                            exam.status
                          )}`}
                        >
                          {exam.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Department
                          </p>
                          <p className="mt-1 text-sm text-slate-700">{exam.department}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Exam Date
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {formatDate(exam.examDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Hall Number
                          </p>
                          <p className="mt-1 text-sm text-slate-700">{exam.hallNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Publish Result
                          </p>
                          <button
                            type="button"
                            onClick={() => handleResultPublishToggle(exam.id)}
                            disabled={exam.status !== "Completed"}
                            className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                              exam.resultPublished
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            <CheckCircle2 size={14} />
                            {exam.resultPublished ? "Published" : "Draft"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label>
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Status
                          </span>
                          <select
                            value={exam.status}
                            onChange={(event) =>
                              handleStatusChange(exam.id, event.target.value)
                            }
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                          >
                            <option value="Upcoming">Upcoming</option>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </label>

                        <label>
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Attendance %
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={exam.attendancePercentage}
                            onChange={(event) =>
                              handleExamMetricChange(
                                exam.id,
                                "attendancePercentage",
                                event.target.value
                              )
                            }
                            disabled={exam.status !== "Completed"}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </label>

                        <label>
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Pass %
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={exam.passPercentage}
                            onChange={(event) =>
                              handleExamMetricChange(
                                exam.id,
                                "passPercentage",
                                event.target.value
                              )
                            }
                            disabled={exam.status !== "Completed"}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </label>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteExam(exam.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            <Trash2 size={15} />
                            Remove Record
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredExams.length === 0 ? (
                  <div className="mt-6 rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                    <p className="text-lg font-semibold text-slate-900">
                      No exam records found
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Try changing the search term or filter settings.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
