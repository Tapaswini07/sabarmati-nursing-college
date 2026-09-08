import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../config/api";
import { getStoredUser } from "../utils/auth";

const statCards = [
  {
    key: "attendance",
    title: "Attendance Status",
    note: "Open your date-wise attendance register",
    icon: ShieldCheck,
    actionLabel: "View attendance",
    path: "/dashboard/academichub/attedence",
  },
  {
    key: "admission",
    title: "Admission Status",
    value: "Approved",
    note: "Admission verified by admin",
    icon: GraduationCap,
    actionLabel: "View admission details",
    path: "/dashboard/student/admission-details",
  },
  {
    key: "fees",
    title: "Fee Status",
    value: "Up to date",
    note: "Latest receipt available",
    icon: CreditCard,
    actionLabel: "View fee receipts",
    path: "/fees",
  },
  {
    key: "notifications",
    title: "Notifications",
    value: "03",
    note: "Unread student notices",
    icon: Bell,
  },
];

const accessItems = [
  { label: "View attendance", path: "/dashboard/academichub/attedence", accent: true },
  { label: "View admission details", path: "/dashboard/student/admission-details" },
  { label: "View fee receipts", path: "/fees" },
  { label: "View notifications" },
  { label: "View personal profile" },
  { label: "No edit or delete permission", disabled: true },
];

const statusStyles = {
  Present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Absent: "bg-rose-50 text-rose-700 border-rose-200",
  "Half-day": "bg-amber-50 text-amber-700 border-amber-200",
};

