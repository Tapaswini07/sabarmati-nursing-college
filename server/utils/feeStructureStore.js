import FeeStructure from "../models/FeeStructure.js";
import {
  BSC_NURSING_FEE_STRUCTURE,
  FEE_HEADS_BY_YEAR,
  buildAdmissionBatch,
  getCourseDurationYears,
  getYearLabel,
  inferInstitutionFromCourse,
  isBscNursingCourse,
  normalizeCourseName,
} from "../constants/feeStructures.js";

function uniqueId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBatchLabel(value = "") {
  return String(value || "").replace(/\s*[–—]\s*/g, "-").trim();
}

function normalizeComponent(component = {}, index = 0) {
  const title = String(component.title || component.name || "Fee Component").trim();
  const type = ["Scholarship", "Discount"].includes(title) ? "Credit" : String(component.type || "Debit").trim();

  return {
    componentId: String(component.componentId || component.chargeId || uniqueId(`CMP${index + 1}`)).trim(),
    title,
    category: String(component.category || title).trim(),
    amount: Math.max(toNumber(component.amount), 0),
    type,
    dueDate: String(component.dueDate || "").trim(),
    required: component.required !== false,
    note: String(component.note || "").trim(),
  };
}

function calculateYearTotal(components = [], fine = 0) {
  const total = components.reduce((sum, component) => {
    const amount = Math.max(toNumber(component.amount), 0);
    return component.type === "Credit" ? sum - amount : sum + amount;
  }, Math.max(toNumber(fine), 0));

  return Math.max(total, 0);
}

export function buildDefaultYearFees({ course = "", admissionBatch = "", academicYear = "", durationYears } = {}) {
  const years = Math.max(Math.min(toNumber(durationYears, getCourseDurationYears(course)), 4), 1);

  return Array.from({ length: years }).map((_, index) => {
    const studyYear = index + 1;
    const heads = studyYear === 1 ? FEE_HEADS_BY_YEAR.firstYear : FEE_HEADS_BY_YEAR.continuingYear;
    const components = heads.map((title, componentIndex) =>
      normalizeComponent({
        componentId: uniqueId(`Y${studyYear}C${componentIndex + 1}`),
        title,
        category: title,
        amount: isBscNursingCourse(course)
          ? BSC_NURSING_FEE_STRUCTURE.find((item) => item.title === title)?.amount || 0
          : 0,
        type: ["Scholarship", "Discount"].includes(title) ? "Credit" : "Debit",
        note: `${admissionBatch || "Batch"} ${getYearLabel(studyYear)} ${title}`,
      })
    );

    return {
      studyYear,
      yearLabel: getYearLabel(studyYear),
      academicYear,
      components,
      totalFee: calculateYearTotal(components),
      scholarship: 0,
      discount: 0,
      fine: 0,
    };
  });
}

export function sanitizeFeeStructurePayload(payload = {}, existing = null) {
  const course = normalizeCourseName(payload.course || existing?.course || "");
  const institution = String(
    payload.institution || existing?.institution || inferInstitutionFromCourse(course)
  ).trim();
  const academicYear = String(payload.academicYear ?? existing?.academicYear ?? "").trim();
  const admissionBatch = normalizeBatchLabel(
    payload.admissionBatch || existing?.admissionBatch || buildAdmissionBatch(academicYear, course)
  );
  const durationYears = Math.max(
    Math.min(toNumber(payload.durationYears ?? existing?.durationYears, getCourseDurationYears(course)), 4),
    1
  );

  const incomingYearFees = Array.isArray(payload.yearFees) && payload.yearFees.length
    ? payload.yearFees
    : existing?.yearFees?.length
      ? existing.yearFees
      : buildDefaultYearFees({ course, admissionBatch, academicYear, durationYears });

  const yearFees = incomingYearFees.slice(0, durationYears).map((yearFee, index) => {
    const studyYear = Math.max(Math.min(toNumber(yearFee.studyYear, index + 1), 4), 1);
    let components = Array.isArray(yearFee.components)
      ? yearFee.components.map(normalizeComponent)
      : [];
    if (studyYear > 1) {
      components = components.filter(
        (comp) => !["Admission Fee", "Registration Fee", "Uniform Fee", "Books & Study Materials"].includes(comp.title)
      );
    }
    const scholarship = Math.max(toNumber(yearFee.scholarship), 0);
    const discount = Math.max(toNumber(yearFee.discount), 0);
    const fine = Math.max(toNumber(yearFee.fine), 0);
    const componentsWithCredits = [
      ...components,
      ...(scholarship ? [normalizeComponent({ title: "Scholarship", amount: scholarship, type: "Credit" })] : []),
      ...(discount ? [normalizeComponent({ title: "Discount", amount: discount, type: "Credit" })] : []),
    ];

    return {
      studyYear,
      yearLabel: String(yearFee.yearLabel || getYearLabel(studyYear)).trim(),
      academicYear: String(yearFee.academicYear || academicYear).trim(),
      components: componentsWithCredits,
      totalFee: calculateYearTotal(componentsWithCredits, fine),
      scholarship,
      discount,
      fine,
    };
  });

  return {
    institution,
    course,
    admissionBatch,
    academicYear,
    durationYears,
    active: payload.active ?? existing?.active ?? true,
    status: payload.active === false ? "Inactive" : String(payload.status || existing?.status || "Active").trim(),
    yearFees,
  };
}

