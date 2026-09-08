export const INSTITUTIONS = {
  COLLEGE: "Sabarmati College of Nursing",
  SCHOOL: "Sabarmati School of Nursing",
};

export const ADMISSION_BATCHES = [
  "2021-2025",
  "2022-2026",
  "2023-2027",
  "2024-2028",
  "2025-2029",
  "2026-2030",
  "2026-2029",
  "2026-2028",
];

export const COURSE_CATALOG = [
  { institution: INSTITUTIONS.COLLEGE, course: "B.Sc Nursing", durationYears: 4 },
  { institution: INSTITUTIONS.COLLEGE, course: "M.Sc Nursing", durationYears: 2 },
  { institution: INSTITUTIONS.COLLEGE, course: "P.B.B.Sc Nursing", durationYears: 2 },
  { institution: INSTITUTIONS.SCHOOL, course: "ANM", durationYears: 2 },
  { institution: INSTITUTIONS.SCHOOL, course: "GNM", durationYears: 3 },
];

export const FEE_HEADS_BY_YEAR = {
  firstYear: [
    "Admission Fee",
    "Course Fee",
    "Registration Fee",
    "Practical Fee",
    "Library Fee",
    "Examination Fee",
    "Development Fee",
    "Clinical Training Fee",
    "Hostel Fee",
    "Travel Charges",
    "Uniform Fee",
    "Books & Study Materials",
    "Miscellaneous Charges",
    "Other Charges",
    "Scholarship",
    "Discount",
    "Fine",
  ],
  continuingYear: [
    "Course Fee",
    "Practical Fee",
    "Library Fee",
    "Examination Fee",
    "Development Fee",
    "Clinical Training Fee",
    "Hostel Fee",
    "Travel Charges",
    "Miscellaneous Charges",
    "Other Charges",
    "Scholarship",
    "Discount",
    "Fine",
  ],
};

export const BSC_NURSING_YEARLY_TOTAL = 80000;
export const LEGACY_DEFAULT_FEE = 50000;

export const BSC_NURSING_FEE_STRUCTURE = [
  { title: "Course Fee", amount: 50000, category: "Tuition" },
  { title: "Library Fee", amount: 10000, category: "Library" },
  { title: "Practical Fee", amount: 10000, category: "Practical" },
  { title: "Travel Charges", amount: 10000, category: "Transport" },
];

export function isBscNursingCourse(course = "") {
  const normalizedCourse = String(course).toLowerCase();
  return (
    normalizedCourse.includes("b.sc nursing") ||
    normalizedCourse.includes("bsc nursing") ||
    normalizedCourse.includes("bsc. (n)") ||
    normalizedCourse.includes("bsc (n)") ||
    normalizedCourse.includes("b.sc. (n)") ||
    normalizedCourse.includes("b.sc (n)")
  );
}

export function normalizeCourseName(course = "") {
  const value = String(course)
    .toUpperCase()
    .replaceAll(".", "")
    .replace(/\s+/g, " ")
    .trim();

  if (value.includes("POST BASIC") || value.includes("PBBSC") || value.includes("P B BSC") || value.includes("PB BSC")) {
    return "P.B.B.Sc Nursing";
  }
  if (value.includes("M SC") || value.includes("MSC")) return "M.Sc Nursing";
  if (value === "GNM" || value.includes("GENERAL NURSING")) return "GNM";
  if (value === "ANM" || value.includes("AUXILIARY NURSING")) return "ANM";
  if (value.includes("BSC") || value.includes("B SC")) return "B.Sc Nursing";

  return String(course || "").trim();
}

export function getCourseProfile(course = "") {
  const normalizedCourse = normalizeCourseName(course);
  return COURSE_CATALOG.find((item) => item.course === normalizedCourse) || null;
}

export function inferInstitutionFromCourse(course = "") {
  return getCourseProfile(course)?.institution || INSTITUTIONS.COLLEGE;
}

export function getCourseDurationYears(course = "") {
  return getCourseProfile(course)?.durationYears || 4;
}

export function buildAdmissionBatch(academicYear = "", course = "") {
  const startYear = Number.parseInt(String(academicYear).match(/\d{4}/)?.[0] || "", 10);
  if (!Number.isFinite(startYear)) return "";
  const durationYears = getCourseDurationYears(course);
  return `${startYear}-${startYear + durationYears}`;
}

export function getYearLabel(yearNumber = 1) {
  const normalizedYear = Math.min(Math.max(Number.parseInt(yearNumber, 10) || 1, 1), 4);
  return ["First Year", "Second Year", "Third Year", "Fourth Year"][normalizedYear - 1];
}

export function buildCourseYearFeeStructure({ course = "", academicYear = "", admissionBatch = "", dueDate = "" } = {}) {
  const normalizedCourse = normalizeCourseName(course);
  const profile = getCourseProfile(normalizedCourse);
  const durationYears = profile?.durationYears || 4;
  const institution = profile?.institution || inferInstitutionFromCourse(normalizedCourse);
  const batch = admissionBatch || buildAdmissionBatch(academicYear, normalizedCourse);

  return Array.from({ length: durationYears }).flatMap((_, index) => {
    const studyYear = index + 1;
    const yearLabel = getYearLabel(studyYear);
    const heads = studyYear === 1 ? FEE_HEADS_BY_YEAR.firstYear : FEE_HEADS_BY_YEAR.continuingYear;
    return heads.map((title) => {
      const isCredit = ["Scholarship", "Discount"].includes(title);
      const amount = normalizedCourse === "B.Sc Nursing" && !isCredit
        ? BSC_NURSING_FEE_STRUCTURE.find((item) => {
            if (title === "Course Fee") return item.category === "Tuition";
            if (title === "Library Fee") return item.category === "Library";
            if (title === "Practical Fee") return item.category === "Practical";
            if (title === "Travel Charges") return item.category === "Transport";
            return false;
          })?.amount || 0
        : 0;

      return {
        title,
        amount,
        scope: "Structure",
        category: isCredit ? "Concession" : title,
        dueDate,
        status: "Pending",
        institution,
        course: normalizedCourse,
        admissionBatch: batch,
        academicYear,
        studyYear,
        yearLabel,
        active: true,
        note: `${institution} ${normalizedCourse} ${batch || "batch"} ${yearLabel} fee head`,
      };
    });
  });
}
