import { useCallback, useEffect, useState, useMemo } from "react";
import {
  AlertCircle,
  BadgeIndianRupee,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Edit,
  GraduationCap,
  IndianRupee,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { apiRequest } from "../config/api";
import { getStoredUser } from "../utils/auth";
import { normalizeRole } from "../utils/permissions";

const COURSES = [
  "B.Sc Nursing",
  "M.Sc Nursing",
  "P.B.B.Sc Nursing",
  "ANM",
  "GNM",
];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function inferInstitutionFromCourse(course = "") {
  if (["B.Sc Nursing", "M.Sc Nursing", "P.B.B.Sc Nursing"].includes(course)) {
    return "Sabarmati College of Nursing";
  }
  if (["ANM", "GNM"].includes(course)) {
    return "Sabarmati School of Nursing";
  }
  return "";
}

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeAcademicYear(value = "") {
  const year = String(value || "").trim();
  const shortYearMatch = year.match(/^(\d{4})-(\d{2})$/);

  if (shortYearMatch) {
    const [, startYear, shortEndYear] = shortYearMatch;
    return `${startYear}-${startYear.slice(0, 2)}${shortEndYear}`;
  }

  return year;
}

function getStudentDisplayName(student) {
  return student?.studentName || student?.fullName || "Student";
}

function getStudentAdmissionYear(student, fallbackYear = "") {
  return normalizeAcademicYear(student?.year || student?.academicYear || student?.admissionYear || fallbackYear);
}

function getStudentAdmissionAmount(student) {
  return student?.baseFee ?? student?.totalFee ?? student?.pendingAmount ?? "";
}

function getStudentInstitution(student) {
  return student?.institution || inferInstitutionFromCourse(student?.course);
}

function getConfigStudentName(config) {
  return config?.studentName || (config?.studentId ? "Student" : "All Students");
}

function FilterSelect({ icon, value, onChange, children, label, className = "" }) {
  return (
    <label
      className={`flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[#dce7f4] bg-[#f8fbff] px-4 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 ${className}`}
    >
      {icon}
      <select
        aria-label={label}
        title={label}
        value={value}
        onChange={onChange}
        className="min-w-0 flex-1 appearance-none truncate bg-transparent pr-7 text-sm font-semibold text-slate-800 outline-none cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown size={16} strokeWidth={2.2} className="-ml-7 shrink-0 text-slate-700 pointer-events-none" aria-hidden="true" />
    </label>
  );
}

export default function Admissionfees() {
  const [configs, setConfigs] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [currentAcademicYear, setCurrentAcademicYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newConfig, setNewConfig] = useState({
    course: "",
    academicYear: "",
    amount: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");
  const [newConfigInstitution, setNewConfigInstitution] = useState("");
  const [studentOptions, setStudentOptions] = useState([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const selectedStudent = useMemo(() => {
    return studentOptions.find((student) => (student._id || student.id) === selectedStudentId) || null;
  }, [selectedStudentId, studentOptions]);

  const filteredStudentOptions = useMemo(() => {
    const selectedInstitution = normalizeText(newConfigInstitution);
    const selectedCourse = normalizeText(newConfig.course);
    const selectedAdmissionYear = normalizeAcademicYear(newConfig.academicYear);

    const matched = studentOptions
      .filter((student) => {
        const studentInstitution = normalizeText(getStudentInstitution(student));
        const studentCourse = normalizeText(student.course);
        const studentYear = normalizeAcademicYear(getStudentAdmissionYear(student));

        if (selectedInstitution && studentInstitution !== selectedInstitution) {
          return false;
        }
        if (selectedCourse && studentCourse !== selectedCourse) {
          return false;
        }
        if (selectedAdmissionYear && studentYear !== selectedAdmissionYear) {
          return false;
        }

        return true;
      })
      .slice(0, 50);

    if (selectedStudent && !matched.some((student) => (student._id || student.id) === selectedStudentId)) {
      matched.unshift(selectedStudent);
    }

    return matched;
  }, [newConfig.academicYear, newConfig.course, newConfigInstitution, selectedStudent, selectedStudentId, studentOptions]);

  const filteredNewCourses = useMemo(() => {
    if (newConfigInstitution === "Sabarmati College of Nursing") {
      return ["B.Sc Nursing", "M.Sc Nursing", "P.B.B.Sc Nursing"];
    }
    if (newConfigInstitution === "Sabarmati School of Nursing") {
      return ["ANM", "GNM"];
    }
    return COURSES;
  }, [newConfigInstitution]);

  const filteredConfigs = useMemo(() => {
    return configs.filter((config) => {
      if (courseFilter !== "All" && config.course !== courseFilter) {
        return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const courseMatch = config.course?.toLowerCase().includes(term);
        const studentMatch = config.studentName?.toLowerCase().includes(term);
        const studentEmailMatch = config.studentEmail?.toLowerCase().includes(term);
        const registrationMatch = config.registrationNo?.toLowerCase().includes(term);
        const yearMatch = config.academicYear?.toLowerCase().includes(term);
        const amountMatch = config.amount?.toString().includes(term);
        if (!courseMatch && !studentMatch && !studentEmailMatch && !registrationMatch && !yearMatch && !amountMatch) {
          return false;
        }
      }
      return true;
    });
  }, [configs, courseFilter, searchTerm]);

  const user = getStoredUser();
  const userRole = normalizeRole(user?.role || "");
  const isAdmin = ["admin", "finance_admin", "super_admin"].includes(userRole);

  const loadStudentOptions = async () => {
    if (studentOptions.length > 0 || studentLoading) {
      return;
    }

    try {
      setStudentLoading(true);
      const response = await apiRequest("/api/students");
      setStudentOptions(Array.isArray(response) ? response : []);
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Unable to load students for search" });
    } finally {
      setStudentLoading(false);
    }
  };

  const openAddForm = () => {
    setNewConfig((current) => ({
      ...current,
      academicYear: current.academicYear || selectedYear || currentAcademicYear,
    }));
    setShowAddForm(true);
    loadStudentOptions();
  };

  const selectedStudentMatchesFilters = useCallback((student) => {
    if (!student) {
      return true;
    }

    const selectedInstitution = normalizeText(newConfigInstitution);
    const selectedCourse = normalizeText(newConfig.course);
    const selectedAdmissionYear = normalizeAcademicYear(newConfig.academicYear);
    const studentInstitution = normalizeText(getStudentInstitution(student));
    const studentCourse = normalizeText(student.course);
    const studentYear = normalizeAcademicYear(getStudentAdmissionYear(student));

    return (
      (!selectedInstitution || studentInstitution === selectedInstitution)
      && (!selectedCourse || studentCourse === selectedCourse)
      && (!selectedAdmissionYear || studentYear === selectedAdmissionYear)
    );
  }, [newConfig.academicYear, newConfig.course, newConfigInstitution]);

  const handleStudentSelect = (studentId) => {
    setSelectedStudentId(studentId);
    const student = studentOptions.find((item) => (item._id || item.id) === studentId);
    if (!student) {
      return;
    }

    const studentCourse = COURSES.includes(student.course) ? student.course : "";
    const studentAcademicYear = getStudentAdmissionYear(student, selectedYear || currentAcademicYear);
    const studentAmount = getStudentAdmissionAmount(student);

    setNewConfig((prev) => ({
      ...prev,
      course: studentCourse || prev.course,
      academicYear: studentAcademicYear || prev.academicYear,
      amount: studentAmount !== "" ? String(studentAmount) : prev.amount,
    }));
    setNewConfigInstitution(getStudentInstitution(student));
  };

  useEffect(() => {
    if (selectedStudent && !selectedStudentMatchesFilters(selectedStudent)) {
      setSelectedStudentId("");
    }
  }, [selectedStudent, selectedStudentMatchesFilters]);

  const fetchConfigs = useCallback(async (yearOverride) => {
    try {
      setLoading(true);
      const yearToLoad = typeof yearOverride === "string" ? yearOverride : selectedYear;
      const params = yearToLoad ? { academicYear: yearToLoad } : {};
      const response = await apiRequest(`/api/admission-fee-config${buildQuery(params)}`);
      
      setConfigs(response.configs || []);
      setAcademicYears(response.academicYears || []);
      setCurrentAcademicYear(response.currentAcademicYear || "");
      
      if (!yearToLoad && response.currentAcademicYear) {
        setSelectedYear(response.currentAcademicYear);
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to load admission fee configurations" });
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfigs();
  }, [fetchConfigs]);

  const handleEdit = (config) => {
    setEditingId(config._id);
    setEditAmount(config.amount.toString());
  };

  const handleSaveEdit = async (id) => {
    try {
      await apiRequest(`/api/admission-fee-config/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ amount: Number(editAmount) }),
      });
      setMessage({ type: "success", text: "Admission fee updated successfully" });
      setEditingId(null);
      setEditAmount("");
      fetchConfigs();
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to update admission fee" });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this admission fee configuration?")) {
      return;
    }

    try {
      await apiRequest(`/api/admission-fee-config/${id}`, { method: "DELETE" });
      setMessage({ type: "success", text: "Admission fee configuration deleted successfully" });
      fetchConfigs();
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to delete admission fee configuration" });
    }
  };

  const handleAddConfig = async (e) => {
    e.preventDefault();
    
    if (!newConfig.course || !newConfig.academicYear || !newConfig.amount) {
      setMessage({ type: "error", text: "Please fill all fields" });
      return;
    }

    try {
      const savedAcademicYear = newConfig.academicYear;
      const studentPayload = selectedStudent
        ? {
            studentId: selectedStudent._id || selectedStudent.id || "",
            studentName: getStudentDisplayName(selectedStudent),
            studentEmail: selectedStudent.email || "",
            registrationNo: selectedStudent.registrationNo || selectedStudent.admissionNumber || "",
          }
        : {};

      await apiRequest("/api/admission-fee-config", {
        method: "POST",
        body: JSON.stringify({
          course: newConfig.course,
          academicYear: savedAcademicYear,
          amount: Number(newConfig.amount),
          ...studentPayload,
        }),
      });
      setMessage({ type: "success", text: "Admission fee configuration created successfully" });
      setNewConfig({ course: "", academicYear: "", amount: "" });
      setNewConfigInstitution("");
      setSelectedStudentId("");
      setShowAddForm(false);
      setSelectedYear(savedAcademicYear);
      fetchConfigs(savedAcademicYear);
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to create admission fee configuration" });
    }
  };

  const handleBulkUpdate = async () => {
    const fees = COURSES.map(course => ({
      course,
      amount: 50000,
    }));

    if (!selectedYear) {
      setMessage({ type: "error", text: "Please select an academic year first" });
      return;
    }

    if (!window.confirm(`Create fee configurations for all courses in ${selectedYear} with default amount ₹50,000?`)) {
      return;
    }

    try {
      await apiRequest("/api/admission-fee-config/bulk", {
        method: "POST",
        body: JSON.stringify({
          academicYear: selectedYear,
          fees,
        }),
      });
      setMessage({ type: "success", text: "Bulk admission fee configurations created successfully" });
      fetchConfigs();
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to create bulk configurations" });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-800">Access Denied</h3>
              <p className="text-red-600">You don't have permission to manage admission fees.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <BadgeIndianRupee className="w-8 h-8 text-indigo-600" />
                Admission Fee Management
              </h1>
              <p className="text-gray-600 mt-1">Manage admission fees by academic year and course</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchConfigs()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={openAddForm}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add New
              </button>
              <button
                onClick={handleBulkUpdate}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <GraduationCap className="w-4 h-4" />
                Bulk Create
              </button>
            </div>
          </div>

          {message.text && (
            <div
              className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
                message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {message.text}
            </div>
          )}

          {/* Search/Filter Bar */}
          <div className="mt-2 mb-6 grid gap-4 grid-cols-1 md:grid-cols-3">
            {/* Search Input */}
            <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[#dce7f4] bg-[#f8fbff] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
              <Search size={17} strokeWidth={1.9} className="shrink-0 text-slate-400" aria-hidden="true" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student, course or amount..."
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-[#8192b0]"
              />
            </label>

            {/* Academic Year Filter */}
            <FilterSelect
              icon={<Calendar size={16} strokeWidth={1.9} className="shrink-0 text-slate-400" aria-hidden="true" />}
              label="Choose Academic Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">All Years</option>
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year} {year === currentAcademicYear && "(Current)"}
                </option>
              ))}
            </FilterSelect>

            {/* Course Filter */}
            <FilterSelect
              icon={<GraduationCap size={16} strokeWidth={1.9} className="shrink-0 text-slate-400" aria-hidden="true" />}
              label="Choose Course"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            >
              <option value="All">All Courses</option>
              {COURSES.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </FilterSelect>
          </div>

          {showAddForm && (
            <form
              onSubmit={handleAddConfig}
              className="mt-2 mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6"
            >
              {/* School / College */}
              <FilterSelect
                icon={<Building2 size={16} strokeWidth={1.9} className="shrink-0 text-slate-400" aria-hidden="true" />}
                label="Choose School / College"
                value={newConfigInstitution}
                onChange={(e) => {
                  setNewConfigInstitution(e.target.value);
                  setNewConfig((prev) => ({ ...prev, course: "" }));
                }}
                className="lg:col-span-2"
              >
                <option value="">Choose School / College</option>
                <option value="Sabarmati College of Nursing">Sabarmati College of Nursing</option>
                <option value="Sabarmati School of Nursing">Sabarmati School of Nursing</option>
              </FilterSelect>

              {/* Course */}
              <FilterSelect
                icon={<GraduationCap size={16} strokeWidth={1.9} className="shrink-0 text-slate-400" aria-hidden="true" />}
                label="Choose Course"
                value={newConfig.course}
                onChange={(e) => setNewConfig({ ...newConfig, course: e.target.value })}
                className="lg:col-span-2"
              >
                <option value="">Choose Course</option>
                {filteredNewCourses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </FilterSelect>

              {/* Academic Year */}
              <FilterSelect
                icon={<Calendar size={16} strokeWidth={1.9} className="shrink-0 text-slate-400" aria-hidden="true" />}
                label="Choose Admission Year"
                value={newConfig.academicYear}
                onChange={(e) => setNewConfig({ ...newConfig, academicYear: e.target.value })}
                className="lg:col-span-2"
              >
                <option value="">Choose Admission Year</option>
                {academicYears.map((year) => (
                  <option key={year} value={year}>
                    {year} {year === currentAcademicYear && "(Current)"}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                icon={<UserRound size={16} strokeWidth={1.9} className="shrink-0 text-slate-400" aria-hidden="true" />}
                label="Choose Student"
                value={selectedStudentId}
                onChange={(e) => handleStudentSelect(e.target.value)}
                className="lg:col-span-2"
              >
                <option value="">
                  {studentLoading ? "Loading students..." : "Choose student from selected year / course"}
                </option>
                {!studentLoading && filteredStudentOptions.length === 0 && (
                  <option value="" disabled>No matching students found</option>
                )}
                {filteredStudentOptions.map((student) => (
                  <option key={student._id || student.id} value={student._id || student.id}>
                    {getStudentDisplayName(student)}{student.email ? ` - ${student.email}` : ""}
                  </option>
                ))}
              </FilterSelect>

              {selectedStudent && (
                <div className="flex min-h-12 min-w-0 flex-col justify-center rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-900 lg:col-span-2">
                  <span className="truncate font-semibold">
                    {getStudentDisplayName(selectedStudent)}
                  </span>
                  <span className="truncate">
                    {selectedStudent.email || "No email"} | {getStudentAdmissionYear(selectedStudent) || "No year"} | {selectedStudent.course || "No course"}
                  </span>
                </div>
              )}

              {/* Amount */}
              <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[#dce7f4] bg-[#f8fbff] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                <IndianRupee size={16} strokeWidth={1.9} className="shrink-0 text-slate-400" aria-hidden="true" />
                <input
                  type="number"
                  value={newConfig.amount}
                  onChange={(e) => setNewConfig({ ...newConfig, amount: e.target.value })}
                  placeholder="Enter amount"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-[#8192b0]"
                  min="0"
                  required
                />
              </label>

              {/* Save Button */}
              <button
                type="submit"
                className="flex h-12 items-center justify-center gap-2 px-6 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Save size={16} />
                Save
              </button>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewConfig({ course: "", academicYear: "", amount: "" });
                  setNewConfigInstitution("");
                  setSelectedStudentId("");
                }}
                className="flex h-12 items-center justify-center gap-2 px-6 bg-[#f8fbff] hover:bg-slate-100 text-slate-700 border border-[#dce7f4] rounded-2xl font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Cancel
              </button>
            </form>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading admission fee configurations...</p>
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Configurations Found</h3>
              <p className="text-gray-500 mb-4">
                {selectedYear
                  ? `No admission fee configurations found for ${selectedYear}`
                  : "No admission fee configurations found"}
              </p>
              <button
                onClick={openAddForm}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add First Configuration
              </button>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Matches Found</h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search term or filters to find what you're looking for.
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCourseFilter("All");
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-indigo-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700 rounded-tl-lg">Course</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Student Name</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Academic Year</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConfigs.map((config) => (
                    <tr key={config._id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-indigo-600" />
                          <span className="font-medium text-gray-800">{config.course}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-800">{getConfigStudentName(config)}</p>
                            {(config.studentEmail || config.registrationNo) && (
                              <p className="mt-0.5 truncate text-xs text-gray-500">
                                {[config.registrationNo, config.studentEmail].filter(Boolean).join(" | ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{config.academicYear}</td>
                      <td className="px-4 py-3">
                        {editingId === config._id ? (
                          <div className="flex items-center gap-2">
                            <IndianRupee className="w-4 h-4 text-gray-500" />
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              min="0"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <IndianRupee className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold text-gray-800">
                              {currencyFormatter.format(config.amount)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {config.academicYear === currentAcademicYear ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Current
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                            Archive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {editingId === config._id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(config._id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                title="Cancel"
                              >
                                <RefreshCcw className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(config)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(config._id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">1. Select Academic Year</h3>
              </div>
              <p className="text-sm text-gray-600">Choose the academic year for which you want to manage admission fees.</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-800">2. Set Course Fees</h3>
              </div>
              <p className="text-sm text-gray-600">Configure admission fees for each course. Students will pay based on their admission year.</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BadgeIndianRupee className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-800">3. Annual Updates</h3>
              </div>
              <p className="text-sm text-gray-600">Update fees each year as needed. Previous year configurations are preserved for records.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
