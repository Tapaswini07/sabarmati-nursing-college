import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import AdmissionFeeConfig from "../models/AdmissionFeeConfig.js";
import Student from "../models/student.js";
import {
  attachCurrentUser,
  requireAcademicAccess,
  requireAdminOrSuperAdmin,
  requireRole,
  verifyToken,
} from "../middleware/AuthMiddleware.js";
import { ROLES } from "../constants/roles.js";
import {
  ADMISSION_BATCHES,
  COURSE_CATALOG,
  INSTITUTIONS,
  buildAdmissionBatch,
  inferInstitutionFromCourse,
  normalizeCourseName,
} from "../constants/feeStructures.js";
import { loadLinkedStudentForUser } from "../utils/studentLinking.js";
import { applyActiveFeeStructure } from "../utils/feeStructureStore.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const photoUploadsRoot = path.resolve(__dirname, "../uploads/admission-photos");
const certificateUploadsRoot = path.resolve(__dirname, "../uploads/admission-certificates");
const documentUploadsRoot = path.resolve(__dirname, "../uploads/admission-documents");

[photoUploadsRoot, certificateUploadsRoot, documentUploadsRoot].forEach((directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === "casteCertificate") {
      cb(null, certificateUploadsRoot);
      return;
    }
    if (file.fieldname === "supportingDocuments") {
      cb(null, documentUploadsRoot);
      return;
    }
    cb(null, photoUploadsRoot);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeBase = (path.basename(file.originalname || "photo", extension) || "photo")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    cb(null, `${Date.now()}-${safeBase || "photo"}${extension || ".jpg"}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
const admissionUpload = upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "casteCertificate", maxCount: 1 },
  { name: "supportingDocuments", maxCount: 20 },
]);

function createApplicationId(academicYear = getAcademicYear(), sequence = 1) {
  const yearLabel = String(academicYear)
    .replace(/[^0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const paddedSequence = String(sequence).padStart(4, "0");
  return `SAB-${yearLabel || getAcademicYear()}-${paddedSequence}`;
}

function getApplicationIdSequence(applicationId = "", academicYear = "") {
  const escapedYear = String(academicYear).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(applicationId).match(new RegExp(`^SAB-${escapedYear}-(\\d+)$`, "i"));
  return match ? Number(match[1]) || 0 : 0;
}

async function createYearWiseApplicationId(academicYear = getAcademicYear()) {
  const existingRecords = await Student.find({ year: academicYear })
    .select("applicationId registrationNo admissionNumber")
    .lean();
  const maxSequence = existingRecords.reduce((highest, record) => {
    const recordSequence = Math.max(
      getApplicationIdSequence(record.applicationId, academicYear),
      getApplicationIdSequence(record.registrationNo, academicYear),
      getApplicationIdSequence(record.admissionNumber, academicYear)
    );
    return Math.max(highest, recordSequence);
  }, 0);
  const startingSequence = Math.max(existingRecords.length, maxSequence);

  for (let offset = 1; offset <= 100; offset += 1) {
    const applicationId = createApplicationId(academicYear, startingSequence + offset);
    const exists = await Student.exists({
      $or: [{ applicationId }, { registrationNo: applicationId }, { admissionNumber: applicationId }],
    });

    if (!exists) {
      return applicationId;
    }
  }

  throw new Error("Unable to generate a unique application ID for the selected admission year.");
}

function createChargeId() {
  return `CHG-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
}

function buildAdmissionFeeStructure({ amount = 0, academicYear = "", course = "" } = {}) {
  return [{
    chargeId: createChargeId(),
    title: "Admission Fee",
    category: "Admission",
    scope: "Structure",
    amount,
    dueDate: "",
    status: "Pending",
    note: `${academicYear} configured admission fee for ${course}`,
  }];
}

function getAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 5 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function getAcademicYearFromDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 5 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function getAdmissionStartYear(value = "") {
  const match = String(value).match(/\d{4}/);
  return match ? match[0] : "";
}

function buildAcademicYearFromStartYear(value = "") {
  const startYear = Number.parseInt(String(value).match(/\d{4}/)?.[0] || "", 10);
  return Number.isFinite(startYear) ? `${startYear}-${startYear + 1}` : "";
}

function inferAdmissionYear(record = {}) {
  const storedYear = trimValue(record.year);
  if (isAcademicYearLabel(storedYear)) return storedYear;

  const explicitAdmissionYear = trimValue(record.admissionYear);
  if (isAcademicYearLabel(explicitAdmissionYear)) return explicitAdmissionYear;

  const idValue = trimValue(record.applicationId || record.registrationNo || record.admissionNumber);
  const idYear = idValue.match(/(?:ADM|SAB)-(\d{4})/i)?.[1];
  if (idYear) {
    const startYear = Number(idYear);
    return `${startYear}-${startYear + 1}`;
  }

  return getAcademicYearFromDate(record.admissionDate || record.createdAt || record.submittedAt);
}

function trimValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isAcademicYearLabel(value = "") {
  return /^\d{4}-\d{4}$/.test(trimValue(value));
}

function isAdmissionYearLabel(value = "") {
  return /^\d{4}$/.test(trimValue(value));
}

function parseSupportingDocumentLabels(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map((item) => trimValue(item)) : [];
  } catch {
    return [];
  }
}

