import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Funnel,
  GraduationCap,
  Search,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { apiRequest, downloadFile } from "../config/api";

const statusOptions = ["All", "Pending", "Approved"];
const defaultInstitutionOptions = [
  "Sabarmati College of Nursing",
  "Sabarmati School of Nursing",
];
const defaultCourseOptions = [
  { institution: "Sabarmati School of Nursing", course: "ANM" },
  { institution: "Sabarmati School of Nursing", course: "GNM" },
  { institution: "Sabarmati College of Nursing", course: "B.Sc Nursing" },
  { institution: "Sabarmati College of Nursing", course: "P.B.B.Sc Nursing" },
  { institution: "Sabarmati College of Nursing", course: "M.Sc Nursing" },
];
const supportedCourseLabels = new Set(defaultCourseOptions.map((item) => item.course));
const admissionYearOptions = Array.from({ length: 12 }, (_, index) => {
  const startYear = 2020 + index;
  return `${startYear}`;
});

function uniqueSortedValues(values = []) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true })
  );
}

function mergeCourseOptions(...courseGroups) {
  const courseMap = new Map();

  courseGroups.flat().filter(Boolean).forEach((item) => {
    if (!item.institution || !item.course) return;
    if (!supportedCourseLabels.has(item.course)) return;
    courseMap.set(`${item.institution}-${item.course}`, item);
  });

  return Array.from(courseMap.values()).sort((a, b) => {
    const institutionCompare = a.institution.localeCompare(b.institution);
    const courseCompare = a.course.localeCompare(b.course, undefined, { numeric: true });
    return institutionCompare || courseCompare;
  });
}

