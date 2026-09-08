import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  BookOpen,
  CheckSquare,
  Download,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../config/api";
import { getStoredUser } from "../utils/auth";
import { canEditModule, getRoleLabel } from "../utils/permissions";

const STATUS = {
  Present: { bg: "#e8f5e9", text: "#1b5e20", dot: "#43a047", border: "#a5d6a7" },
  Absent: { bg: "#ffebee", text: "#b71c1c", dot: "#e53935", border: "#ef9a9a" },
  "Half-day": { bg: "#fff8e1", text: "#e65100", dot: "#fb8c00", border: "#ffe082" },
};

const AVATAR_BG = ["#1a237e", "#4a148c", "#880e4f", "#006064", "#1b5e20", "#bf360c", "#37474f"];

const STUDENT_COURSE_GROUPS = [
  { key: "BSC_N", label: "BSC (N)",  },
  { key: "PBBSC_N", label: "P. BBSC (N)",  },
  { key: "GNM", label: "GNM",  },
  { key: "ANM", label: "ANM",  },
  { key: "MSC_N", label: "M.SC (N)", },
];

const ATT_TABS = [
  { key: "mark", label: "Mark Attendance" },
  { key: "logs", label: "Attendance Logs" },
  { key: "summary", label: "Summary" },
];

const SECTION_TABS = [
  {
    key: "student",
    label: "Student Attendance",
    icon: Users,
    activeBg: "#2563eb",
    activeShadow: "rgba(37,99,235,0.35)",
  },
  {
    key: "teacher",
    label: "Teacher Attendance",
    icon: BookOpen,
    activeBg: "#059669",
    activeShadow: "rgba(5,150,105,0.35)",
  },
];

const ATTENDANCE_CONFIG = {
  student: {
    title: "Student Attendance",
    shortTitle: "Students",
    entityLabel: "Student",
    peopleLabel: "students",
    recordsPath: "/api/attendance",
    peoplePath: "/api/students",
    idField: "studentId",
    nameField: "studentName",
    normalizePerson: normalizeStudent,
  },
  teacher: {
    title: "Teacher Attendance",
    shortTitle: "Teachers",
    entityLabel: "Teacher",
    peopleLabel: "teachers",
    recordsPath: "/api/teacher-attendance",
    peoplePath: "/api/teachers",
    idField: "teacherId",
    nameField: "teacherName",
    normalizePerson: normalizeTeacher,
  },
};

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function getStudentCourseGroup(course = "") {
  const normalized = String(course).toLowerCase().replace(/[^a-z0-9]/g, "");

  if (normalized.includes("msc")) return "MSC_N";
  if (normalized.includes("pbbsc") || normalized.includes("postbasic")) return "PBBSC_N";
  if (normalized === "gnm") return "GNM";
  if (normalized === "anm") return "ANM";
  if (normalized.includes("bscnursing") || normalized === "bscn") return "BSC_N";
  return "";
}

function getCourseGroupDetails(course = "") {
  const key = getStudentCourseGroup(course);
  return STUDENT_COURSE_GROUPS.find((item) => item.key === key) || null;
}