const ADMISSION_DETAIL_FIELDS = [
  "age",
  "whatsappNumber",
  "bloodGroup",
  "aadhaarNumber",
  "nationality",
  "religion",
  "maritalStatus",
  "fatherName",
  "motherName",
  "guardianName",
  "parentOccupation",
  "annualIncome",
  "fatherPhone",
  "parentEmail",
  "parentAadhaarNumber",
  "permanentHouseNumber",
  "permanentVillage",
  "permanentCity",
  "permanentDistrict",
  "permanentState",
  "permanentPinCode",
  "presentHouseNumber",
  "presentVillage",
  "presentCity",
  "presentDistrict",
  "presentState",
  "presentPinCode",
  "highestQualification",
  "tenthSchoolName",
  "tenthBoard",
  "tenthRollNumber",
  "tenthRegistrationNumber",
  "tenthPassingYear",
  "tenthTotalMarks",
  "tenthObtainedMarks",
  "tenthPercentage",
  "twelfthCollegeName",
  "twelfthBoard",
  "twelfthRollNumber",
  "twelfthRegistrationNumber",
  "twelfthPassingYear",
  "twelfthStream",
  "twelfthPhysicsMarks",
  "twelfthChemistryMarks",
  "twelfthBiologyMarks",
  "twelfthEnglishMarks",
  "twelfthHistoryMarks",
  "twelfthPoliticalScienceMarks",
  "twelfthGeographyMarks",
  "twelfthAccountancyMarks",
  "twelfthBusinessStudiesMarks",
  "twelfthEconomicsMarks",
  "twelfthTotalMarks",
  "twelfthObtainedMarks",
  "twelfthPercentage",
  "basicBscNursingCollegeName",
  "basicBscNursingUniversity",
  "basicBscNursingRollNumber",
  "basicBscNursingRegistrationNumber",
  "basicBscNursingPassingYear",
  "basicBscNursingTotalMarks",
  "basicBscNursingObtainedMarks",
  "basicBscNursingPercentage",
  "postBasicBscNursingCollegeName",
  "postBasicBscNursingUniversity",
  "postBasicBscNursingRollNumber",
  "postBasicBscNursingRegistrationNumber",
  "postBasicBscNursingPassingYear",
  "postBasicBscNursingTotalMarks",
  "postBasicBscNursingObtainedMarks",
  "postBasicBscNursingPercentage",
  "gnmCollegeName",
  "gnmBoard",
  "gnmRollNumber",
  "gnmRegistrationNumber",
  "gnmPassingYear",
  "gnmTotalMarks",
  "gnmObtainedMarks",
  "gnmPercentage",
];
const ADMISSION_EXPORT_DETAIL_KEYS = [
  ...ADMISSION_DETAIL_FIELDS.slice(0, ADMISSION_DETAIL_FIELDS.indexOf("presentHouseNumber")),
  "presentSameAsPermanent",
  ...ADMISSION_DETAIL_FIELDS.slice(ADMISSION_DETAIL_FIELDS.indexOf("presentHouseNumber")),
];

function getAdmissionDetailFields(body = {}) {
  const detailFields = ADMISSION_DETAIL_FIELDS.reduce((fields, key) => {
    fields[key] = trimValue(body[key]);
    return fields;
  }, {});
  detailFields.presentSameAsPermanent = body.presentSameAsPermanent === "true" || body.presentSameAsPermanent === true;
  return detailFields;
}

function inferDepartmentFromCourse(course = "") {
  const value = String(course).toLowerCase();
  if (value.includes("nursing")) return "Nursing";
  if (value.includes("polytechnic") || value.includes("engineering") || value.includes("b.tech")) return "Engineering";
  if (value.includes("dmlt") || value.includes("lab") || value.includes("medical")) return "Allied Health";
  if (value.includes("mba") || value.includes("management") || value.includes("bba")) return "Management";
  if (value.includes("b.com") || value.includes("commerce")) return "Commerce";
  if (value.includes("b.sc") || value.includes("science")) return "Science";
  if (value.includes("ba") || value.includes("arts")) return "Arts";
  return "General";
}

function buildPhotoUrl(req, file) {
  if (!file) return "";
  const host = req.get("host");
  const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
  const directory = file.fieldname === "casteCertificate"
    ? "admission-certificates"
    : file.fieldname === "supportingDocuments"
      ? "admission-documents"
      : "admission-photos";
  return `${protocol}://${host}/uploads/${directory}/${file.filename}`;
}

function parseFieldMap() {
  try {
    return JSON.parse(process.env.GOOGLE_FORM_FIELD_MAP || "{}");
  } catch {
    return {};
  }
}