function isAdmissionYearLabel(value = "") {
  return /^\d{4}$/.test(String(value).trim());
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function FilterSelect({ icon, value, onChange, children, label, className = "" }) {
  return (
    <label
      className={`flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[#dce7f4] bg-[#f8fbff] px-4 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 ${className}`}
    >
      {icon || <Funnel size={16} strokeWidth={1.9} className="shrink-0 text-slate-400" aria-hidden="true" />}
      <select
        aria-label={label}
        title={label}
        value={value}
        onChange={onChange}
        className="min-w-0 flex-1 appearance-none truncate bg-transparent pr-7 text-sm font-semibold text-slate-800 outline-none"
      >
        {children}
      </select>
      <ChevronDown size={16} strokeWidth={2.2} className="-ml-7 shrink-0 text-slate-700" aria-hidden="true" />
    </label>
  );
}

const Students = () => {
  const [searchParams] = useSearchParams();
  const requestedYear = searchParams.get("year") || "All";
  const initialYearFilter = admissionYearOptions.includes(requestedYear) ? requestedYear : "All";
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState(initialYearFilter);
  const [institutionFilter, setInstitutionFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [admissionBatchFilter, setAdmissionBatchFilter] = useState("All");
  const sortBy = "latest";
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("database");
  const [recordsMessage, setRecordsMessage] = useState("");
  const [backendTotalRecords, setBackendTotalRecords] = useState(0);
  const [availableYears, setAvailableYears] = useState(admissionYearOptions);
  const [availableInstitutions, setAvailableInstitutions] = useState(defaultInstitutionOptions);
  const [availableCourses, setAvailableCourses] = useState(defaultCourseOptions);
  const [availableAdmissionBatches, setAvailableAdmissionBatches] = useState([]);
  const [batchWiseSummary, setBatchWiseSummary] = useState([]);

  useEffect(() => {
    setYearFilter(initialYearFilter);
  }, [initialYearFilter]);

  const fetchRecords = useCallback(async (filterOverride = null, options = {}) => {
    const activeFilters = {
      year: yearFilter,
      institution: institutionFilter,
      course: courseFilter,
      admissionBatch: admissionBatchFilter,
      sort: sortBy,
      ...(filterOverride || {}),
    };
    const silent = Boolean(options.silent);

    if (!silent) {
      setLoading(true);
    }
    setError("");
    setRecordsMessage("");

    try {
      const params = new URLSearchParams();
      if (activeFilters.year !== "All") {
        params.set("year", activeFilters.year);
      }
      if (activeFilters.institution !== "All") {
        params.set("institution", activeFilters.institution);
      }
      if (activeFilters.course !== "All") {
        params.set("course", activeFilters.course);
      }
      if (activeFilters.admissionBatch !== "All") {
        params.set("admissionBatch", activeFilters.admissionBatch);
      }
      if (activeFilters.sort) {
        params.set("sort", activeFilters.sort);
      }
      const query = params.toString();
      const response = await apiRequest(`/api/admission/records${query ? `?${query}` : ""}`);
      setRecords(response.records || []);
      setSourceLabel(response.source || "database");
      setRecordsMessage(response.message || "");
      setBackendTotalRecords(response.totalRecords || response.records?.length || 0);
      setBatchWiseSummary(response.batchWiseSummary || []);
      setAvailableYears(
        uniqueSortedValues([
          ...admissionYearOptions,
          ...((response.years || []).filter(isAdmissionYearLabel)),
        ])
      );
      setAvailableInstitutions(uniqueSortedValues([
        ...defaultInstitutionOptions,
        ...(response.institutions || []),
      ]));
      setAvailableCourses(mergeCourseOptions(defaultCourseOptions, response.courses || []));
      setAvailableAdmissionBatches(uniqueSortedValues(response.admissionBatches || []));
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [admissionBatchFilter, courseFilter, institutionFilter, sortBy, yearFilter]);

  const handleFetchAllRecords = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setYearFilter("All");
    setInstitutionFilter("All");
    setCourseFilter("All");
    setAdmissionBatchFilter("All");
    fetchRecords({
      year: "All",
      institution: "All",
      course: "All",
      admissionBatch: "All",
    });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchRecords();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchRecords]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchRecords(null, { silent: true });
    }, 10000);

    const refreshOnFocus = () => {
      fetchRecords(null, { silent: true });
    };

    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [fetchRecords]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const nextRecords = records.filter((record) => {
      const matchesStatus =
        statusFilter === "All" ? true : record.status === statusFilter;
      const matchesSearch = normalizedSearch
        ? [
            record.studentName,
            record.email,
            record.phone,
            record.course,
            record.institution,
            record.year,
            record.admissionYear,
            record.admissionBatch,
            record.applicationId,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch))
        : true;

      return matchesStatus && matchesSearch;
    });

    nextRecords.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.submittedAt) - new Date(b.submittedAt);
      }
      if (sortBy === "name-asc") {
        return a.studentName.localeCompare(b.studentName);
      }
      if (sortBy === "course-asc") {
        return a.course.localeCompare(b.course);
      }

      return new Date(b.submittedAt) - new Date(a.submittedAt);
    });

    return nextRecords;
  }, [records, searchTerm, statusFilter, sortBy]);

  const summary = useMemo(() => {
    const totalAdmissions = records.length;
    const pendingApplications = records.filter((record) => record.status === "Pending").length;
    const approvedAdmissions = records.filter((record) => record.status === "Approved").length;

    return {
      totalAdmissions,
      pendingApplications,
      approvedAdmissions,
    };
  }, [records]);

  const visibleCourseOptions = useMemo(() => {
    if (institutionFilter === "All") {
      return availableCourses;
    }
    return availableCourses.filter((item) => item.institution === institutionFilter);
  }, [availableCourses, institutionFilter]);

  const visibleBatchWiseSummary = useMemo(() => {
    const sourceRecords = filteredRecords;
    const summaryMap = new Map();

    sourceRecords.forEach((record) => {
      const admissionBatch = record.admissionBatch || "Unassigned";
      const institution = record.institution || "Unassigned";
      const course = record.course || "Unassigned";
      const year = record.admissionYear || "Unassigned";
      const key = `${institution}-${course}-${year}-${admissionBatch}`;
      const current = summaryMap.get(key) || {
        year,
        admissionBatch,
        institution,
        course,
        totalAdmissions: 0,
        pendingApplications: 0,
        approvedAdmissions: 0,
      };

      current.totalAdmissions += 1;
      if (record.status === "Approved") {
        current.approvedAdmissions += 1;
      } else {
        current.pendingApplications += 1;
      }
      summaryMap.set(key, current);
    });

    const fallbackSummary =
      !searchTerm.trim() && statusFilter === "All" && batchWiseSummary.length && yearFilter === "All" && institutionFilter === "All" && courseFilter === "All"
        ? batchWiseSummary
        : Array.from(summaryMap.values());

    return fallbackSummary.sort((a, b) => {
      const institutionCompare = String(a.institution).localeCompare(String(b.institution));
      const courseCompare = String(a.course).localeCompare(String(b.course), undefined, { numeric: true });
      const yearCompare = String(a.year).localeCompare(String(b.year), undefined, { numeric: true });
      const batchCompare = String(a.admissionBatch).localeCompare(String(b.admissionBatch), undefined, { numeric: true });
      return institutionCompare || courseCompare || batchCompare || yearCompare;
    });
  }, [batchWiseSummary, courseFilter, filteredRecords, institutionFilter, searchTerm, statusFilter, yearFilter]);

  const updateStatus = async (id, status) => {
    try {
      const response = await apiRequest(`/api/admission/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setRecords((current) =>
        current.map((record) => (record._id === id ? response.record : record))
      );
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  const handleExcelDownload = async () => {
    setDownloadLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (yearFilter !== "All") {
        params.set("year", yearFilter);
      }
      if (institutionFilter !== "All") {
        params.set("institution", institutionFilter);
      }
      if (courseFilter !== "All") {
        params.set("course", courseFilter);
      }
      if (admissionBatchFilter !== "All") {
        params.set("admissionBatch", admissionBatchFilter);
      }
      const query = params.toString();
      const filenameParts = [
        "admissions-export",
        yearFilter !== "All" ? yearFilter : "",
        institutionFilter !== "All" ? institutionFilter.replace(/\s+/g, "-") : "",
        courseFilter !== "All" ? courseFilter.replace(/\s+/g, "-") : "",
        admissionBatchFilter !== "All" ? admissionBatchFilter : "",
      ].filter(Boolean);
      await downloadFile(
        `/api/admission/export/xlsx${query ? `?${query}` : ""}`,
        `${filenameParts.join("-")}.xls`
      );
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <section className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(180deg,#eff6ff_0%,#f8fafc_48%,#e5e7eb_100%)] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                Admin Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Course admission management system
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Review live admission records, search applicants, filter by approval
                stage, institution, course, admission year, and admission batch while
                keeping downloadable Excel records aligned with Google Sheets.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleFetchAllRecords}
                className="inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Fetch All Data
              </button>
              <button
                type="button"
                onClick={() => fetchRecords()}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Refresh Records
              </button>
              <button
                type="button"
                onClick={handleExcelDownload}
                disabled={downloadLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1d4ed8_0%,#0f172a_100%)] px-5 py-3 text-sm font-semibold text-white transition hover:shadow-lg"
              >
                <Download size={16} />
                {downloadLoading ? "Downloading Excel..." : "Download Excel"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                    Total Admissions
                  </p>
                  <p className="mt-3 text-4xl font-black text-slate-900">
                    {summary.totalAdmissions}
                  </p>
                </div>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <UsersRound size={22} />
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-amber-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Pending Applications
                  </p>
                  <p className="mt-3 text-4xl font-black text-slate-900">
                    {summary.pendingApplications}
                  </p>
                </div>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Funnel size={22} />
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_100%)] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    Approved Admissions
                  </p>
                  <p className="mt-3 text-4xl font-black text-slate-900">
                    {summary.approvedAdmissions}
                  </p>
                </div>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={22} />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(300px,1.75fr)_repeat(5,minmax(150px,0.75fr))]">
            <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[#dce7f4] bg-[#f8fbff] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
              <Search size={17} strokeWidth={1.9} className="shrink-0 text-slate-400" aria-hidden="true" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, course, phone, email, or application ID"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-[#8192b0]"
              />
            </label>

            <FilterSelect
              label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
            </FilterSelect>

            <FilterSelect
              label="Choose admission year"
              value={yearFilter}
              onChange={(event) => {
                setYearFilter(event.target.value);
                setAdmissionBatchFilter("All");
              }}
            >
                <option value="All">Choose Admission Year</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
            </FilterSelect>

            <FilterSelect
              label="Choose school or college"
              value={institutionFilter}
              onChange={(event) => {
                setInstitutionFilter(event.target.value);
                setCourseFilter("All");
                setAdmissionBatchFilter("All");
              }}
            >
                <option value="All">Choose School / College</option>
                {availableInstitutions.map((institution) => (
                  <option key={institution} value={institution}>
                    {institution}
                  </option>
                ))}
            </FilterSelect>

            <FilterSelect
              icon={<GraduationCap size={16} strokeWidth={1.9} className="shrink-0 text-slate-400" aria-hidden="true" />}
              label="Choose course"
              value={courseFilter}
              onChange={(event) => {
                setCourseFilter(event.target.value);
                setAdmissionBatchFilter("All");
              }}
            >
                <option value="All">Choose Course</option>
                {visibleCourseOptions.map((item) => (
                  <option key={`${item.institution}-${item.course}`} value={item.course}>
                    {item.institution.includes("School") ? "School" : "College"} - {item.course}
                  </option>
                ))}
            </FilterSelect>

            <FilterSelect
              label="Choose admission batch"
              value={admissionBatchFilter}
              onChange={(event) => setAdmissionBatchFilter(event.target.value)}
            >
                <option value="All">Choose Admission Batch</option>
                {availableAdmissionBatches.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
            </FilterSelect>
          </div>
        </div>

        {admissionBatchFilter === "All" && (
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                  Admission Batch Wise Data
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  School and college admission data by year and batch
                </h2>
              </div>
              <span className="text-sm font-semibold text-slate-500">
                {visibleBatchWiseSummary.length} batch{visibleBatchWiseSummary.length === 1 ? "" : "es"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleBatchWiseSummary.map((item) => (
                <button
                  key={`${item.institution}-${item.course}-${item.year}-${item.admissionBatch}`}
                  type="button"
                  onClick={() => {
                    setInstitutionFilter(item.institution);
                    setCourseFilter(item.course || "All");
                    setYearFilter(item.year);
                    setAdmissionBatchFilter(item.admissionBatch);
                  }}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-black text-slate-900">{item.admissionBatch}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {item.institution}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        Course: {item.course || "-"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-blue-700">
                        Admission Year: {item.year || "-"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                      View
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total</p>
                      <p className="mt-1 text-xl font-black text-slate-900">{item.totalAdmissions}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Pending</p>
                      <p className="mt-1 text-xl font-black text-amber-700">{item.pendingApplications}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Approved</p>
                      <p className="mt-1 text-xl font-black text-emerald-700">{item.approvedAdmissions}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {recordsMessage && !error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {recordsMessage}
          </div>
        )}

        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Admission Records</h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredRecords.length} record{filteredRecords.length === 1 ? "" : "s"}.
                {backendTotalRecords !== filteredRecords.length ? ` Backend total: ${backendTotalRecords}.` : ""}
                {institutionFilter === "All" ? " All institutions." : ` Institution: ${institutionFilter}.`}
                {admissionBatchFilter === "All" ? " All batches." : ` Batch: ${admissionBatchFilter}.`}
                {yearFilter === "All" ? " All years." : ` Year: ${yearFilter}.`} Data source: {sourceLabel}.
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              <FileSpreadsheet size={16} />
              Google Sheets Ready
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[860px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Batch</th>
                  <th className="px-6 py-4">Submitted</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center text-slate-500">
                      Loading admission records...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center text-slate-500">
                      {backendTotalRecords > 0
                        ? `${backendTotalRecords} admission record${backendTotalRecords === 1 ? "" : "s"} found in backend. Current search or filters are hiding them. Use Fetch All Data to show everything.`
                        : "No admission records found in the connected backend yet."}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record._id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-5">
                        <button
                          type="button"
                          onClick={() => setSelectedProfile(record)}
                          className="group flex items-center gap-4 rounded-2xl px-2 py-2 text-left transition hover:bg-slate-100"
                        >
                          {record.photoUrl ? (
                            <img
                              src={record.photoUrl}
                              alt={record.studentName}
                              className="h-12 w-12 rounded-2xl object-cover shadow-sm ring-2 ring-transparent transition group-hover:ring-blue-200"
                            />
                          ) : (
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition group-hover:bg-blue-50 group-hover:text-blue-700">
                              <UsersRound size={20} />
                            </span>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-700">{record.studentName}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                              {record.applicationId || "No ID"}
                            </p>
                            <p className="mt-1 text-xs font-medium text-blue-600 opacity-0 transition group-hover:opacity-100">
                              View student profile
                            </p>
                          </div>
                        </button>
                      </td>
                      <td className="px-6 py-5 text-slate-600">
                        <p>{record.email || "-"}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">
                          {record.phone || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-medium text-slate-800">{record.course || "-"}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">
                          {record.institution || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-semibold text-slate-700">{record.admissionBatch || "-"}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">
                          Admission {record.admissionYear || record.year || "-"}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">
                          Academic {record.year || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-slate-600">{formatDate(record.submittedAt)}</td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            record.status === "Approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <button
                          type="button"
                          onClick={() =>
                            updateStatus(
                              record._id,
                              record.status === "Approved" ? "Pending" : "Approved"
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          <UserRoundCheck size={16} />
                          {record.status === "Approved" ? "Mark Pending" : "Approve"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedProfile && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
            <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
              <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.2)]">
              <div className="flex flex-col gap-4 border-b border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                <div className="flex min-w-0 items-center gap-4">
                  {selectedProfile.photoUrl ? (
                    <img
                      src={selectedProfile.photoUrl}
                      alt={selectedProfile.studentName}
                      className="h-14 w-14 rounded-3xl object-cover shadow-sm sm:h-16 sm:w-16"
                    />
                  ) : (
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-500 sm:h-16 sm:w-16">
                      <UsersRound size={28} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Student Profile</p>
                    <h3 className="mt-2 break-words text-xl font-black text-slate-900 sm:text-2xl">{selectedProfile.studentName || "-"}</h3>
                    <p className="mt-1 break-words text-sm text-slate-500">
                      {selectedProfile.applicationId || "No application ID"} • {selectedProfile.status}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProfile(null)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
                >
                  Close
                </button>
              </div>

              <div className="grid max-h-[calc(100vh-12rem)] gap-6 overflow-y-auto px-5 py-5 md:grid-cols-2 md:px-6 md:py-6">
                <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Contact</p>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Email</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Phone</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Address</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.address || "-"}</p>
                  </div>
                </div>

                <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Academic</p>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Course</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.course || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Institution</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.institution || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Admission Year</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.admissionYear || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Admission Batch</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.admissionBatch || "-"}</p>
                  </div>
                  {selectedProfile.mScSpecialization && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">M.Sc (N) Specialization</p>
                      <p className="mt-1 font-semibold text-slate-900">{selectedProfile.mScSpecialization}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Department</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.department || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Year</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.year || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Submitted</p>
                    <p className="mt-1 font-semibold text-slate-900">{formatDate(selectedProfile.submittedAt)}</p>
                  </div>
                </div>

                <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Personal</p>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Gender</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.gender || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Date of Birth</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.dob || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Caste Category</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.casteCategory || "-"}</p>
                  </div>
                </div>

                <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Application</p>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Application ID</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.applicationId || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.status || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sync Status</p>
                    <p className="mt-1 font-semibold text-slate-900">{selectedProfile.syncStatus || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </section>
  );
};

export default Students;