function formatDisplayTime(value) {
  if (!value) return "-";
  const [hours, minutes] = String(value).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitials(name = "") {
  return name
    .split(" ")
    .map((word) => word[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeAttendanceRecords(records, { idField, nameField }) {
  return Array.isArray(records)
    ? records
        .filter((record) => record && record[idField] && record[nameField] && record.date && record.status)
        .map((record) => ({
          ...record,
          entityId: record[idField],
          entityName: record[nameField],
        }))
    : [];
}

function normalizeStudent(student) {
  const studentId =
    student.registrationNo || student.admissionNumber || student.email || student.phone || student._id;
  const studentName = student.studentName || student.fullName;

  return {
    id: studentId,
    name: studentName,
    year: student.year || "",
    course: student.course || "",
  };
}

function normalizeTeacher(teacher) {
  const teacherId = teacher.employeeId || teacher.staffId || teacher.email || teacher.phone || teacher._id;
  const teacherName = teacher.teacherName || teacher.fullName || teacher.name;

  return {
    id: teacherId,
    name: teacherName,
    year: teacher.department || "",
    course: teacher.subject || teacher.subjectExpertise || "",
  };
}

function escapeCsvCell(value) {
  const stringValue = value == null ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return false;
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row?.[header] ?? "")).join(",")),
  ];

  const blob = new Blob([`\ufeff${lines.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return true;
}

function formatDisplayDate(value) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Avatar({ name, idx = 0, size = 44 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: AVATAR_BG[idx % AVATAR_BG.length],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: size * 0.32,
        fontWeight: 700,
        letterSpacing: 0.5,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function Badge({ status }) {
  const colors = STATUS[status] || STATUS.Present;
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        border: `1.5px solid ${colors.border}`,
        borderRadius: 999,
        padding: "5px 14px",
        fontSize: 12,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: colors.dot,
          display: "inline-block",
        }}
      />
      {status}
    </span>
  );
}

function StatCard({ label, value, color, icon, sub }) {
  const Icon = icon;
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: "22px 24px",
        border: "1px solid #e8eaf6",
        borderLeft: `5px solid ${color}`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        transition: "transform .2s, box-shadow .2s",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-3px)";
        event.currentTarget.style.boxShadow = "0 10px 32px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "";
        event.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#90a4ae", textTransform: "uppercase" }}>
          {label}
        </span>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            background: `${color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={20} color={color} />
        </div>
      </div>
      <span style={{ fontSize: 42, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{value}</span>
      {sub ? <span style={{ fontSize: 12, color: "#90a4ae", fontWeight: 500 }}>{sub}</span> : null}
    </div>
  );
}

function ProgressBar({ pct }) {
  const color = pct >= 75 ? "#43a047" : pct >= 50 ? "#fb8c00" : "#e53935";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, height: 9, background: "#f0f4f8", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999, transition: "width .6s" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#455a64", minWidth: 40, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = { success: "#2e7d32", error: "#c62828", info: "#1565c0" };

  return (
    <div
      className="toast-root"
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        background: colors[type] || colors.info,
        color: "#fff",
        padding: "16px 22px",
        borderRadius: 16,
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontSize: 14,
        fontWeight: 600,
        maxWidth: 380,
        animation: "toastIn .3s cubic-bezier(.22,1,.36,1)",
      }}
    >
      <span style={{ flex: 1 }}>{msg}</span>
      <button
        onClick={onClose}
        style={{
          background: "rgba(255,255,255,0.22)",
          border: "none",
          color: "#fff",
          width: 26,
          height: 26,
          borderRadius: "50%",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
        }}
      >
        x
      </button>
    </div>
  );
}

export default function AttendanceSystem() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const role = currentUser?.role || "student";
  const isStudentView = role === "student";
  const isSuperAdmin = role === "super_admin";
  const canEditAttendance = canEditModule(role, "/dashboard/academichub/attedence");
  const canExportAttendance = isSuperAdmin;
  const [section, setSection] = useState("student");
  const [activeTab, setActiveTab] = useState(isStudentView ? "logs" : "mark");
  const [attTab, setAttTab] = useState(isStudentView ? "logs" : "mark");
  const [attendanceDate, setAttendanceDate] = useState(today());
  const [attendanceTime, setAttendanceTime] = useState(currentTime());
  const [status, setStatus] = useState("Present");
  const [dateFilter, setDateFilter] = useState(today());
  const [courseFilter, setCourseFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedIdsBySection, setSelectedIdsBySection] = useState({ student: [], teacher: [] });
  const [sectionData, setSectionData] = useState({
    student: { records: [], people: [], loaded: false, available: true },
    teacher: { records: [], people: [], loaded: false, available: true, loadMessage: "" },
  });

  const currentConfig = ATTENDANCE_CONFIG[section];
  const currentData = sectionData[section];
  const currentLoadMessage = currentData.loadMessage || "";
  const currentSelectedIds = useMemo(
    () => selectedIdsBySection[section] || [],
    [section, selectedIdsBySection]
  );

  const notify = useCallback((msg, type = "success") => {
    setToast({ msg, type });
  }, []);

  const loadSectionData = useCallback(async (sectionKey) => {
    const config = ATTENDANCE_CONFIG[sectionKey];

    if (isStudentView && sectionKey === "teacher") {
      setSectionData((prev) => ({
        ...prev,
        teacher: {
          records: [],
          people: [],
          loaded: true,
          available: false,
          loadMessage: "Teacher attendance is available only for admin and super admin users.",
        },
      }));
      return;
    }

    try {
      const [recordsData, peopleData] = await Promise.all(
        isStudentView && sectionKey === "student"
          ? [
              apiRequest("/api/attendance/me"),
              apiRequest("/api/students/me/profile"),
            ]
          : [
              apiRequest(config.recordsPath),
              apiRequest(config.peoplePath),
            ]
      );

      setSectionData((prev) => ({
        ...prev,
        [sectionKey]: {
          records: normalizeAttendanceRecords(recordsData, config),
          people: (
            isStudentView && sectionKey === "student"
              ? [peopleData?.student]
              : peopleData
          )
            .map(config.normalizePerson)
            .filter((person) => person.id && person.name),
          loaded: true,
          available: true,
          loadMessage: "",
        },
      }));
    } catch (error) {
      if (sectionKey === "teacher") {
        setSectionData((prev) => ({
          ...prev,
          teacher: {
            records: [],
            people: [],
            loaded: true,
            available: true,
            loadMessage: error.message,
          },
        }));
      } else {
        notify(error.message, "error");
        setSectionData((prev) => ({
          ...prev,
          student: {
            ...prev.student,
            loaded: true,
          },
        }));
      }
    }
  }, [isStudentView, notify]);

  useEffect(() => {
    loadSectionData("student");
  }, [loadSectionData]);

  useEffect(() => {
    if (section === "teacher" && !sectionData.teacher.loaded) {
      loadSectionData("teacher");
    }
  }, [isStudentView, loadSectionData, section, sectionData.teacher.loaded]);

  const currentRecords = useMemo(() => currentData.records || [], [currentData.records]);
  const currentPeople = useMemo(() => currentData.people || [], [currentData.people]);
  const peopleById = useMemo(
    () => new Map(currentPeople.map((person) => [person.id, person])),
    [currentPeople]
  );
  const yearOptions = useMemo(
    () => [...new Set(currentPeople.map((person) => person.year).filter(Boolean))].sort().reverse(),
    [currentPeople]
  );
  const filteredPeople = useMemo(
    () =>
      section !== "student"
        ? currentPeople
        : currentPeople.filter((person) => {
            const matchesCourse =
              courseFilter === "All" || getStudentCourseGroup(person.course) === courseFilter;
            const matchesYear = yearFilter === "All" || person.year === yearFilter;
            return matchesCourse && matchesYear;
          }),
    [courseFilter, currentPeople, section, yearFilter]
  );
  const scopedRecords = useMemo(
    () =>
      section !== "student"
        ? currentRecords
        : currentRecords.filter((record) => {
            const person = peopleById.get(record.entityId);
            const recordCourse = record.course || person?.course || "";
            const recordYear = record.academicYear || person?.year || "";
            const matchesCourse =
              courseFilter === "All" || getStudentCourseGroup(recordCourse) === courseFilter;
            const matchesYear = yearFilter === "All" || recordYear === yearFilter;
            return matchesCourse && matchesYear;
          }),
    [courseFilter, currentRecords, peopleById, section, yearFilter]
  );
  const visibleSelectedIds = useMemo(
    () => currentSelectedIds.filter((id) => filteredPeople.some((person) => person.id === id)),
    [currentSelectedIds, filteredPeople]
  );
  const currentSelectedCount = visibleSelectedIds.length;

  const todayRecs = useMemo(
    () => scopedRecords.filter((record) => record.date === today()),
    [scopedRecords]
  );

  const filteredRecs = useMemo(
    () => (dateFilter ? scopedRecords.filter((record) => record.date === dateFilter) : scopedRecords),
    [dateFilter, scopedRecords]
  );

  const stats = useMemo(
    () => ({
      total: todayRecs.length,
      present: todayRecs.filter((record) => record.status === "Present").length,
      absent: todayRecs.filter((record) => record.status === "Absent").length,
      halfday: todayRecs.filter((record) => record.status === "Half-day").length,
    }),
    [todayRecs]
  );

  const summary = useMemo(
    () =>
      filteredPeople.map((person, idx) => {
        const records = scopedRecords.filter((record) => record.entityId === person.id);
        const present = records.filter((record) => record.status === "Present").length;
        const absent = records.filter((record) => record.status === "Absent").length;
        const half = records.filter((record) => record.status === "Half-day").length;
        const total = present + absent + half;
        const pct = total ? Math.round(((present + half * 0.5) / total) * 100) : 0;
        return { ...person, present, absent, half, total, pct, idx };
      }),
    [filteredPeople, scopedRecords]
  );

  useEffect(() => {
    if (!isStudentView) {
      return;
    }

    setSection("student");
    if (activeTab === "mark") {
      setActiveTab("logs");
    }
    if (attTab === "mark") {
      setAttTab("logs");
    }
  }, [activeTab, attTab, isStudentView]);

  const handleSectionChange = (nextSection) => {
    if (isStudentView && nextSection !== "student") {
      return;
    }

    setSection(nextSection);
    const defaultTab = isStudentView ? "logs" : "mark";
    setActiveTab(defaultTab);
    setAttTab(defaultTab);
    setStatus("Present");
    setSelectedIdsBySection((prev) => ({ ...prev, [nextSection]: [] }));
    setDateFilter(today());
    setCourseFilter("All");
    setYearFilter("All");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canEditAttendance) {
      notify("You have view-only access to attendance.", "info");
      return;
    }

    if (!currentData.available) {
      notify(`Unable to load ${currentConfig.title.toLowerCase()} data right now. Please retry.`, "info");
      return;
    }

    const selectedIds = visibleSelectedIds;
    if (selectedIds.length === 0) {
      notify(
        `Please select at least one ${currentConfig.entityLabel.toLowerCase()}`,
        "error"
      );
      return;
    }

    if (!attendanceDate) {
      notify("Please choose an attendance date", "error");
      return;
    }
    if (!attendanceTime) {
      notify("Please choose an attendance time", "error");
      return;
    }

    setSubmitting(true);
    try {
      const selectedPeople = selectedIds.map((id) => currentPeople.find((item) => item.id === id)).filter(Boolean);
      if (selectedPeople.length !== selectedIds.length) {
        throw new Error(`One or more selected ${currentConfig.peopleLabel} could not be found`);
      }

      const responses = await Promise.all(
        selectedPeople.map((person) =>
          apiRequest(currentConfig.recordsPath, {
            method: "POST",
            body: JSON.stringify({
              date: attendanceDate,
              checkIn: attendanceTime,
              status,
              ...(section === "student"
                ? {
                    course: person.course,
                    academicYear: person.year,
                  }
                : {}),
              [currentConfig.idField]: person.id,
              [currentConfig.nameField]: person.name,
            }),
          })
        )
      );

      if (responses.some((data) => !data.record)) {
        throw new Error("Attendance was not saved");
      }

      await loadSectionData(section);
      setDateFilter(attendanceDate);
      notify(
        section === "student"
          ? `${selectedPeople.length} student attendance record${selectedPeople.length !== 1 ? "s" : ""} saved`
          : responses[0]?.message || `${currentConfig.entityLabel} attendance saved for ${selectedPeople[0].name}`
      );
      setSelectedIdsBySection((prev) => ({ ...prev, [section]: [] }));
      setAttendanceDate(today());
      setAttendanceTime(currentTime());
      setStatus("Present");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!isSuperAdmin) {
      notify("Only super admin can delete attendance records.", "info");
      return;
    }

    if (!currentData.available) {
      notify(`Unable to load ${currentConfig.title.toLowerCase()} data right now. Please retry.`, "info");
      return;
    }

    setDeleteId(id);
    try {
      await apiRequest(`${currentConfig.recordsPath}/${id}`, { method: "DELETE" });

      setSectionData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          records: prev[section].records.filter((record) => record?._id !== id),
        },
      }));
      notify("Record deleted");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setDeleteId(null);
    }
  };

  const handleExportExcel = useCallback(() => {
    if (!canExportAttendance) {
      notify("Only super admin can download the Excel sheet.", "info");
      return;
    }

    let rows = [];
    const fileSuffix = dateFilter || attendanceDate || today();

    if (activeTab === "summary") {
      rows = summary.map((person) => ({
        Type: currentConfig.entityLabel,
        Name: person.name,
        ID: person.id,
        Course: getCourseGroupDetails(person.course)?.label || person.course || "",
        "Academic Year": person.year || "",
        Present: person.present,
        Absent: person.absent,
        "Half-day": person.half,
        "Total Days": person.total,
        "Attendance %": person.pct,
      }));
    } else {
      const sourceRecords = activeTab === "mark" ? todayRecs : filteredRecs;
      rows = sourceRecords.map((record) => ({
        Type: currentConfig.entityLabel,
        Name: record.entityName,
        ID: record.entityId,
        Course:
          getCourseGroupDetails(record.course || peopleById.get(record.entityId)?.course)?.label ||
          record.course ||
          peopleById.get(record.entityId)?.course ||
          "",
        "Academic Year":
          record.academicYear || peopleById.get(record.entityId)?.year || "",
        Date: formatDisplayDate(record.date),
        Time: formatDisplayTime(record.checkIn),
        Status: record.status,
      }));
    }

    const downloaded = downloadCsv(
      `${section}-attendance-${activeTab}-${fileSuffix || "all"}.csv`,
      rows
    );

    if (!downloaded) {
      notify("There is no attendance data to export.", "info");
      return;
    }

    notify("Attendance Excel sheet download started.");
  }, [activeTab, attendanceDate, canExportAttendance, currentConfig.entityLabel, dateFilter, filteredRecs, notify, peopleById, section, summary, todayRecs]);

  if (!sectionData.student.loaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ textAlign: "center", color: "#94a3b8" }}>
          <div style={{ width: 42, height: 42, border: "4px solid #e2e8f0", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 500 }}>Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #f1f5f9; }
        button, input, select { font: inherit; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 99px; }
        @keyframes toastIn { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .fade-up { animation: fadeUp .38s cubic-bezier(.22,1,.36,1) both; }
        .page-content {
          width: 100%;
          max-width: none;
          margin: 0;
        }

        @media (max-width: 1023px) {
          .hide-sm { display: none !important; }
          .page-main { padding: 16px 12px 28px !important; }
          .page-shell { min-height: auto !important; }
          .section-switcher {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
            padding: 8px !important;
          }
          .section-tab {
            width: 100%;
            justify-content: center;
            padding: 12px 10px;
            font-size: 12px;
            white-space: nowrap;
          }
          .att-switcher {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
            padding: 8px !important;
          }
          .att-tab {
            width: 100%;
            text-align: center;
            min-height: 44px;
            padding: 11px 8px;
            font-size: 12px;
            white-space: nowrap;
          }
          .stats-grid,
          .content-grid,
          .time-grid {
            grid-template-columns: 1fr !important;
          }
          .status-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .desktop-card {
            padding: 18px !important;
            border-radius: 18px !important;
          }
          .toast-root {
            left: 12px !important;
            right: 12px !important;
            top: 12px !important;
            max-width: none !important;
          }
          .records-list {
            max-height: none !important;
          }
          .records-item {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .records-actions {
            width: 100%;
            justify-content: space-between;
          }
          .records-head {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 14px;
          }
          .records-count {
            width: 44px !important;
            height: 44px !important;
            font-size: 18px !important;
          }
          .form-head {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 12px;
          }
          .date-chip {
            margin-left: 0 !important;
          }
          .table-card {
            border-radius: 18px !important;
          }
          .table-header {
            padding: 18px 18px 14px !important;
            flex-direction: column;
            align-items: flex-start !important;
          }
          .filter-tools {
            width: 100%;
            flex-direction: column;
            align-items: stretch !important;
          }
          .filter-date {
            width: 100% !important;
          }
          .responsive-table {
            min-width: 100% !important;
          }
          .responsive-table thead {
            display: none;
          }
          .responsive-table,
          .responsive-table tbody,
          .responsive-table tr,
          .responsive-table td {
            display: block;
            width: 100%;
          }
          .responsive-table tbody {
            padding: 12px;
          }
          .responsive-table tr {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            padding: 14px;
            margin-bottom: 12px;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
          }
          .responsive-table td {
            padding: 10px 0 !important;
            text-align: left !important;
            border: none !important;
          }
          .responsive-table td::before {
            content: attr(data-label);
            display: block;
            margin-bottom: 4px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1.1px;
            text-transform: uppercase;
            color: #94a3b8;
          }
          .responsive-table td.no-label::before {
            display: none;
          }
          .summary-person,
          .log-person {
            padding-bottom: 8px;
            border-bottom: 1px solid #eef2f7;
            margin-bottom: 4px;
          }
        }
        @media (max-width: 420px) {
          .section-tab {
            font-size: 11px;
            padding: 12px 8px;
            gap: 6px !important;
          }
          .att-switcher {
            grid-template-columns: 1fr !important;
          }
          .att-tab {
            white-space: normal;
          }
          .status-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (min-width: 1024px) {
          .page-content {
            max-width: 1600px;
            margin: 0 auto;
          }
        }

        .form-input {
          width: 100%; padding: 14px 16px; border-radius: 12px;
          border: 1.5px solid #e2e8f0; font-size: 15px; color: #1e293b;
          background: #f8fafc; outline: none;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .15s, box-shadow .15s;
        }
        .people-checklist {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 280px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .person-check-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          cursor: pointer;
          transition: all .18s;
        }
        .person-check-item:hover {
          border-color: #c7d2fe;
          background: #eef2ff;
        }
        .person-check-item input {
          width: 18px;
          height: 18px;
          accent-color: #4f46e5;
          cursor: pointer;
          flex-shrink: 0;
        }
        .person-check-item.active {
          border-color: #818cf8;
          background: #eef2ff;
          box-shadow: 0 8px 18px rgba(99,102,241,0.12);
        }
        .form-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); background: #fff; }
        select.form-input {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 14px center;
          background-color: #f8fafc; padding-right: 40px; cursor: pointer;
        }
        .tbl-row:hover td { background: #f5f3ff !important; }
        .del-btn {
          background: #fff5f5; border: 1.5px solid #fecaca; color: #dc2626;
          padding: 8px 18px; border-radius: 10px; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif;
        }
        .att-tab,
        .section-tab {
          padding: 10px 20px; border: none; cursor: pointer; font-family: 'DM Sans',sans-serif;
          font-size: 14px; font-weight: 600; border-radius: 10px; transition: all .18s;
        }
        .att-tab-active {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: #fff;
          box-shadow: 0 6px 18px rgba(99,102,241,0.28);
        }
        .section-tab-active { color: #fff; }
        .att-tab-inactive,
        .section-tab-inactive { background: transparent; color: #64748b; }
        .att-tab-inactive:hover,
        .section-tab-inactive:hover { background: #f1f5f9; color: #1e293b; }
      `}</style>

        {toast ? <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} /> : null}

      <div className="page-shell" style={{ minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <main className="page-main" style={{ flex: 1, padding: "28px 32px 60px", background: "#f1f5f9" }}>
            <div className="page-content">
              <div
                className="fade-up"
                style={{
                  marginBottom: 18,
                  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                  border: "1px solid #e2e8f0",
                  borderRadius: 24,
                  padding: "24px 26px",
                  boxShadow: "0 12px 36px rgba(15,23,42,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 12px",
                      borderRadius: 999,
                      background: isStudentView ? "#eff6ff" : "#ecfeff",
                      color: isStudentView ? "#1d4ed8" : "#0f766e",
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 12,
                    }}
                  >
                    {isStudentView ? <Eye size={14} /> : <ShieldCheck size={14} />}
                    {getRoleLabel(role)} {isStudentView ? "View" : "Access"}
                  </div>
                  <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>
                    Official Attendance Register
                  </h1>
                  <p style={{ marginTop: 8, color: "#64748b", fontSize: 14, maxWidth: 760, lineHeight: 1.6 }}>
                    {isStudentView
                      ? "You can view only your own student attendance records. Editing and teacher attendance are locked for student accounts."
                      : "Manage daily student and teacher attendance from one official register. Admin can mark attendance, and super admin can also download Excel-ready reports."}
                  </p>
                </div>

                {canExportAttendance ? (
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      border: "none",
                      borderRadius: 14,
                      padding: "14px 18px",
                      background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 14px 30px rgba(15,23,42,0.18)",
                    }}
                  >
                    <Download size={18} />
                    Download Excel Sheet
                  </button>
                ) : null}
              </div>

              {["mark", "logs", "summary"].includes(activeTab) ? (
                <div className="fade-up">
                <div className="section-switcher" style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", borderRadius: 14, padding: "6px 8px", marginBottom: 18, border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", width: "fit-content", flexWrap: "nowrap" }}>
                  {SECTION_TABS.filter(({ key }) => !isStudentView || key === "student").map(({ key, label, icon, activeBg, activeShadow }) => {
                    const Icon = icon;
                    const isActive = section === key;

                    return (
                      <button
                        key={key}
                        onClick={() => handleSectionChange(key)}
                        className={`section-tab ${isActive ? "section-tab-active" : "section-tab-inactive"}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          background: isActive ? activeBg : undefined,
                          boxShadow: isActive ? `0 4px 14px ${activeShadow}` : undefined,
                        }}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="att-switcher" style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", borderRadius: 14, padding: "6px 8px", marginBottom: 28, border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", width: "fit-content" }}>
                  {ATT_TABS.filter(({ key }) => canEditAttendance || key !== "mark").map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setAttTab(key);
                        setActiveTab(key);
                      }}
                      className={`att-tab ${(attTab === key || activeTab === key) ? "att-tab-active" : "att-tab-inactive"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {section === "student" ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 14,
                      marginBottom: 24,
                      padding: 18,
                      borderRadius: 18,
                      border: "1px solid #dbeafe",
                      background: "#fff",
                      boxShadow: "0 4px 18px rgba(15,23,42,0.05)",
                    }}
                  >
                    <label>
                      <span style={{ display: "block", marginBottom: 8, fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: 1.1, textTransform: "uppercase" }}>
                        Nursing Course
                      </span>
                      <select
                        className="form-input"
                        value={courseFilter}
                        onChange={(event) => {
                          setCourseFilter(event.target.value);
                          setSelectedIdsBySection((prev) => ({ ...prev, student: [] }));
                        }}
                      >
                        <option value="All">All Nursing Courses</option>
                        {STUDENT_COURSE_GROUPS.map((course) => (
                          <option key={course.key} value={course.key}>
                            {course.label} 
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span style={{ display: "block", marginBottom: 8, fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: 1.1, textTransform: "uppercase" }}>
                        Academic Year
                      </span>
                      <select
                        className="form-input"
                        value={yearFilter}
                        onChange={(event) => {
                          setYearFilter(event.target.value);
                          setSelectedIdsBySection((prev) => ({ ...prev, student: [] }));
                        }}
                      >
                        <option value="All">All Academic Years</option>
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </label>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderRadius: 14, background: "#eff6ff", padding: "12px 16px" }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", letterSpacing: 1.1, textTransform: "uppercase" }}>
                          Students In Register
                        </p>
                        <p style={{ marginTop: 5, fontSize: 13, color: "#475569" }}>
                          {courseFilter === "All"
                            ? "All selected courses"
                            : `${STUDENT_COURSE_GROUPS.find((course) => course.key === courseFilter)?.label || "Course"} / ${yearFilter === "All" ? "all years" : yearFilter}`}
                        </p>
                      </div>
                      <strong style={{ fontSize: 28, color: "#1e3a8a" }}>{filteredPeople.length}</strong>
                    </div>
                  </div>
                ) : null}

                {currentLoadMessage ? (
                  <div style={{ background: "#fff", borderRadius: 24, padding: 32, border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>{currentConfig.title}</h2>
                    <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
                      We could not fully load the {currentConfig.title.toLowerCase()} data. The shared attendance UI is still available below.
                    </p>
                    <p style={{ color: "#c62828", fontSize: 13, marginTop: 8 }}>{currentLoadMessage}</p>
                    <button
                      type="button"
                      onClick={() => loadSectionData(section)}
                      style={{
                        marginTop: 18,
                        padding: "12px 18px",
                        borderRadius: 12,
                        border: "1px solid #cbd5e1",
                        background: "#f8fafc",
                        color: "#0f172a",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "'DM Sans',sans-serif",
                      }}
                    >
                      Retry Loading
                    </button>
                  </div>
                ) : null}

                {activeTab === "mark" && canEditAttendance ? (
                  <>
                    <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 20, marginBottom: 28 }}>
                      <StatCard label="Total Today" value={stats.total} color="#6366f1" icon={CheckSquare} sub="Records submitted" />
                      <StatCard label="Present" value={stats.present} color="#22c55e" icon={Users} sub="In attendance" />
                      <StatCard label="Absent" value={stats.absent} color="#ef4444" icon={Users} sub="Not present" />
                      <StatCard label="Half-day" value={stats.halfday} color="#f59e0b" icon={BookOpen} sub="Partial attendance" />
                    </div>

                    <div className="content-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 24 }}>
                      <div className="desktop-card" style={{ background: "#fff", borderRadius: 24, padding: 36, border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
                        <div className="form-head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 30 }}>
                          <div>
                            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{currentConfig.title}</h2>
                            <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 5 }}>
                              Fill in the details for the selected attendance date
                            </p>
                          </div>
                          <span className="date-chip" style={{ background: "#ede9fe", color: "#6366f1", fontSize: 12, fontWeight: 800, padding: "7px 15px", borderRadius: 99, border: "1.5px solid #c4b5fd", whiteSpace: "nowrap", marginLeft: 12 }}>
                            {attendanceDate} | {formatDisplayTime(attendanceTime)}
                          </span>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
                              Select {currentConfig.entityLabel}
                            </label>
                            {/* checkbox list */}
                              <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 16, background: "#fff", padding: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
                                  <p style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
                                    Tick {currentConfig.peopleLabel} one by one to mark attendance
                                  </p>
                                  <span style={{ fontSize: 12, fontWeight: 800, color: "#4f46e5", background: "#eef2ff", borderRadius: 999, padding: "6px 10px" }}>
                                    {currentSelectedCount} selected
                                  </span>
                                </div>
                                <div className="people-checklist">
                                  {filteredPeople.map((person, index) => {
                                    const checked = currentSelectedIds.includes(person.id);
                                    return (
                                      <label key={person.id} className={`person-check-item ${checked ? "active" : ""}`}>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(event) => {
                                            setSelectedIdsBySection((prev) => ({
                                              ...prev,
                                              [section]: event.target.checked
                                                ? [...(prev[section] || []), person.id]
                                                : (prev[section] || []).filter((id) => id !== person.id),
                                            }));
                                          }}
                                        />
                                        <Avatar name={person.name} idx={index} size={38} />
                                        <div style={{ minWidth: 0 }}>
                                          <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                                            {person.name}
                                          </p>
                                          <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                                            {person.id}
                                          </p>
                                          {section === "student" ? (
                                            <p style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                                              {getCourseGroupDetails(person.course)?.label || person.course || "Course not set"} | {person.year || "Year not set"}
                                            </p>
                                          ) : null}
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            {filteredPeople.length === 0 ? (
                              <div style={{ marginTop: 12, borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", padding: "14px 16px" }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                                  No {currentConfig.peopleLabel} are available yet.
                                </p>
                                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                                  Create {section === "teacher" ? "a teacher" : "a student"} first, then come back to mark attendance.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => navigate(section === "teacher" ? "/teachers" : "/students")}
                                  style={{
                                    marginTop: 12,
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    border: "1px solid #cbd5e1",
                                    background: "#fff",
                                    color: "#0f172a",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontFamily: "'DM Sans',sans-serif",
                                  }}
                                >
                                  Open {section === "teacher" ? "Teachers" : "Students"} Page
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>Attendance Date</label>
                            <input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} required className="form-input" />
                          </div>

                          <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>Attendance Time</label>
                            <input type="time" value={attendanceTime} onChange={(event) => setAttendanceTime(event.target.value)} required className="form-input" />
                          </div>

                          <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>Status</label>
                            <div className="status-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                              {["Present", "Absent", "Half-day"].map((option) => {
                                const colors = STATUS[option];
                                const active = status === option;
                                return (
                                  <button
                                    type="button"
                                    key={option}
                                    onClick={() => setStatus(option)}
                                    style={{
                                      padding: "14px 8px",
                                      borderRadius: 14,
                                      border: active ? `2.5px solid ${colors.dot}` : "1.5px solid #e2e8f0",
                                      background: active ? colors.bg : "#f8fafc",
                                      color: active ? colors.text : "#94a3b8",
                                      cursor: "pointer",
                                      fontSize: 13,
                                      fontWeight: 700,
                                      transition: "all .18s",
                                      fontFamily: "'DM Sans',sans-serif",
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      gap: 8,
                                    }}
                                  >
                                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: active ? colors.dot : "#e2e8f0", boxShadow: active ? `0 0 10px ${colors.dot}88` : "none", transition: "all .18s" }} />
                                    {option}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={submitting}
                            style={{
                              width: "100%",
                              padding: "16px",
                              background: submitting ? "#a5b4fc" : "linear-gradient(135deg, #4f46e5, #6366f1)",
                              color: "#fff",
                              border: "none",
                              borderRadius: 14,
                              fontSize: 16,
                              fontWeight: 800,
                              cursor: submitting ? "not-allowed" : "pointer",
                              boxShadow: "0 6px 24px rgba(99,102,241,0.38)",
                              transition: "all .2s",
                              fontFamily: "'DM Sans',sans-serif",
                            }}
                          >
                            {submitting ? "Saving..." : `Submit ${currentConfig.entityLabel} Attendance`}
                          </button>
                        </form>
                      </div>

                      <div className="desktop-card" style={{ background: "#fff", borderRadius: 24, padding: 28, border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column" }}>
                        <div className="records-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                          <div>
                            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Today's Records</h3>
                            <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{todayRecs.length} of {filteredPeople.length} {currentConfig.peopleLabel} marked</p>
                          </div>
                          <div className="records-count" style={{ width: 50, height: 50, borderRadius: "50%", background: "linear-gradient(135deg, #ede9fe, #c4b5fd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#6366f1" }}>
                            {todayRecs.length}
                          </div>
                        </div>

                        <div style={{ marginBottom: 20, padding: "14px 16px", background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                            <span>Present rate</span>
                            <span style={{ color: "#22c55e" }}>{stats.total ? Math.round((stats.present / stats.total) * 100) : 0}%</span>
                          </div>
                          <div style={{ height: 9, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${stats.total ? Math.round((stats.present / stats.total) * 100) : 0}%`, background: "linear-gradient(90deg,#22c55e,#4ade80)", borderRadius: 99, transition: "width .6s" }} />
                          </div>
                        </div>

                        {todayRecs.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "40px 0", color: "#cbd5e1", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ fontSize: 48, marginBottom: 14 }}>No records</div>
                            <p style={{ fontSize: 16, fontWeight: 600 }}>No records yet</p>
                            <p style={{ fontSize: 13, marginTop: 4 }}>Use the form to mark attendance</p>
                          </div>
                        ) : (
                          <div className="records-list" style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", flex: 1, maxHeight: 360 }}>
                            {todayRecs.map((record) => (
                              <div className="records-item" key={record._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", borderRadius: 16, padding: "13px 16px", border: "1px solid #e2e8f0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  <Avatar name={record.entityName} idx={currentPeople.findIndex((person) => person.id === record.entityId)} size={42} />
                                  <div>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{record.entityName}</p>
                                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{record.entityId}</p>
                                    <p style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                                      {section === "student"
                                        ? `${getCourseGroupDetails(record.course || peopleById.get(record.entityId)?.course)?.label || record.course || peopleById.get(record.entityId)?.course || "Course not set"} | ${record.academicYear || peopleById.get(record.entityId)?.year || "Year not set"} | `
                                        : ""}
                                      {formatDisplayTime(record.checkIn)}
                                    </p>
                                  </div>
                                </div>
                                <div className="records-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Badge status={record.status} />
                                  {isSuperAdmin ? (
                                    <button
                                      onClick={() => handleDelete(record._id)}
                                      disabled={deleteId === record._id}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 18, padding: 4, borderRadius: 8, transition: "color .15s", lineHeight: 1 }}
                                    >
                                      {deleteId === record._id ? "..." : "x"}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}

                {activeTab === "logs" ? (
                  <div className="table-card" style={{ background: "#fff", borderRadius: 24, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
                    <div className="table-header" style={{ padding: "24px 28px", borderBottom: "1px solid #f1f5f9", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                      <div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{currentConfig.title} Logs</h2>
                        <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{filteredRecs.length} record{filteredRecs.length !== 1 ? "s" : ""} found</p>
                      </div>
                      <div className="filter-tools" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <label style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase" }}>Filter by Date</label>
                        <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="form-input filter-date" style={{ width: "auto" }} />
                        <button
                          onClick={() => setDateFilter("")}
                          style={{ padding: "12px 20px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 14, color: "#475569", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, transition: "all .15s" }}
                        >
                          All Dates
                        </button>
                      </div>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table className="responsive-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: "#fafbff" }}>
                            {[
                              currentConfig.entityLabel,
                              ...(section === "student" ? ["Course", "Academic Year"] : []),
                              "Date",
                              "Time",
                              "Status",
                              ...(isSuperAdmin ? ["Action"] : []),
                            ].map((heading, index) => (
                              <th key={heading} style={{ padding: "14px 20px", textAlign: index === 0 ? "left" : "center", fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRecs.length === 0 ? (
                            <tr>
                              <td colSpan={(isSuperAdmin ? 4 : 3) + (section === "student" ? 2 : 0) + 1} style={{ textAlign: "center", padding: 60, color: "#cbd5e1" }}>
                                <div style={{ fontSize: 16, fontWeight: 600 }}>No records found</div>
                              </td>
                            </tr>
                          ) : filteredRecs.map((record) => (
                            <tr key={record._id} className="tbl-row">
                              <td className="no-label" style={{ padding: "15px 20px" }}>
                                <div className="log-person" style={{ display: "flex", alignItems: "center", gap: 13 }}>
                                  <Avatar name={record.entityName} idx={currentPeople.findIndex((person) => person.id === record.entityId)} size={42} />
                                  <div>
                                    <p style={{ fontWeight: 700, color: "#0f172a", fontSize: 14, lineHeight: 1.2 }}>{record.entityName}</p>
                                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{record.entityId}</p>
                                  </div>
                                </div>
                              </td>
                              {section === "student" ? (
                                <>
                                  <td data-label="Course" style={{ padding: "15px 20px", textAlign: "center", color: "#475569", fontSize: 13, fontWeight: 700 }}>
                                    {getCourseGroupDetails(record.course || peopleById.get(record.entityId)?.course)?.label || record.course || peopleById.get(record.entityId)?.course || "-"}
                                  </td>
                                  <td data-label="Academic Year" style={{ padding: "15px 20px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                                    {record.academicYear || peopleById.get(record.entityId)?.year || "-"}
                                  </td>
                                </>
                              ) : null}
                              <td data-label="Date" style={{ padding: "15px 20px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                                {formatDisplayDate(record.date)}
                              </td>
                              <td data-label="Time" style={{ padding: "15px 20px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                                {formatDisplayTime(record.checkIn)}
                              </td>
                              <td data-label="Status" style={{ padding: "15px 20px", textAlign: "center" }}><Badge status={record.status} /></td>
                              {isSuperAdmin ? (
                                <td data-label="Action" style={{ padding: "15px 20px", textAlign: "center" }}>
                                  <button className="del-btn" onClick={() => handleDelete(record._id)} disabled={deleteId === record._id}>
                                    {deleteId === record._id ? "..." : "Delete"}
                                  </button>
                                </td>
                              ) : null}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {activeTab === "summary" ? (
                  <div className="table-card" style={{ background: "#fff", borderRadius: 24, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
                    <div className="table-header" style={{ padding: "24px 28px", borderBottom: "1px solid #f1f5f9" }}>
                      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{currentConfig.title} Summary</h2>
                      <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Attendance overview - {filteredPeople.length} filtered {currentConfig.peopleLabel}</p>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table className="responsive-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: "#fafbff" }}>
                            {[currentConfig.entityLabel, "Present", "Absent", "Half-day", "Total Days", "Attendance %"].map((heading, index) => (
                              <th key={heading} style={{ padding: "14px 20px", textAlign: index === 0 ? "left" : "center", fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {summary.map((person) => (
                            <tr key={person.id} className="tbl-row">
                              <td className="no-label" style={{ padding: "16px 20px" }}>
                                <div className="summary-person" style={{ display: "flex", alignItems: "center", gap: 13 }}>
                                  <Avatar name={person.name} idx={person.idx} size={44} />
                                  <div>
                                    <p style={{ fontWeight: 700, color: "#0f172a", fontSize: 14, lineHeight: 1.2 }}>{person.name}</p>
                                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{person.id}</p>
                                    {section === "student" ? (
                                      <p style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                                        {getCourseGroupDetails(person.course)?.label || person.course || "Course not set"} | {person.year || "Year not set"}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td data-label="Present" style={{ padding: "16px 20px", textAlign: "center" }}><span style={{ fontWeight: 800, color: "#16a34a", fontSize: 19 }}>{person.present}</span></td>
                              <td data-label="Absent" style={{ padding: "16px 20px", textAlign: "center" }}><span style={{ fontWeight: 800, color: "#dc2626", fontSize: 19 }}>{person.absent}</span></td>
                              <td data-label="Half-day" style={{ padding: "16px 20px", textAlign: "center" }}><span style={{ fontWeight: 800, color: "#d97706", fontSize: 19 }}>{person.half}</span></td>
                              <td data-label="Total Days" style={{ padding: "16px 20px", textAlign: "center", color: "#475569", fontWeight: 700, fontSize: 16 }}>{person.total}</td>
                              <td data-label="Attendance %" style={{ padding: "16px 20px", minWidth: 210 }}>
                                {person.total === 0 ? <span style={{ color: "#cbd5e1", fontSize: 13 }}>No records yet</span> : <ProgressBar pct={person.pct} />}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
                </div>
              ) : (
                <div className="fade-up" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
                  <div style={{ textAlign: "center", color: "#94a3b8" }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>Under construction</div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>
                      {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Page
                    </h2>
                    <p style={{ fontSize: 14 }}>This section is under construction.</p>
                  </div>
                </div>
              )}
            </div>
          </main>

        </div>
      </div>
    </>
  );
}  