function buildGoogleFormPayload(record) {
  const fieldMap = parseFieldMap();
  const payload = new URLSearchParams();
  Object.entries(fieldMap).forEach(([recordKey, formKey]) => {
    if (!formKey) return;
    const value = record[recordKey];
    payload.append(formKey, value == null ? "" : String(value));
  });
  return payload;
}

async function submitToGoogleForm(record) {
  const formActionUrl = trimValue(process.env.GOOGLE_FORM_ACTION_URL);
  const payload = buildGoogleFormPayload(record);
  if (!formActionUrl) return { synced: false, note: "Google Form URL is not configured" };
  if ([...payload.keys()].length === 0) return { synced: false, note: "Google Form field mapping is not configured" };

  const response = await fetch(formActionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: payload.toString(),
    redirect: "manual",
  });

  if (![200, 302].includes(response.status)) {
    const body = await response.text();
    throw new Error(body || `Google Form submission failed with status ${response.status}`);
  }

  return { synced: true, note: "Admission synced to Google Form and linked Google Sheet" };
}

function normalizeAdmissionRecord(record, source = "database") {
  const createdAt = record.createdAt || record.submittedAt || new Date().toISOString();
  const studentName = record.studentName || record.fullName || "";
  const academicYear = inferAdmissionYear(record);
  const normalizedCourse = normalizeCourseName(record.course || "");
  const institution = trimValue(record.institution) || inferInstitutionFromCourse(normalizedCourse);
  const admissionBatch = trimValue(record.admissionBatch) || buildAdmissionBatch(academicYear, normalizedCourse);
  const admissionDetailFields = getAdmissionDetailFields(record);

  return {
    _id: record._id || record.applicationId || record.registrationNo || studentName,
    applicationId: record.applicationId || record.registrationNo || "",
    studentName,
    email: record.email || "",
    phone: record.phone || "",
    address: record.address || "",
    dob: record.dob || "",
    gender: record.gender || "",
    casteCategory: record.casteCategory || "",
    ...admissionDetailFields,
    course: normalizedCourse || record.course || "",
    institution,
    admissionBatch,
    admissionYear: getRecordAdmissionYear(record),
    mScSpecialization: record.mScSpecialization || "",
    department: record.department || inferDepartmentFromCourse(normalizedCourse || record.course || ""),
    year: academicYear,
    admissionDate: record.admissionDate || createdAt,
    photoUrl: record.photoUrl || "",
    casteCertificateUrl: record.casteCertificateUrl || "",
    status: record.status || "Pending",
    syncStatus: record.syncStatus || "Pending Sync",
    submittedAt: createdAt,
    source,
    baseFee: record.baseFee ?? 0,
    totalFee: record.totalFee ?? 0,
    paidAmount: record.paidAmount ?? 0,
    pendingAmount: record.pendingAmount ?? 0,
  };
}

function getRecordYear(record) {
  return inferAdmissionYear(record);
}

function getRecordAdmissionYear(record) {
  const explicitAdmissionYear = getAdmissionStartYear(trimValue(record?.admissionYear));
  if (isAdmissionYearLabel(explicitAdmissionYear)) return explicitAdmissionYear;
  return getAdmissionStartYear(getRecordYear(record));
}

function getRecordInstitution(record) {
  const course = normalizeCourseName(record?.course || "");
  return trimValue(record?.institution) || inferInstitutionFromCourse(course);
}

function getRecordCourse(record) {
  return normalizeCourseName(record?.course || "");
}

function getRecordAdmissionBatch(record) {
  const course = normalizeCourseName(record?.course || "");
  return trimValue(record?.admissionBatch) || buildAdmissionBatch(getRecordYear(record), course) || "Unassigned";
}