const attendanceStatusScores = {
  Present: 1,
  "Half-day": 0.5,
  Absent: 0,
};

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const parsedDate = parseAttendanceDate(value);
  if (!parsedDate) {
    return "-";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseAttendanceDate(value) {
  if (!value) {
    return null;
  }

  const dateValue = String(value);
  const parsedDate = dateValue.includes("T")
    ? new Date(dateValue)
    : new Date(`${dateValue}T00:00:00`);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getAttendanceYear(value) {
  return parseAttendanceDate(value)?.getFullYear() || null;
}

function getAttendanceDateKey(value) {
  const dateValue = String(value || "");
  if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
    return dateValue.slice(0, 10);
  }

  return parseAttendanceDate(value)?.toISOString().slice(0, 10) || "";
}

function normalizeAttendanceStatus(status) {
  if (!status) {
    return "";
  }

  const normalizedStatus = String(status).trim().toLowerCase();
  if (normalizedStatus === "present") {
    return "Present";
  }

  if (normalizedStatus === "absent") {
    return "Absent";
  }

  if (["half-day", "half day", "halfday"].includes(normalizedStatus)) {
    return "Half-day";
  }

  return "";
}

function getAttendanceScore(status) {
  return attendanceStatusScores[normalizeAttendanceStatus(status)] ?? 0;
}

function getRecordTime(record) {
  const value = record?.updatedAt || record?.createdAt || record?.date;
  return value ? new Date(value).getTime() : 0;
}

function getYearlyAttendanceRecords(records, year) {
  const recordsByDate = new Map();

  (Array.isArray(records) ? records : []).forEach((record) => {
    const recordYear = getAttendanceYear(record?.date);
    if (recordYear !== year) {
      return;
    }

    const recordDate = parseAttendanceDate(record.date);
    if (!recordDate) {
      return;
    }

    const dateKey = getAttendanceDateKey(record.date);
    const existingRecord = recordsByDate.get(dateKey);
    if (!existingRecord || getRecordTime(record) > getRecordTime(existingRecord)) {
      recordsByDate.set(dateKey, record);
    }
  });

  return [...recordsByDate.values()].sort(
    (a, b) => parseAttendanceDate(b.date).getTime() - parseAttendanceDate(a.date).getTime()
  );
}

function AttendancePie({ percent, year }) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const displayPercent = Number.isInteger(safePercent) ? safePercent : safePercent.toFixed(2);
  const background = `conic-gradient(#10b981 0% ${safePercent}%, #e2e8f0 ${safePercent}% 100%)`;

  return (
    <div className="relative mx-auto h-44 w-44">
      <div
        className="h-full w-full rounded-full shadow-[inset_0_0_30px_rgba(15,23,42,0.06)]"
        style={{ background }}
      />
      <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
        <span className="text-4xl font-black text-slate-900">{displayPercent}%</span>
        <span className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {year} Average
        </span>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const user = getStoredUser();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [linkedStudent, setLinkedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const handleNavigate = (path) => {
    if (!path) {
      return;
    }

    navigate(path, {
      state: {
        source: "student-dashboard",
        studentView: "logs",
      },
    });
  };

  useEffect(() => {
    let active = true;

    async function loadStudentDashboard() {
      try {
        setLoading(true);
        setAttendanceError("");

        const [records, profile] = await Promise.all([
          apiRequest("/api/attendance/me"),
          apiRequest("/api/students/me/profile"),
        ]);

        if (!active) {
          return;
        }

        setAttendanceRecords(Array.isArray(records) ? records : []);
        setLinkedStudent(profile?.student || null);
      } catch (error) {
        if (!active) {
          return;
        }

        setAttendanceError(error.message || "Unable to load attendance details.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStudentDashboard();

    return () => {
      active = false;
    };
  }, []);

  const attendanceYears = useMemo(() => {
    const years = Array.from(
      new Set(
        attendanceRecords
          .map((record) => {
            if (!record?.date) {
              return null;
            }

            return getAttendanceYear(record.date);
          })
          .filter(Boolean)
      )
    ).sort((a, b) => b - a);

    return years.length > 0 ? years : [currentYear];
  }, [attendanceRecords, currentYear]);

  const activeYear = attendanceYears.includes(selectedYear) ? selectedYear : attendanceYears[0];

  const yearlyAttendanceRecords = useMemo(
    () => getYearlyAttendanceRecords(attendanceRecords, activeYear),
    [attendanceRecords, activeYear]
  );

  const attendanceSummary = useMemo(() => {
    const summary = yearlyAttendanceRecords.reduce(
      (result, item) => {
        const status = normalizeAttendanceStatus(item.status);

        if (!status) {
          return result;
        }

        if (status === "Present") {
          result.present += 1;
        } else if (status === "Absent") {
          result.absent += 1;
        } else if (status === "Half-day") {
          result.halfDay += 1;
        }

        result.total += 1;
        result.earnedAttendance += getAttendanceScore(status);
        return result;
      },
      { present: 0, absent: 0, halfDay: 0, total: 0, earnedAttendance: 0 }
    );
    const average = summary.total
      ? Number(((summary.earnedAttendance / summary.total) * 100).toFixed(2))
      : 0;

    return { ...summary, average };
  }, [yearlyAttendanceRecords]);

  const latestAttendance = useMemo(
    () => yearlyAttendanceRecords.slice(0, 6),
    [yearlyAttendanceRecords]
  );

  const resolvedStatCards = useMemo(
    () =>
      statCards.map((item) => {
        if (item.key === "attendance") {
          return {
            ...item,
            value: loading ? "--" : `${attendanceSummary.average}%`,
            note:
              attendanceSummary.total > 0
                ? `Year-wise average from ${attendanceSummary.total} records in ${activeYear}`
                : item.note,
          };
        }

        return item;
      }),
    [attendanceSummary.average, attendanceSummary.total, loading, activeYear]
  );

  return (
    <section className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.10),_transparent_28%),linear-gradient(180deg,#f7fafc_0%,#eff6ff_48%,#ecfeff_100%)] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#14532d_52%,#0f766e_100%)] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
            Student Portal
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
            Welcome, {user?.name || "Student"}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
            Your dashboard is view-only. You can check attendance, admission details, fee receipts,
            notifications, and your personal profile from one place.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => handleNavigate("/dashboard/academichub/attedence")}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-emerald-900 shadow-[0_12px_24px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              View attendance
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {resolvedStatCards.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => handleNavigate(item.path)}
                disabled={!item.path}
                className={`rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition ${
                  item.path
                    ? "cursor-pointer hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
                    : "cursor-default"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{item.title}</p>
                    <p className="mt-3 text-3xl font-black text-slate-900">{item.value}</p>
                    <p className="mt-2 text-sm text-slate-500">{item.note}</p>
                    {item.actionLabel ? (
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                        {item.actionLabel}
                        <ChevronRight size={15} />
                      </span>
                    ) : null}
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Icon size={22} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Date-wise Attendance</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Track your day-by-day attendance status for {activeYear}.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={activeYear}
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-300"
                >
                  {attendanceYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleNavigate("/dashboard/academichub/attedence")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5"
                >
                  Open full register
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {attendanceError ? (
              <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {attendanceError}
              </div>
            ) : loading ? (
              <div className="mt-5 grid gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="h-20 animate-pulse rounded-3xl bg-slate-100" />
                ))}
              </div>
            ) : latestAttendance.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                No attendance records are available yet.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {latestAttendance.map((record) => (
                  <div
                    key={record._id}
                    className="flex flex-col gap-3 rounded-[26px] border border-slate-200 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                        <CalendarDays size={20} />
                      </span>
                      <div>
                        <p className="text-base font-bold text-slate-900">{formatDate(record.date)}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Day-wise attendance record
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-semibold ${
                        statusStyles[record.status] || "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Average Attendance</h2>
            <p className="mt-1 text-sm text-slate-500">
              This pie chart shows the year-wise average attendance for {activeYear}.
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] xl:grid-cols-1 2xl:grid-cols-[0.95fr_1.05fr]">
              <AttendancePie percent={attendanceSummary.average} year={activeYear} />

              <div className="grid gap-3">
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Present</p>
                  <p className="mt-2 text-3xl font-black text-emerald-900">{attendanceSummary.present}</p>
                </div>
                <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Half-day</p>
                  <p className="mt-2 text-3xl font-black text-amber-900">{attendanceSummary.halfDay}</p>
                </div>
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Absent</p>
                  <p className="mt-2 text-3xl font-black text-rose-900">{attendanceSummary.absent}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total Days ({activeYear})</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{attendanceSummary.total}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <UserCircle2 size={24} />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Personal Profile</h2>
                <p className="text-sm text-slate-500">Student account information</p>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <span className="font-semibold">Name:</span> {linkedStudent?.studentName || user?.name || "-"}
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <span className="font-semibold">Email:</span> {user?.email || "-"}
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <span className="font-semibold">Registration No:</span> {linkedStudent?.registrationNo || "-"}
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <span className="font-semibold">Role:</span> Student
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Student Access Scope</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {accessItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNavigate(item.path)}
                  disabled={!item.path}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                    item.path
                      ? item.accent
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:-translate-y-0.5 hover:shadow-md"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                      : item.disabled
                        ? "cursor-default border-slate-200 bg-slate-50 text-slate-500"
                        : "cursor-default border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {item.label}
                    {item.path ? <ChevronRight size={15} /> : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