export function createRevision(action, user, note, snapshot = null) {
  return {
    revisionId: uniqueId("REV"),
    action,
    changedAt: new Date().toISOString(),
    changedBy: user?.name || user?.email || user?.role || "Super Admin",
    note: String(note || "").trim(),
    snapshot,
  };
}

export function getYearFeeSnapshot(feeStructure, studyYear = 1) {
  if (!feeStructure) return null;
  const normalizedStudyYear = Math.max(Math.min(toNumber(studyYear, 1), 4), 1);
  const yearFee =
    feeStructure.yearFees?.find((item) => Number(item.studyYear) === normalizedStudyYear) ||
    feeStructure.yearFees?.[0];

  if (!yearFee) return null;

  return {
    feeStructureId: String(feeStructure._id),
    feeStructureKey: [
      feeStructure.institution,
      feeStructure.course,
      feeStructure.admissionBatch,
      normalizedStudyYear,
    ].join("|"),
    institution: feeStructure.institution,
    course: feeStructure.course,
    admissionBatch: feeStructure.admissionBatch,
    academicYear: yearFee.academicYear || feeStructure.academicYear || "",
    currentStudyYear: normalizedStudyYear,
    activeFeeStructure: feeStructure.active !== false,
    feeStructure: (yearFee.components || []).map((component) => ({
      chargeId: component.componentId || uniqueId("CHG"),
      title: component.title,
      category: component.category,
      scope: "Structure",
      amount: component.amount,
      dueDate: component.dueDate || "",
      status: "Pending",
      note: `${feeStructure.admissionBatch} ${yearFee.yearLabel}`,
    })),
    baseFee: yearFee.totalFee,
    totalFee: yearFee.totalFee,
    scholarshipAmount: yearFee.scholarship || 0,
    scholarshipStatus: yearFee.scholarship ? "Applied" : "Not Applied",
  };
}

export async function findActiveFeeStructureForStudent(studentLike = {}) {
  const course = normalizeCourseName(studentLike.course || "");
  const institution = String(studentLike.institution || inferInstitutionFromCourse(course)).trim();
  const academicYear = String(studentLike.year || studentLike.academicYear || "").trim();
  const admissionBatch = normalizeBatchLabel(
    studentLike.admissionBatch || buildAdmissionBatch(academicYear, course)
  );

  if (!course || !institution || !admissionBatch) return null;

  return FeeStructure.findOne({
    institution,
    course,
    admissionBatch,
    active: true,
  });
}

export async function applyActiveFeeStructure(studentLike = {}) {
  const feeStructure = await findActiveFeeStructureForStudent(studentLike);
  const snapshot = getYearFeeSnapshot(feeStructure, studentLike.currentStudyYear || 1);
  if (!snapshot) return null;

  Object.assign(studentLike, snapshot, {
    pendingAmount: snapshot.totalFee,
    outstandingAmount: snapshot.totalFee,
    outstandingStatus: snapshot.totalFee > 0 ? "Pending" : "Cleared",
    feeRevisionHistory: [
      ...(Array.isArray(studentLike.feeRevisionHistory) ? studentLike.feeRevisionHistory : []),
      createRevision("Assigned Fee Structure", null, snapshot.feeStructureKey, snapshot),
    ],
  });

  return snapshot;
}