function getAvailableAdmissionYears(records = []) {
  const configuredYears = Array.from({ length: 12 }, (_, index) => {
    const startYear = 2020 + index;
    return `${startYear}`;
  });
  const recordYears = records
    .map((record) => getRecordAdmissionYear(record))
    .filter(isAdmissionYearLabel);

  return Array.from(new Set([...configuredYears, ...recordYears])).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

function buildYearWiseSummary(records = []) {
  const summaryMap = new Map();

  records.forEach((record) => {
    const year = getRecordAdmissionYear(record) || "Unassigned";
    const current = summaryMap.get(year) || {
      year,
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

    summaryMap.set(year, current);
  });

  return Array.from(summaryMap.values()).sort((a, b) =>
    a.year.localeCompare(b.year, undefined, { numeric: true })
  );
}

function buildBatchWiseSummary(records = []) {
  const summaryMap = new Map();

  records.forEach((record) => {
    const year = getRecordAdmissionYear(record) || "Unassigned";
    const admissionBatch = getRecordAdmissionBatch(record);
    const institution = getRecordInstitution(record);
    const course = getRecordCourse(record) || "Unassigned";
    const key = `${institution}__${course}__${year}__${admissionBatch}`;
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

  return Array.from(summaryMap.values()).sort((a, b) => {
    const institutionCompare = a.institution.localeCompare(b.institution);
    const courseCompare = a.course.localeCompare(b.course, undefined, { numeric: true });
    const yearCompare = a.year.localeCompare(b.year, undefined, { numeric: true });
    const batchCompare = a.admissionBatch.localeCompare(b.admissionBatch, undefined, { numeric: true });
    return institutionCompare || courseCompare || batchCompare || yearCompare;
  });
}

function getNormalizedAdmissionGroupingUpdate(record = {}) {
  const normalizedCourse = normalizeCourseName(record.course || "");
  const year = inferAdmissionYear(record) || getAcademicYear();
  const institution = trimValue(record.institution) || inferInstitutionFromCourse(normalizedCourse);
  const admissionBatch = trimValue(record.admissionBatch) || buildAdmissionBatch(year, normalizedCourse);
  const admissionYear = getRecordAdmissionYear(record) || getAdmissionStartYear(year);
  const update = {};

  if (record.course !== normalizedCourse && normalizedCourse) {
    update.course = normalizedCourse;
  }
  if (record.year !== year) {
    update.year = year;
  }
  if (record.institution !== institution) {
    update.institution = institution;
  }
  if (record.admissionBatch !== admissionBatch) {
    update.admissionBatch = admissionBatch;
  }
  if (record.admissionYear !== admissionYear) {
    update.admissionYear = admissionYear;
  }

  return update;
}

async function normalizeStoredAdmissionGrouping(students = []) {
  const operations = students
    .map((student) => {
      const record = typeof student.toObject === "function" ? student.toObject() : student;
      const update = getNormalizedAdmissionGroupingUpdate(record);

      if (!Object.keys(update).length) {
        return null;
      }

      return {
        updateOne: {
          filter: { _id: record._id },
          update: { $set: update },
        },
      };
    })
    .filter(Boolean);

  if (operations.length) {
    await Student.bulkWrite(operations);
  }
}

function isValidAdmissionYear(year = "") {
  return getAvailableAdmissionYears().includes(trimValue(year));
}

function isValidAcademicYear(year = "") {
  const configuredYears = Array.from({ length: 12 }, (_, index) => {
    const startYear = 2020 + index;
    return `${startYear}-${startYear + 1}`;
  });
  return configuredYears.includes(trimValue(year));
}

function filterRecordsByYear(records = [], year = "") {
  const selectedYear = trimValue(year);
  if (!selectedYear) return records;
  return records.filter((record) => getRecordAdmissionYear(record) === selectedYear);
}

function filterRecordsByInstitution(records = [], institution = "") {
  const selectedInstitution = trimValue(institution);
  if (!selectedInstitution) return records;
  return records.filter((record) => getRecordInstitution(record) === selectedInstitution);
}

function filterRecordsByCourse(records = [], course = "") {
  const selectedCourse = normalizeCourseName(course);
  if (!selectedCourse) return records;
  return records.filter((record) => getRecordCourse(record) === selectedCourse);
}

function filterRecordsByAdmissionBatch(records = [], admissionBatch = "") {
  const selectedAdmissionBatch = trimValue(admissionBatch);
  if (!selectedAdmissionBatch) return records;
  return records.filter((record) => getRecordAdmissionBatch(record) === selectedAdmissionBatch);
}

function applyAdmissionFilters(records = [], { year = "", institution = "", course = "", admissionBatch = "" } = {}) {
  return filterRecordsByAdmissionBatch(
    filterRecordsByCourse(filterRecordsByInstitution(filterRecordsByYear(records, year), institution), course),
    admissionBatch
  );
}

function getAvailableInstitutions(records = []) {
  const recordInstitutions = records.map((record) => getRecordInstitution(record)).filter(Boolean);
  return Array.from(new Set([INSTITUTIONS.COLLEGE, INSTITUTIONS.SCHOOL, ...recordInstitutions])).sort();
}

function getAvailableAdmissionBatches(records = []) {
  const recordBatches = records.map((record) => getRecordAdmissionBatch(record)).filter(Boolean);
  return Array.from(new Set([...ADMISSION_BATCHES, ...recordBatches])).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

function getAvailableCourses(records = []) {
  const catalogCourses = COURSE_CATALOG.map((item) => ({
    institution: item.institution,
    course: item.course,
  }));
  const supportedCourses = new Set(COURSE_CATALOG.map((item) => item.course));
  const recordCourses = records
    .map((record) => {
      const course = getRecordCourse(record);
      if (!course || !supportedCourses.has(course)) return null;
      return {
        institution: getRecordInstitution(record),
        course,
      };
    })
    .filter(Boolean);
  const courseMap = new Map();

  [...catalogCourses, ...recordCourses].forEach((item) => {
    courseMap.set(`${item.institution}__${item.course}`, item);
  });

  return Array.from(courseMap.values()).sort((a, b) => {
    const institutionCompare = a.institution.localeCompare(b.institution);
    const courseCompare = a.course.localeCompare(b.course, undefined, { numeric: true });
    return institutionCompare || courseCompare;
  });
}

function sortRecordsByYear(records = [], sort = "") {
  const sortMode = trimValue(sort);
  if (!["year-asc", "year-desc", "latest", "oldest", "name-asc", "course-asc"].includes(sortMode)) {
    return records;
  }

  return [...records].sort((a, b) => {
    if (sortMode === "latest" || sortMode === "oldest") {
      const dateCompare = new Date(b.createdAt || b.submittedAt || b.admissionDate || 0)
        - new Date(a.createdAt || a.submittedAt || a.admissionDate || 0);
      return sortMode === "latest" ? dateCompare : -dateCompare;
    }
    if (sortMode === "name-asc") {
      return String(a.studentName || "").localeCompare(String(b.studentName || ""));
    }
    if (sortMode === "course-asc") {
      return String(a.course || "").localeCompare(String(b.course || ""), undefined, { numeric: true });
    }

    const yearCompare = getRecordYear(a).localeCompare(getRecordYear(b), undefined, {
      numeric: true,
    });
    const dateCompare = new Date(b.createdAt || b.submittedAt || b.admissionDate || 0)
      - new Date(a.createdAt || a.submittedAt || a.admissionDate || 0);

    return sortMode === "year-asc"
      ? yearCompare || -dateCompare
      : -yearCompare || dateCompare;
  });
}

async function fetchAdmissionsFromSheetJson() {
  const sheetJsonUrl = trimValue(process.env.GOOGLE_SHEET_JSON_URL);
  if (!sheetJsonUrl) return null;
  const response = await fetch(sheetJsonUrl);
  if (!response.ok) throw new Error(`Unable to fetch Google Sheet data (${response.status})`);
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload.records;
  if (!Array.isArray(rows)) throw new Error("Google Sheet JSON endpoint must return an array or { records: [] }");
  return rows.map((row) => normalizeAdmissionRecord(row, "google-sheet"));
}

function getExcelExportUrl() {
  const explicitUrl = trimValue(process.env.GOOGLE_SHEET_EXPORT_URL);
  if (explicitUrl) return explicitUrl;
  const spreadsheetId = trimValue(process.env.GOOGLE_SHEET_ID);
  const sheetGid = trimValue(process.env.GOOGLE_SHEET_GID);
  if (!spreadsheetId) return "";
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx${sheetGid ? `&gid=${sheetGid}` : ""}`;
}

function escapeCsvValue(value) {
  const normalized = value == null ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildAdmissionsCsv(records) {
  const headers = [
    "Application ID", "Student Name", "Email", "Phone", "Address", "Date of Birth",
    "Gender", "Caste Category", "Course", "M.Sc (N) Specialization", "Department", "Status", "Sync Status",
    "Photo URL", "Caste Certificate URL", "Submitted At", "Source",
  ];

  const rows = records.map((record) => ([
    record.applicationId,
    record.studentName,
    record.email,
    record.phone,
    record.address,
    record.dob,
    record.gender,
    record.casteCategory,
    record.course,
    record.mScSpecialization,
    record.department,
    record.status,
    record.syncStatus,
    record.photoUrl,
    record.casteCertificateUrl,
    record.submittedAt,
    record.source,
  ].map(escapeCsvValue).join(",")));

  return [headers.map(escapeCsvValue).join(","), ...rows].join("\n");
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildAdmissionExportRows(records = []) {
  return records.map((record) => {
    const supportingDocuments = Array.isArray(record.supportingDocuments) ? record.supportingDocuments : [];
    return {
      applicationId: record.applicationId || record.registrationNo || "",
      registrationNo: record.registrationNo || "",
      admissionNumber: record.admissionNumber || "",
      studentName: record.studentName || record.fullName || "",
      email: record.email || "",
      phone: record.phone || "",
      address: record.address || "",
      dob: record.dob || "",
      gender: record.gender || "",
      casteCategory: record.casteCategory || "",
      ...getAdmissionDetailFields(record),
      course: record.course || "",
      mScSpecialization: record.mScSpecialization || "",
      department: record.department || inferDepartmentFromCourse(record.course || ""),
      institution: record.institution || inferInstitutionFromCourse(record.course || ""),
      admissionYear: record.admissionYear || getAdmissionStartYear(record.year || ""),
      admissionBatch: record.admissionBatch || buildAdmissionBatch(record.year || "", record.course || ""),
      year: record.year || "",
      admissionDate: record.admissionDate || record.createdAt || record.submittedAt || "",
      status: record.status || "Pending",
      syncStatus: record.syncStatus || "",
      source: record.source || "",
      photoUrl: record.photoUrl || "",
      photoFilename: record.photoFilename || "",
      casteCertificateUrl: record.casteCertificateUrl || "",
      casteCertificateFilename: record.casteCertificateFilename || "",
      supportingDocumentLabels: supportingDocuments.map((item) => item.label || "").filter(Boolean).join(" | "),
      supportingDocumentFiles: supportingDocuments
        .map((item) => item.originalName || item.filename || "")
        .filter(Boolean)
        .join(" | "),
      supportingDocumentUrls: supportingDocuments.map((item) => item.url || "").filter(Boolean).join(" | "),
      createdAt: record.createdAt || record.submittedAt || "",
      updatedAt: record.updatedAt || "",
    };
  });
}

function buildAdmissionsExcelXml(records = []) {
  const rows = buildAdmissionExportRows(records);
  const headers = [
    "Application ID",
    "Registration No",
    "Admission Number",
    "Student Name",
    "Email",
    "Phone",
    "Address",
    "Date of Birth",
    "Gender",
    "Caste Category",
    "Age",
    "WhatsApp Number",
    "Blood Group",
    "Aadhaar Number",
    "Nationality",
    "Religion",
    "Marital Status",
    "Father Name",
    "Mother Name",
    "Guardian Name",
    "Parent Occupation",
    "Annual Income",
    "Father Phone",
    "Parent Email",
    "Parent Aadhaar Number",
    "Permanent House Number",
    "Permanent Village",
    "Permanent City",
    "Permanent District",
    "Permanent State",
    "Permanent PIN Code",
    "Present Same As Permanent",
    "Present House Number",
    "Present Village",
    "Present City",
    "Present District",
    "Present State",
    "Present PIN Code",
    "10th School Name",
    "10th Board",
    "10th Roll Number",
    "10th Registration Number",
    "10th Passing Year",
    "10th Total Marks",
    "10th Obtained Marks",
    "10th Percentage",
    "12th College Name",
    "12th Board",
    "12th Roll Number",
    "12th Registration Number",
    "12th Passing Year",
    "12th Stream",
    "12th Physics Marks",
    "12th Chemistry Marks",
    "12th Biology Marks",
    "12th English Marks",
    "12th Obtained Marks",
    "12th Total Marks",
    "12th Percentage",
    "Course",
    "M.Sc (N) Specialization",
    "Department",
    "Institution",
    "Admission Year",
    "Admission Batch",
    "Academic Year",
    "Admission Date",
    "Status",
    "Sync Status",
    "Source",
    "Photo URL",
    "Photo Filename",
    "Caste Certificate URL",
    "Caste Certificate Filename",
    "Supporting Document Labels",
    "Supporting Document Files",
    "Supporting Document URLs",
    "Created At",
    "Updated At",
  ];

  const dataKeys = [
    "applicationId",
    "registrationNo",
    "admissionNumber",
    "studentName",
    "email",
    "phone",
    "address",
    "dob",
    "gender",
    "casteCategory",
    ...ADMISSION_EXPORT_DETAIL_KEYS,
    "course",
    "mScSpecialization",
    "department",
    "institution",
    "admissionYear",
    "admissionBatch",
    "year",
    "admissionDate",
    "status",
    "syncStatus",
    "source",
    "photoUrl",
    "photoFilename",
    "casteCertificateUrl",
    "casteCertificateFilename",
    "supportingDocumentLabels",
    "supportingDocumentFiles",
    "supportingDocumentUrls",
    "createdAt",
    "updatedAt",
  ];

  const headerXml = headers
    .map((header) => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`)
    .join("");

  const rowXml = rows
    .map((row) => {
      const cells = dataKeys
        .map((key) => `<Cell><Data ss:Type="String">${escapeXml(row[key])}</Data></Cell>`)
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#DCEBFF" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Admissions">
  <Table>
   <Row>${headerXml}</Row>
   ${rowXml}
  </Table>
 </Worksheet>
</Workbook>`;
}

router.get("/admission/records", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const selectedYear = trimValue(req.query.year);
    const selectedInstitution = trimValue(req.query.institution);
    const selectedCourse = trimValue(req.query.course);
    const selectedAdmissionBatch = trimValue(req.query.admissionBatch);
    const selectedSort = trimValue(req.query.sort);

    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        source: "student-admission-api",
        records: [],
        totalRecords: 0,
        filteredRecords: 0,
        yearWiseSummary: [],
        batchWiseSummary: [],
        years: getAvailableAdmissionYears(),
        institutions: getAvailableInstitutions(),
        courses: getAvailableCourses(),
        admissionBatches: getAvailableAdmissionBatches(),
        exportUrl: getExcelExportUrl(),
        message: "MongoDB is not connected yet, so student admission records are temporarily unavailable.",
      });
    }

    const students = await Student.find({}).sort({ createdAt: -1 });
    await normalizeStoredAdmissionGrouping(students);
    const records = students.map((student) => normalizeAdmissionRecord(student.toObject(), "database"));
    const selectedRecords = applyAdmissionFilters(records, {
      year: selectedYear,
      institution: selectedInstitution,
      course: selectedCourse,
      admissionBatch: selectedAdmissionBatch,
    });
    return res.status(200).json({
      source: "student-admission-api",
      records: sortRecordsByYear(selectedRecords, selectedSort),
      totalRecords: records.length,
      filteredRecords: selectedRecords.length,
      yearWiseSummary: buildYearWiseSummary(records),
      batchWiseSummary: buildBatchWiseSummary(records),
      years: getAvailableAdmissionYears(records),
      institutions: getAvailableInstitutions(records),
      courses: getAvailableCourses(filterRecordsByInstitution(records, selectedInstitution)),
      admissionBatches: getAvailableAdmissionBatches(
        filterRecordsByCourse(
          filterRecordsByInstitution(filterRecordsByYear(records, selectedYear), selectedInstitution),
          selectedCourse
        )
      ),
      exportUrl: getExcelExportUrl(),
      message: "",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to load admission records" });
  }
});

router.get("/admission/next-application-id", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const selectedYear = trimValue(req.query.year) || getAcademicYear();
    if (!isValidAcademicYear(selectedYear)) {
      return res.status(400).json({ message: "Admission year must be between 2020-2021 and 2030-2031." });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        year: selectedYear,
        applicationId: createApplicationId(selectedYear, 1),
        message: "MongoDB is not connected yet, so this is a temporary preview.",
      });
    }

    return res.status(200).json({
      year: selectedYear,
      applicationId: await createYearWiseApplicationId(selectedYear),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to generate next application ID" });
  }
});

router.get("/admission/me", verifyToken, attachCurrentUser, requireRole(ROLES.STUDENT), async (req, res) => {
  try {
    const student = await loadLinkedStudentForUser(req.currentUser);
    if (!student) {
      return res.status(404).json({ message: "Linked student record not found" });
    }

    return res.status(200).json({
      record: normalizeAdmissionRecord(student.toObject(), "database"),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to load admission details" });
  }
});

router.get("/admission/export/xlsx", verifyToken, attachCurrentUser, requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const selectedYear = trimValue(req.query.year);
    const selectedInstitution = trimValue(req.query.institution);
    const selectedCourse = trimValue(req.query.course);
    const selectedAdmissionBatch = trimValue(req.query.admissionBatch);
    const selectedSort = trimValue(req.query.sort);
    let records = [];
    if (mongoose.connection.readyState === 1) {
      const students = await Student.find({}).sort({ createdAt: -1 }).lean();
      await normalizeStoredAdmissionGrouping(students);
      records = applyAdmissionFilters(
        students.map((student) => normalizeAdmissionRecord(student, "database")),
        {
          year: selectedYear,
          institution: selectedInstitution,
          course: selectedCourse,
          admissionBatch: selectedAdmissionBatch,
        }
      );
    } else {
      const sheetRows = await fetchAdmissionsFromSheetJson();
      if (sheetRows) {
        records = applyAdmissionFilters(sheetRows, {
          year: selectedYear,
          institution: selectedInstitution,
          course: selectedCourse,
          admissionBatch: selectedAdmissionBatch,
        });
      }
    }
    records = sortRecordsByYear(records, selectedSort);
    const timestamp = new Date().toISOString().slice(0, 10);
    const workbookXml = buildAdmissionsExcelXml(records);
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="admissions-export${selectedYear ? `-${selectedYear}` : ""}-${timestamp}.xls"`
    );
    return res.status(200).send(workbookXml);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to export admission records" });
  }
});

router.patch("/admission/:id/status", verifyToken, attachCurrentUser, requireAcademicAccess, async (req, res) => {
  try {
    const status = trimValue(req.body.status);
    if (!["Pending", "Approved"].includes(status)) {
      return res.status(400).json({ message: "Status must be Pending or Approved" });
    }

    const student = await Student.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!student) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    return res.status(200).json({
      message: `Admission marked as ${status}`,
      record: normalizeAdmissionRecord(student.toObject(), "database"),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to update admission status" });
  }
});

router.post("/admission", admissionUpload, async (req, res) => {
  try {
    const files = req.files || {};
    const photoFile = files.photo?.[0] || null;
    const casteCertificateFile = files.casteCertificate?.[0] || null;
    const supportingDocuments = Array.isArray(files.supportingDocuments) ? files.supportingDocuments : [];
    const supportingDocumentLabels = parseSupportingDocumentLabels(req.body.supportingDocumentLabels);
    const studentName = trimValue(req.body.studentName);
    const email = trimValue(req.body.email);
    const phone = trimValue(req.body.phone);
    const address = trimValue(req.body.address);
    const dob = trimValue(req.body.dob);
    const gender = trimValue(req.body.gender);
    const course = trimValue(req.body.course);
    const selectedAdmissionYear = trimValue(req.body.admissionYear);
    const selectedAcademicYear = buildAcademicYearFromStartYear(selectedAdmissionYear);
    const mScSpecialization = trimValue(req.body.mScSpecialization);
    const casteCategory = trimValue(req.body.casteCategory);
    const admissionDetailFields = getAdmissionDetailFields(req.body);
    const academicYear = selectedAcademicYear || trimValue(req.body.year) || getAcademicYear();
    const department = trimValue(req.body.department) || inferDepartmentFromCourse(course);
    const requiresCasteCertificate = ["OBC", "SC", "ST", "EWS"].includes(casteCategory);
    const requiresMScSpecialization = [
      "M.Sc Nursing",
      "MSC(N)After P.B.BSc(N)",
      "MSC(N)After B.Sc(N)",
    ].includes(course);

    if (!studentName || !email || !phone || !address || !dob || !gender || !course || !academicYear) {
      return res.status(400).json({ message: "Please complete all required admission fields" });
    }
    if (!isValidAcademicYear(academicYear)) {
      return res.status(400).json({ message: "Admission year must be between 2020-2021 and 2030-2031." });
    }
    if (requiresMScSpecialization && !mScSpecialization) {
      return res.status(400).json({ message: "Please select an M.Sc (N) specialization." });
    }
    if (!photoFile) return res.status(400).json({ message: "Student photo is required" });
    if (requiresCasteCertificate && !casteCertificateFile) {
      return res.status(400).json({ message: "Please upload the caste certificate for the selected category." });
    }

    const applicationId = await createYearWiseApplicationId(academicYear);
    const photoUrl = buildPhotoUrl(req, photoFile);
    const casteCertificateUrl = buildPhotoUrl(req, casteCertificateFile);
    const supportingDocumentEntries = supportingDocuments.map((file) => ({
      label: supportingDocumentLabels[supportingDocuments.indexOf(file)] || "",
      url: buildPhotoUrl(req, file),
      filename: file.filename,
      originalName: file.originalname || file.filename,
    }));
    const admissionDate = trimValue(req.body.admissionDate) || new Date().toISOString();
    const normalizedCourse = normalizeCourseName(course);
    const institution = req.body.institution?.trim() || inferInstitutionFromCourse(normalizedCourse);
    const admissionYear = getAdmissionStartYear(selectedAdmissionYear || academicYear);
    const admissionBatch = req.body.admissionBatch?.trim() || buildAdmissionBatch(academicYear, normalizedCourse);
    const currentStudyYear = Math.max(Math.min(Number(req.body.currentStudyYear) || 1, 4), 1);
    const admissionFeeConfig = await AdmissionFeeConfig.findOne({
      course: normalizedCourse,
      academicYear,
    }).lean();

    // A fee setup is optional for public admissions. When administration has
    // configured one, assign it; otherwise create the student with no balance.
    const baseFee = Math.max(Number(admissionFeeConfig?.amount) || 0, 0);
    const admissionFeeStructure = buildAdmissionFeeStructure({
      amount: baseFee,
      academicYear,
      course: normalizedCourse,
    });
    const baseRecord = {
      applicationId,
      registrationNo: applicationId,
      admissionNumber: applicationId,
      studentName,
      fullName: studentName,
      email,
      phone,
      address,
      dob,
      gender,
      casteCategory,
      ...admissionDetailFields,
      course: normalizedCourse,
      institution,
      admissionYear,
      admissionBatch,
      currentStudyYear,
      mScSpecialization,
      department,
      year: academicYear,
      admissionDate,
      photoUrl,
      photoFilename: photoFile.filename,
      casteCertificateUrl,
      casteCertificateFilename: casteCertificateFile?.filename || "",
      supportingDocuments: supportingDocumentEntries,
      status: "Pending",
      source: "Website Form",
      feePlan: "Yearly",
      baseFee,
      totalFee: baseFee,
      pendingAmount: baseFee,
      outstandingAmount: baseFee,
      outstandingStatus: baseFee > 0 ? "Pending" : "Cleared",
      feeStructure: admissionFeeStructure,
      feeRevisionHistory: [{
        action: "Assigned Admission Fee",
        changedAt: admissionDate,
        changedBy: req.currentUser?.email || req.currentUser?.role || "Website Form",
        note: `${academicYear} ${normalizedCourse} admission fee`,
        snapshot: {
          admissionFeeConfigId: admissionFeeConfig ? String(admissionFeeConfig._id) : "",
          course: normalizedCourse,
          academicYear,
          amount: baseFee,
        },
      }],
      paidAmount: 0,
    };

    const googleSync = await submitToGoogleForm(baseRecord).catch((error) => ({
      synced: false,
      note: error.message || "Google sync failed",
    }));

    const student = await Student.create({
      ...baseRecord,
      syncStatus: googleSync.synced ? "Synced" : "Pending Sync",
      syncNotes: googleSync.note ? [googleSync.note] : [],
    });
    
    // Apply active fee structure from FeeStructure dashboard if available
    await applyActiveFeeStructure(student);
    await student.save();

    return res.status(201).json({
      message: googleSync.synced
        ? "Admission submitted successfully"
        : "Admission saved successfully. Google sync is pending configuration.",
      student: normalizeAdmissionRecord(student.toObject(), "database"),
      integration: googleSync,
    });
  } catch (error) {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message || "One of the uploaded files could not be processed." });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "Duplicate admission id generated. Please submit again." });
    }
    return res.status(500).json({ message: error.message || "Unable to submit admission" });
  }
});

export default router;
