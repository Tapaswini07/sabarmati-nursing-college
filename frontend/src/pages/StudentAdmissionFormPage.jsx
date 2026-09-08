import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import { apiRequest, downloadFile } from "../config/api";

const INSTITUTIONS = [
  {
    id: "sabarmati-college-nursing",
    name: "Sabarmati College of Nursing",
    courses: [
      { id: "bsc-nursing", name: "B.Sc Nursing", durationYears: 4 },
      { id: "msc-nursing", name: "M.Sc Nursing", durationYears: 2 },
      { id: "pbb-sc-nursing", name: "P.B.B.Sc Nursing", durationYears: 2 },
    ],
  },
  {
    id: "sabarmati-school-nursing",
    name: "Sabarmati School of Nursing",
    courses: [
      { id: "anm", name: "ANM", durationYears: 2 },
      { id: "gnm", name: "GNM", durationYears: 3 },
    ],
  },
];

const STUDY_YEAR_LABELS = ["First Year", "Second Year", "Third Year", "Fourth Year"];

const courseOptions = [
  "B.Sc Nursing",
  "M.Sc Nursing",
  "P.B.BSc Nursing",
  "MSC(N)After P.B.BSc(N)",
  "MSC(N)After B.Sc(N)",
  "ANM",
  "GNM",
];

const MSC_NURSING_COURSES = new Set([
  "M.Sc Nursing",
  "MSC(N)After P.B.BSc(N)",
  "MSC(N)After B.Sc(N)",
]);

const MSC_NURSING_SPECIALIZATIONS = [
  "OBSTETRIC & GYANECOLOGICAL NURSING",
  "CHILD HEALTH NURSING",
  "MEDICAL SURGICAL NURSING",
  "MENTAL HEALTH NURSING",
  "COMMUNITY HEALTH NURSING",
];

const MSC_NURSING_HIGHEST_QUALIFICATIONS = [
  "Post Basic B.Sc Nursing",
  "Basic B.Sc Nursing",
];

const BASIC_BSC_NURSING_ACADEMIC_FIELDS = [
  "basicBscNursingCollegeName",
  "basicBscNursingUniversity",
  "basicBscNursingRollNumber",
  "basicBscNursingRegistrationNumber",
  "basicBscNursingPassingYear",
  "basicBscNursingTotalMarks",
  "basicBscNursingObtainedMarks",
  "basicBscNursingPercentage",
];

const POST_BASIC_BSC_NURSING_ACADEMIC_FIELDS = [
  "postBasicBscNursingCollegeName",
  "postBasicBscNursingUniversity",
  "postBasicBscNursingRollNumber",
  "postBasicBscNursingRegistrationNumber",
  "postBasicBscNursingPassingYear",
  "postBasicBscNursingTotalMarks",
  "postBasicBscNursingObtainedMarks",
  "postBasicBscNursingPercentage",
];

const GNM_ACADEMIC_FIELDS = [
  "gnmCollegeName",
  "gnmBoard",
  "gnmRollNumber",
  "gnmRegistrationNumber",
  "gnmPassingYear",
  "gnmTotalMarks",
  "gnmObtainedMarks",
  "gnmPercentage",
];

const MSC_NURSING_ACADEMIC_FIELDS = [
  ...BASIC_BSC_NURSING_ACADEMIC_FIELDS,
  ...POST_BASIC_BSC_NURSING_ACADEMIC_FIELDS,
];

const COMMON_REQUIRED_DOCUMENTS = [
  "10th Certificate",
  "10th Marksheet",
  "+2 Certificate",
  "+2 Marksheet",
  "CLC",
  "Category Certificate",
  "Aadhar Card",
  "Pass Photo",
  "Signature",
  "Resident Certificate",
];

const COURSE_DOCUMENTS = {
  "B.Sc Nursing": COMMON_REQUIRED_DOCUMENTS,
  GNM: COMMON_REQUIRED_DOCUMENTS,
  ANM: COMMON_REQUIRED_DOCUMENTS,
  "M.Sc Nursing": [
    ...COMMON_REQUIRED_DOCUMENTS,
    "B.Sc(N) Marksheet",
    "B.Sc(N) Provisional Certificate",
    "One year Experience (Clinical/Teaching)",
    "Registration Certificate (ONMRC)",
  ],
  "MSC(N)After B.Sc(N)": [
    ...COMMON_REQUIRED_DOCUMENTS,
    "B.Sc(N) Marksheet",
    "B.Sc(N) Provisional Certificate",
    "One year Experience (Clinical/Teaching)",
    "Registration Certificate (ONMRC)",
  ],
  "MSC(N)After P.B.BSc(N)": [
    ...COMMON_REQUIRED_DOCUMENTS,
    "PBBSC Marksheet (1st year & 2nd year)",
    "PBBSC Provisional Certificate",
    "One year Experience (Clinical/Teaching)",
    "Registration Certificate (ONMRC)",
  ],
  "P.B.BSc Nursing": [
    ...COMMON_REQUIRED_DOCUMENTS,
    "GNM Marksheet",
    "GNM Provisional Certificate",
    "Registration Certificate (ONMRC)",
  ],
  "P.B.B.Sc Nursing": [
    ...COMMON_REQUIRED_DOCUMENTS,
    "GNM Marksheet",
    "GNM Provisional Certificate",
    "Registration Certificate (ONMRC)",
  ],
};

const PASS_PHOTO_LABEL = "Pass Photo";
const CASTE_CERTIFICATE_LABEL = "Category Certificate";
const DOCUMENT_ACCEPT_HINT = "PDF, JPG, JPEG, PNG";
const PHOTO_ACCEPT_HINT = "JPG, JPEG, PNG";
const CATEGORY_OPTIONS = ["General", "OBC", "SC", "ST", "EWS", "PH"];
const CATEGORY_CERTIFICATE_OPTIONS = new Set(["OBC", "SC", "ST", "EWS"]);
const TWELFTH_STREAM_OPTIONS = ["Science", "Arts", "Commerce"];
const TWELFTH_STREAM_SUBJECTS = {
  Science: [
    { name: "twelfthPhysicsMarks", label: "Physics Marks", subject: "PHYSICS", placeholder: "Enter physics marks" },
    { name: "twelfthChemistryMarks", label: "Chemistry Marks", subject: "CHEMISTRY", placeholder: "Enter chemistry marks" },
    { name: "twelfthBiologyMarks", label: "Biology Marks", subject: "BIOLOGY", placeholder: "Enter biology marks" },
    { name: "twelfthEnglishMarks", label: "English Marks", subject: "ENGLISH", placeholder: "Enter English marks" },
  ],
  Arts: [
    { name: "twelfthHistoryMarks", label: "History Marks", subject: "HISTORY", placeholder: "Enter history marks" },
    { name: "twelfthPoliticalScienceMarks", label: "Political Science Marks", subject: "POLITICAL SCIENCE", placeholder: "Enter political science marks" },
    { name: "twelfthGeographyMarks", label: "Geography Marks", subject: "GEOGRAPHY", placeholder: "Enter geography marks" },
    { name: "twelfthEnglishMarks", label: "English Marks", subject: "ENGLISH", placeholder: "Enter English marks" },
  ],
  Commerce: [
    { name: "twelfthAccountancyMarks", label: "Accountancy Marks", subject: "ACCOUNTANCY", placeholder: "Enter accountancy marks" },
    { name: "twelfthBusinessStudiesMarks", label: "Business Studies Marks", subject: "BUSINESS STUDIES", placeholder: "Enter business studies marks" },
    { name: "twelfthEconomicsMarks", label: "Economics Marks", subject: "ECONOMICS", placeholder: "Enter economics marks" },
    { name: "twelfthEnglishMarks", label: "English Marks", subject: "ENGLISH", placeholder: "Enter English marks" },
  ],
};
const TWELFTH_MARK_FIELDS = Array.from(
  new Set(Object.values(TWELFTH_STREAM_SUBJECTS).flatMap((subjects) => subjects.map((subject) => subject.name)))
);

const initialForm = {
  studentName: "",
  email: "",
  phone: "",
  whatsappNumber: "",
  address: "",
  dob: "",
  age: "",
  gender: "",
  bloodGroup: "",
  aadhaarNumber: "",
  nationality: "",
  religion: "",
  maritalStatus: "",
  institutionId: "",
  institution: "",
  courseId: "",
  course: "",
  admissionDate: "",
  admissionYear: "",
  admissionBatch: "",
  currentStudyYear: "1",
  mScSpecialization: "",
  highestQualification: "",
  casteCategory: "",
  fatherName: "",
  motherName: "",
  guardianName: "",
  parentOccupation: "",
  annualIncome: "",
  fatherPhone: "",
  parentEmail: "",
  parentAadhaarNumber: "",
  permanentHouseNumber: "",
  permanentVillage: "",
  permanentCity: "",
  permanentDistrict: "",
  permanentState: "",
  permanentPinCode: "",
  presentSameAsPermanent: false,
  presentHouseNumber: "",
  presentVillage: "",
  presentCity: "",
  presentDistrict: "",
  presentState: "",
  presentPinCode: "",
  tenthSchoolName: "",
  tenthBoard: "",
  tenthRollNumber: "",
  tenthRegistrationNumber: "",
  tenthPassingYear: "",
  tenthTotalMarks: "",
  tenthObtainedMarks: "",
  tenthPercentage: "",
  twelfthCollegeName: "",
  twelfthBoard: "",
  twelfthRollNumber: "",
  twelfthRegistrationNumber: "",
  twelfthPassingYear: "",
  twelfthStream: "",
  twelfthPhysicsMarks: "",
  twelfthChemistryMarks: "",
  twelfthBiologyMarks: "",
  twelfthEnglishMarks: "",
  twelfthHistoryMarks: "",
  twelfthPoliticalScienceMarks: "",
  twelfthGeographyMarks: "",
  twelfthAccountancyMarks: "",
  twelfthBusinessStudiesMarks: "",
  twelfthEconomicsMarks: "",
  twelfthTotalMarks: "",
  twelfthObtainedMarks: "",
  twelfthPercentage: "",
  basicBscNursingCollegeName: "",
  basicBscNursingUniversity: "",
  basicBscNursingRollNumber: "",
  basicBscNursingRegistrationNumber: "",
  basicBscNursingPassingYear: "",
  basicBscNursingTotalMarks: "",
  basicBscNursingObtainedMarks: "",
  basicBscNursingPercentage: "",
  postBasicBscNursingCollegeName: "",
  postBasicBscNursingUniversity: "",
  postBasicBscNursingRollNumber: "",
  postBasicBscNursingRegistrationNumber: "",
  postBasicBscNursingPassingYear: "",
  postBasicBscNursingTotalMarks: "",
  postBasicBscNursingObtainedMarks: "",
  postBasicBscNursingPercentage: "",
  gnmCollegeName: "",
  gnmBoard: "",
  gnmRollNumber: "",
  gnmRegistrationNumber: "",
  gnmPassingYear: "",
  gnmTotalMarks: "",
  gnmObtainedMarks: "",
  gnmPercentage: "",
  year: "",
};

const admissionYearSingleOptions = Array.from({ length: 12 }, (_, index) => {
  const startYear = 2020 + index;
  return `${startYear}`;
});

function buildAcademicYearFromStartYear(value) {
  const startYear = Number.parseInt(value, 10);
  return Number.isFinite(startYear) ? `${startYear}-${startYear + 1}` : "";
}

function getAdmissionStartYear(value = "") {
  return String(value).match(/\d{4}/)?.[0] || "";
}

function getCourseDuration(institutionId, courseId) {
  const institution = INSTITUTIONS.find((inst) => inst.id === institutionId);
  if (!institution) return 4;
  const course = institution.courses.find((c) => c.id === courseId);
  return course?.durationYears || 4;
}

function normalizeCourseLookup(value = "") {
  return String(value)
    .toLowerCase()
    .replaceAll(".", "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findCourseSelection(courseName = "") {
  const requestedCourse = normalizeCourseLookup(courseName);
  if (!requestedCourse) return null;

  for (const institution of INSTITUTIONS) {
    const course = institution.courses.find(
      (item) => normalizeCourseLookup(item.name) === requestedCourse
    );
    if (course) {
      return { institution, course };
    }
  }

  return null;
}

function isPostBasicBScNursingCourse(courseName = "") {
  return normalizeCourseLookup(courseName) === normalizeCourseLookup("P.B.B.Sc Nursing");
}

function generateAdmissionBatches(admissionYear, durationYears) {
  const year = parseInt(admissionYear);
  if (!year || Number.isNaN(year)) return [];
  const endYear = year + durationYears;
  return [`${year}-${endYear}`];
}

function getAvailableStudyYears(course) {
  if (course === "B.Sc Nursing") return ["1", "2", "3", "4"];
  if (course === "GNM") return ["1", "2", "3"];
  return ["1", "2"];
}

function clearFields(fieldNames = []) {
  return fieldNames.reduce((fields, fieldName) => {
    fields[fieldName] = "";
    return fields;
  }, {});
}

function getCurrentAdmissionYear() {
  const now = new Date();
  const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

const currentAdmissionYear = getCurrentAdmissionYear();

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

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

function calculateAge(dob = "") {
  if (!dob) return "";
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 0 ? String(age) : "";
}

function buildAddressLine(prefix, data = {}) {
  return [
    data[`${prefix}HouseNumber`],
    data[`${prefix}Village`],
    data[`${prefix}City`],
    data[`${prefix}District`],
    data[`${prefix}State`],
    data[`${prefix}PinCode`],
  ].filter(Boolean).join(", ");
}

function sanitizeFilename(value = "admission-form") {
  return String(value)
    .trim()
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "admission-form";
}

function formatSubmittedDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

async function buildSubmittedAdmissionSnapshot({
  formData,
  responseStudent,
  photoFile,
  casteCertificateFile,
  documentFiles,
}) {
  const uploadedDocuments = Object.entries(documentFiles)
    .filter(([, file]) => Boolean(file))
    .map(([label, file]) => ({
      label,
      name: file.name,
    }));

  return {
    ...(responseStudent || {}),
    ...formData,
    applicationId:
      responseStudent?.applicationId ||
      responseStudent?.registrationNo ||
      responseStudent?.admissionNumber ||
      "",
    registrationNo: responseStudent?.registrationNo || responseStudent?.applicationId || "",
    admissionNumber: responseStudent?.admissionNumber || responseStudent?.applicationId || "",
    status: responseStudent?.status || "Pending",
    syncStatus: responseStudent?.syncStatus || "",
    submittedAt: responseStudent?.submittedAt || responseStudent?.admissionDate || new Date().toISOString(),
    photoFilename: photoFile?.name || responseStudent?.photoFilename || "",
    casteCertificateFilename: casteCertificateFile?.name || responseStudent?.casteCertificateFilename || "",
    uploadedDocuments,
    photoDataUrl: await readImageFileAsDataUrl(photoFile),
    signatureDataUrl: await readImageFileAsDataUrl(documentFiles.Signature),
  };
}

function loadPdfImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function readImageFileAsDataUrl(file) {
  if (!file || !String(file.type || "").startsWith("image/")) {
    return Promise.resolve("");
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function getSubmittedAdmissionInstitutionProfile(record = {}) {
  const institution = String(record.institution || "").toLowerCase();
  const course = String(record.course || "").toLowerCase();
  const isSchool = institution.includes("school") || ["anm", "gnm"].includes(course.trim());

  return isSchool
    ? {
        name: "Sabarmati School of Nursing",
        letterheadUrl: "/school-letter-head.jpg",
      }
    : {
        name: "Sabarmati College of Nursing",
        letterheadUrl: "/college-letter-head.jpg",
      };
}

async function addSubmittedAdmissionPageHeader(doc, profile) {
  try {
    const letterhead = await loadPdfImage(profile.letterheadUrl);
    doc.addImage(letterhead, "JPEG", 0, 0, 210, 297);
  } catch {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.text(profile.name, 105, 20, { align: "center" });
    doc.setDrawColor(191, 219, 254);
    doc.line(14, 34, 196, 34);
  }

  doc.setFillColor(255, 255, 255);
}

function cleanPdfValue(value, fallback = "") {
  return value === undefined || value === null || value === "" ? fallback : String(value);
}

function formatPercent(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number.toFixed(2) : cleanPdfValue(value);
}

function getMScQualificationAcademicRecord(record = {}) {
  if (record.highestQualification === "Post Basic B.Sc Nursing") {
    return {
      label: "Post Basic B.Sc Nursing",
      degree: "Post Basic B.Sc Nursing",
      university: record.postBasicBscNursingUniversity,
      college: record.postBasicBscNursingCollegeName,
      passingYear: record.postBasicBscNursingPassingYear,
      obtainedMarks: record.postBasicBscNursingObtainedMarks,
      totalMarks: record.postBasicBscNursingTotalMarks,
      percentage: record.postBasicBscNursingPercentage,
    };
  }

  if (record.highestQualification === "Basic B.Sc Nursing") {
    return {
      label: "Basic B.Sc Nursing",
      degree: "Basic B.Sc Nursing",
      university: record.basicBscNursingUniversity,
      college: record.basicBscNursingCollegeName,
      passingYear: record.basicBscNursingPassingYear,
      obtainedMarks: record.basicBscNursingObtainedMarks,
      totalMarks: record.basicBscNursingTotalMarks,
      percentage: record.basicBscNursingPercentage,
    };
  }

  return null;
}

function getGnmAcademicRecord(record = {}) {
  if (!isPostBasicBScNursingCourse(record.course)) {
    return null;
  }

  return {
    label: "GNM",
    degree: "General Nursing and Midwifery",
    university: record.gnmBoard,
    college: record.gnmCollegeName,
    passingYear: record.gnmPassingYear,
    obtainedMarks: record.gnmObtainedMarks,
    totalMarks: record.gnmTotalMarks,
    percentage: record.gnmPercentage,
  };
}

const PDF_LAYOUT = {
  marginX: 10,
  contentWidth: 190,
  firstPageTopY: 76,
  topY: 76,
  bottomY: 284,
  sectionHeight: 11,
  sectionGap: 3,
};

function addTableSection(doc, title, x, y, width) {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, width, PDF_LAYOUT.sectionHeight, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(title, x + 2, y + 7.8);
  return y + PDF_LAYOUT.sectionHeight;
}

function drawCellText(doc, text, x, y, width, height, options = {}) {
  const { bold = false, fontSize = 7.6, align = "left", valign = "middle" } = options;
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);
  const lines = doc
    .splitTextToSize(cleanPdfValue(text, "-"), width - 3)
    .slice(0, Math.max(1, Math.floor(height / 4)));
  const textHeight = lines.length * (fontSize * 0.36 + 1.2);
  const textY = valign === "top" ? y + 5 : y + Math.max(5, (height - textHeight) / 2 + 4);
  doc.text(lines, align === "center" ? x + width / 2 : x + 1.7, textY, { align });
}

function drawGridRow(doc, cells, x, y, widths, height = 8) {
  let cursorX = x;
  cells.forEach((cell, index) => {
    const cellData = typeof cell === "object" && cell !== null ? cell : { text: cell };
    const cellWidth = widths[index];
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.setFillColor(255, 255, 255);
    doc.rect(cursorX, y, cellWidth, height, "FD");
    drawCellText(doc, cellData.text, cursorX, y, cellWidth, height, cellData);
    cursorX += cellWidth;
  });
  return y + height;
}

function drawInfoRows(doc, rows, x, y, width, rowHeight = 8) {
  const widths = [width * 0.28, width * 0.29, width * 0.24, width * 0.19];
  rows.forEach((row) => {
    y = drawGridRow(
      doc,
      [
        { text: row[0], bold: true },
        row[1],
        row[2] ? { text: row[2], bold: true } : "",
        row[3] || "",
      ],
      x,
      y,
      widths,
      rowHeight
    );
  });
  return y;
}

function drawTwoColumnRows(doc, rows, x, y, width, rowHeight = 8) {
  const widths = [width * 0.43, width * 0.57];
  rows.forEach(([label, value]) => {
    y = drawGridRow(doc, [{ text: label, bold: true }, value], x, y, widths, rowHeight);
  });
  return y;
}

function getSubjectPercentage(mark) {
  const secured = Number.parseFloat(mark);
  return Number.isFinite(secured) ? secured.toFixed(2) : "";
}

function calculatePercentage(obtained, total) {
  const obtainedMarks = Number.parseFloat(obtained);
  const totalMarks = Number.parseFloat(total);
  if (!Number.isFinite(obtainedMarks) || !Number.isFinite(totalMarks) || totalMarks <= 0) {
    return "";
  }
  return ((obtainedMarks / totalMarks) * 100).toFixed(2);
}

function getTwelfthStreamSubjects(stream = "") {
  return TWELFTH_STREAM_SUBJECTS[stream] || TWELFTH_STREAM_SUBJECTS.Science;
}

function calculateTwelfthPercentage(record = {}) {
  return calculatePercentage(record.twelfthObtainedMarks, record.twelfthTotalMarks);
}

function applyAcademicPercentages(record = {}) {
  record.tenthPercentage = calculatePercentage(record.tenthObtainedMarks, record.tenthTotalMarks);
  record.twelfthPercentage = calculateTwelfthPercentage(record);
  record.basicBscNursingPercentage = calculatePercentage(
    record.basicBscNursingObtainedMarks,
    record.basicBscNursingTotalMarks
  );
  record.postBasicBscNursingPercentage = calculatePercentage(
    record.postBasicBscNursingObtainedMarks,
    record.postBasicBscNursingTotalMarks
  );
  record.gnmPercentage = calculatePercentage(record.gnmObtainedMarks, record.gnmTotalMarks);
  return record;
}

function getPdfImageFormat(dataUrl = "") {
  return dataUrl.includes("image/png") ? "PNG" : "JPEG";
}

async function ensurePdfSpace(doc, profile, y, requiredHeight) {
  if (y + requiredHeight <= PDF_LAYOUT.bottomY) {
    return y;
  }

  doc.addPage();
  await addSubmittedAdmissionPageHeader(doc, profile);
  return PDF_LAYOUT.topY;
}

function addContainedPdfImage(doc, dataUrl, x, y, boxWidth, boxHeight) {
  if (!dataUrl) {
    return;
  }

  const imageProperties = doc.getImageProperties(dataUrl);
  const imageWidth = imageProperties?.width || boxWidth;
  const imageHeight = imageProperties?.height || boxHeight;
  const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const drawX = x + (boxWidth - drawWidth) / 2;
  const drawY = y + (boxHeight - drawHeight) / 2;
  doc.addImage(dataUrl, getPdfImageFormat(dataUrl), drawX, drawY, drawWidth, drawHeight);
}

async function addFilledFormPage(doc, profile, isFirstPage = false) {
  if (!isFirstPage) {
    doc.addPage();
  }
  await addSubmittedAdmissionPageHeader(doc, profile);
}

async function downloadSubmittedAdmissionPdf(record) {
  if (!record) {
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const profile = getSubmittedAdmissionInstitutionProfile(record);
  const x = 10;
  const width = 190;

  await addFilledFormPage(doc, profile, true);

  let y = PDF_LAYOUT.firstPageTopY;
  y = drawGridRow(
    doc,
    [
      { text: "Application No.", bold: true, fontSize: 13 },
      { text: record.applicationId || record.registrationNo || record.admissionNumber || "Pending", fontSize: 13 },
    ],
    x,
    y,
    [76, 114],
    12
  );
  y += 5;

  y = addTableSection(doc, "Application Information", x, y, width);
  y = drawTwoColumnRows(
    doc,
    [
      ["Institution", record.institution || profile.name],
      ["Applied Program", record.course],
      ["Courses For", record.course],
      ["Academic Year", record.year],
      ["Admission Date", formatSubmittedDate(record.admissionDate)],
      ["Admission Batch", record.admissionBatch],
    ],
    x,
    y,
    width
  );
  y += 6;

  y = addTableSection(doc, "Personal Information", x, y, width);
  y = drawInfoRows(
    doc,
    [
      ["Candidate's Name", record.studentName, "Date of Birth", record.dob],
      ["Gender", record.gender, "Social Category", record.casteCategory],
      ["Blood Group", record.bloodGroup, "Age", record.age],
      ["Religion", record.religion, "Nationality", record.nationality],
      ["Email Address", record.email, "Mobile Number(+91)", record.phone],
      ["WhatsApp Number", record.whatsappNumber, "Aadhaar Number", record.aadhaarNumber],
      ["Father's Name", record.fatherName, "Mother's Name", record.motherName],
      ["Father's Occupation", record.parentOccupation, "Father's Mobile No", record.fatherPhone],
    ],
    x,
    y,
    width,
    8.8
  );
  y += 6;

  y = addTableSection(doc, "Guardian's Details", x, y, width);
  y = drawTwoColumnRows(
    doc,
    [
      ["Guardian's Name", record.guardianName || record.fatherName],
      ["Guardian's Profession", record.parentOccupation],
      ["Guardian's Relation with Candidate", record.guardianName ? "Guardian" : "Father"],
      ["Guardian's Mobile No", record.fatherPhone],
    ],
    x,
    y,
    width
  );
  y += 6;

  y = addTableSection(doc, "Contact Information(Present)", x, y, width);
  y = drawInfoRows(
    doc,
    [
      ["Locality/Street Name", record.presentVillage || record.presentHouseNumber, "Post Office", record.presentCity],
      ["District", record.presentDistrict, "State", record.presentState],
      ["City name", record.presentCity, "Pin Code", record.presentPinCode],
    ],
    x,
    y,
    width,
    8.5
  );
  y += 6;

  y = addTableSection(doc, "Contact Information(Permanent)", x, y, width);
  drawInfoRows(
    doc,
    [
      ["Locality/Street Name", record.permanentVillage || record.permanentHouseNumber || record.address, "Post Office", record.permanentCity],
      ["District", record.permanentDistrict, "State", record.permanentState],
      ["City name", record.permanentCity, "Pin Code", record.permanentPinCode],
    ],
    x,
    y,
    width,
    8.5
  );

  await addFilledFormPage(doc, profile);
  y = PDF_LAYOUT.topY;
  y = addTableSection(doc, "Academic Information:", x, y, width);
  const academicWidths = [28, 18, 24, 16, 38, 13, 20, 23, 10];
  y = drawGridRow(
    doc,
    [
      { text: "Name of the Examination", bold: true },
      { text: "Degree", bold: true },
      { text: "Board /Council/ University", bold: true },
      { text: "Other Board", bold: true },
      { text: "School/College Name", bold: true },
      { text: "YOP", bold: true },
      { text: "Mark Secured", bold: true },
      { text: "Maximum Marks", bold: true },
      { text: "% of Marks", bold: true },
    ],
    x,
    y,
    academicWidths,
    20
  );
  y = drawGridRow(
    doc,
    [
      { text: "10th / Secondary", bold: true },
      "",
      record.tenthBoard,
      "",
      record.tenthSchoolName,
      record.tenthPassingYear,
      cleanPdfValue(record.tenthObtainedMarks),
      cleanPdfValue(record.tenthTotalMarks),
      formatPercent(record.tenthPercentage),
    ],
    x,
    y,
    academicWidths,
    18
  );
  y = drawGridRow(
    doc,
    [
      { text: "12th / Senior Secondary / Diploma", bold: true },
      record.twelfthStream || "Science with biology",
      record.twelfthBoard,
      "",
      record.twelfthCollegeName,
      record.twelfthPassingYear,
      cleanPdfValue(record.twelfthObtainedMarks),
      cleanPdfValue(record.twelfthTotalMarks),
      formatPercent(record.twelfthPercentage),
    ],
    x,
    y,
    academicWidths,
    20
  );
  const mScQualificationAcademicRecord = getMScQualificationAcademicRecord(record);
  const extraAcademicRecords = [getGnmAcademicRecord(record), mScQualificationAcademicRecord].filter(Boolean);
  extraAcademicRecords.forEach((academicRecord) => {
    y = drawGridRow(
      doc,
      [
        { text: academicRecord.label, bold: true },
        academicRecord.degree,
        academicRecord.university,
        "",
        academicRecord.college,
        academicRecord.passingYear,
        cleanPdfValue(academicRecord.obtainedMarks),
        cleanPdfValue(academicRecord.totalMarks),
        formatPercent(academicRecord.percentage),
      ],
      x,
      y,
      academicWidths,
      20
    );
  });

  y += 4;
  y = addTableSection(doc, "12th examination Marks :", x, y, width);
  const subjectWidths = [76, 38, 38, 38];
  y = drawGridRow(
    doc,
    [{ text: "Subject", bold: true }, { text: "Mark Secured", bold: true }, { text: "Maximum Mark", bold: true }, { text: "Percentage", bold: true }],
    x,
    y,
    subjectWidths,
    10
  );
  getTwelfthStreamSubjects(record.twelfthStream).forEach((subjectInfo) => {
    const mark = record[subjectInfo.name];
    y = drawGridRow(doc, [{ text: subjectInfo.subject, bold: true }, mark, mark ? "100" : "", getSubjectPercentage(mark)], x, y, subjectWidths, 10);
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("DECLARATION", 105, y + 7, { align: "center" });
  doc.line(87, y + 8, 123, y + 8);
  const declaration = "I do hereby declare that the above furnished informations are true to best of my knowledge & belief. In case, any false & fabricated information & documents found to be incorrect, legal action as deemed proper will be initiated against me.";
  doc.text(doc.splitTextToSize(declaration, width), x + 1, y + 14);
  y += 29;

  y = addTableSection(doc, "Images uploaded by the Candidates", x, y, width);
  y = drawGridRow(doc, [{ text: "Photograph", bold: true, align: "center" }, { text: "Signature", bold: true, align: "center" }], x, y, [95, 95], 10);
  doc.rect(x, y, 95, 42);
  doc.rect(x + 95, y, 95, 42);
  if (record.photoDataUrl) {
    doc.addImage(record.photoDataUrl, getPdfImageFormat(record.photoDataUrl), x + 30, y + 4, 35, 34);
  }
  if (record.signatureDataUrl) {
    doc.addImage(record.signatureDataUrl, getPdfImageFormat(record.signatureDataUrl), x + 114, y + 8, 52, 24);
  }
  y += 42;

  y = addTableSection(doc, "Document Details", x, y, width);
  const documentLines = (record.uploadedDocuments || [])
    .map((item, index) => `${index + 1}. ${item.label}: ${item.name}`)
    .concat(record.uploadedDocuments?.length ? [] : ["No document list available."]);
  drawGridRow(doc, [{ text: documentLines.join("\n"), valign: "top" }], x, y, [width], 24);

  doc.save(`${sanitizeFilename(record.applicationId || record.studentName)}-submitted-admission-form.pdf`);
}

function StudentAdmissionFormPage() {
  const [searchParams] = useSearchParams();
  const selectedCourse = searchParams.get("course") || "";
  const selectedCourseSetup = findCourseSelection(selectedCourse);
  const defaultAdmissionYear = getAdmissionStartYear(currentAdmissionYear);
  const defaultCourseDuration = selectedCourseSetup?.course?.durationYears || 4;
  const [formData, setFormData] = useState({
    ...initialForm,
    institutionId: selectedCourseSetup?.institution?.id || "",
    institution: selectedCourseSetup?.institution?.name || "",
    courseId: selectedCourseSetup?.course?.id || "",
    course: selectedCourseSetup?.course?.name || selectedCourse,
    admissionDate: getTodayDateInputValue(),
    year: currentAdmissionYear,
    admissionYear: defaultAdmissionYear,
    admissionBatch: generateAdmissionBatches(defaultAdmissionYear, defaultCourseDuration)[0] || "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [casteCertificateFile, setCasteCertificateFile] = useState(null);
  const [documentFiles, setDocumentFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [exportYear, setExportYear] = useState(getAdmissionStartYear(currentAdmissionYear));
  const [successRecord, setSuccessRecord] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const requiresCasteCertificate = CATEGORY_CERTIFICATE_OPTIONS.has(formData.casteCategory);
  const requiresMScSpecialization = MSC_NURSING_COURSES.has(formData.course);
  const selectedMScQualification = requiresMScSpecialization ? formData.highestQualification : "";
  const showsBasicBScNursingAcademicInfo = selectedMScQualification === "Basic B.Sc Nursing";
  const showsPostBasicBScNursingAcademicInfo = selectedMScQualification === "Post Basic B.Sc Nursing";
  const showsGnmAcademicInfo = isPostBasicBScNursingCourse(formData.course);

  const availableCourses = useMemo(() => {
    if (!formData.institutionId) return [];
    const institution = INSTITUTIONS.find((inst) => inst.id === formData.institutionId);
    return institution?.courses || [];
  }, [formData.institutionId]);

  const courseDuration = useMemo(() => {
    return getCourseDuration(formData.institutionId, formData.courseId);
  }, [formData.institutionId, formData.courseId]);

  const admissionBatches = useMemo(() => {
    return generateAdmissionBatches(formData.admissionYear, courseDuration);
  }, [formData.admissionYear, courseDuration]);

  const availableStudyYears = useMemo(() => {
    return getAvailableStudyYears(formData.course);
  }, [formData.course]);

  const photoPreview = useMemo(() => {
    if (!photoFile) {
      return "";
    }

    return URL.createObjectURL(photoFile);
  }, [photoFile]);

  const requiredDocuments = useMemo(
    () => {
      const documents =
        formData.course === "M.Sc Nursing" && formData.highestQualification === "Post Basic B.Sc Nursing"
          ? COURSE_DOCUMENTS["MSC(N)After P.B.BSc(N)"]
          : formData.course === "M.Sc Nursing" && formData.highestQualification === "Basic B.Sc Nursing"
            ? COURSE_DOCUMENTS["MSC(N)After B.Sc(N)"]
            : COURSE_DOCUMENTS[formData.course] || COMMON_REQUIRED_DOCUMENTS;
      return CATEGORY_CERTIFICATE_OPTIONS.has(formData.casteCategory)
        ? Array.from(new Set([...documents, CASTE_CERTIFICATE_LABEL]))
        : documents.filter((documentName) => documentName !== CASTE_CERTIFICATE_LABEL);
    },
    [formData.casteCategory, formData.course, formData.highestQualification]
  );

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    const fieldValue = type === "checkbox" ? checked : value;
    setFormData((current) => {
      const next = {
        ...current,
        [name]: fieldValue,
        ...(name === "dob" ? { age: calculateAge(fieldValue) } : {}),
        ...(name === "course" && !MSC_NURSING_COURSES.has(fieldValue)
          ? {
              mScSpecialization: "",
              highestQualification: "",
              ...clearFields(MSC_NURSING_ACADEMIC_FIELDS),
            }
          : {}),
      };

      if (name === "institutionId") {
        const institution = INSTITUTIONS.find((inst) => inst.id === fieldValue);
        const nextCourse = institution?.courses[0];
        next.institution = institution?.name || "";
        next.courseId = nextCourse?.id || "";
        next.course = nextCourse?.name || "";
        const duration = getCourseDuration(fieldValue, nextCourse?.id);
        next.admissionBatch = generateAdmissionBatches(next.admissionYear, duration)[0] || "";
      }

      if (name === "courseId") {
        const institution = INSTITUTIONS.find((inst) => inst.id === next.institutionId);
        const course = institution?.courses.find((c) => c.id === fieldValue);
        next.course = course?.name || "";
        const duration = getCourseDuration(next.institutionId, fieldValue);
        next.admissionBatch = generateAdmissionBatches(next.admissionYear, duration)[0] || "";
        next.currentStudyYear = "1";
        if (!MSC_NURSING_COURSES.has(next.course)) {
          next.mScSpecialization = "";
          next.highestQualification = "";
          Object.assign(next, clearFields(MSC_NURSING_ACADEMIC_FIELDS));
        }
        if (!isPostBasicBScNursingCourse(next.course)) {
          Object.assign(next, clearFields(GNM_ACADEMIC_FIELDS));
        }
      }

      if (name === "course" && !isPostBasicBScNursingCourse(fieldValue)) {
        Object.assign(next, clearFields(GNM_ACADEMIC_FIELDS));
      }

      if (name === "highestQualification") {
        Object.assign(
          next,
          clearFields(
            fieldValue === "Post Basic B.Sc Nursing"
              ? BASIC_BSC_NURSING_ACADEMIC_FIELDS
              : fieldValue === "Basic B.Sc Nursing"
                ? POST_BASIC_BSC_NURSING_ACADEMIC_FIELDS
                : MSC_NURSING_ACADEMIC_FIELDS
          )
        );
      }

      if (name === "admissionYear") {
        const duration = getCourseDuration(next.institutionId, next.courseId);
        next.admissionBatch = generateAdmissionBatches(fieldValue, duration)[0] || "";
        next.year = buildAcademicYearFromStartYear(fieldValue);
      }

      if (name === "presentSameAsPermanent" && fieldValue) {
        next.presentHouseNumber = next.permanentHouseNumber;
        next.presentVillage = next.permanentVillage;
        next.presentCity = next.permanentCity;
        next.presentDistrict = next.permanentDistrict;
        next.presentState = next.permanentState;
        next.presentPinCode = next.permanentPinCode;
      }

      if (name.startsWith("permanent") && next.presentSameAsPermanent) {
        next.presentHouseNumber = next.permanentHouseNumber;
        next.presentVillage = next.permanentVillage;
        next.presentCity = next.permanentCity;
        next.presentDistrict = next.permanentDistrict;
        next.presentState = next.permanentState;
        next.presentPinCode = next.permanentPinCode;
      }

      if (name === "twelfthStream") {
        const streamSubjectFields = new Set(getTwelfthStreamSubjects(fieldValue).map((subject) => subject.name));
        TWELFTH_MARK_FIELDS.forEach((field) => {
          if (!streamSubjectFields.has(field)) {
            next[field] = "";
          }
        });
      }

      return applyAcademicPercentages(next);
    });

    if (name === "casteCategory" && !CATEGORY_CERTIFICATE_OPTIONS.has(fieldValue)) {
      setCasteCertificateFile(null);
      setDocumentFiles((current) => {
        const next = { ...current };
        delete next[CASTE_CERTIFICATE_LABEL];
        return next;
      });
    }
  };

  const handleDocumentFileChange = (label, event) => {
    const file = event.target.files?.[0] || null;

    setDocumentFiles((current) => {
      const next = { ...current };
      if (file) {
        next[label] = file;
      } else {
        delete next[label];
      }
      return next;
    });

    if (label === PASS_PHOTO_LABEL) {
      setPhotoFile(file);
    }

    if (label === CASTE_CERTIFICATE_LABEL) {
      setCasteCertificateFile(file);
    }
  };

  const resetForm = (year = currentAdmissionYear) => {
    const admissionYear = getAdmissionStartYear(year);
    const courseSetup = findCourseSelection(selectedCourse);
    const duration = courseSetup?.course?.durationYears || 4;
    setExportYear(admissionYear);
    setFormData({
      ...initialForm,
      institutionId: courseSetup?.institution?.id || "",
      institution: courseSetup?.institution?.name || "",
      courseId: courseSetup?.course?.id || "",
      course: courseSetup?.course?.name || selectedCourse,
      admissionDate: getTodayDateInputValue(),
      year,
      admissionYear,
      admissionBatch: generateAdmissionBatches(admissionYear, duration)[0] || "",
    });
    setPhotoFile(null);
    setCasteCertificateFile(null);
    setDocumentFiles({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccessRecord(null);

    try {
      if (requiresCasteCertificate && !casteCertificateFile) {
        throw new Error("Please upload the caste certificate for the selected category.");
      }
      const payload = new FormData();
      const normalizedFormData = applyAcademicPercentages({ ...formData });
      const payloadData = {
        ...normalizedFormData,
        address: buildAddressLine("permanent", formData),
        age: calculateAge(formData.dob),
      };
      Object.entries(payloadData).forEach(([key, value]) => payload.append(key, value));
      if (photoFile) {
        payload.append("photo", photoFile);
      }
      if (casteCertificateFile) {
        payload.append("casteCertificate", casteCertificateFile);
      }
      const supportingDocumentEntries = Object.entries(documentFiles).filter(
        ([label, file]) => file && label !== PASS_PHOTO_LABEL && label !== CASTE_CERTIFICATE_LABEL
      );
      supportingDocumentEntries.forEach(([, file]) => payload.append("supportingDocuments", file));
      payload.append(
        "supportingDocumentLabels",
        JSON.stringify(supportingDocumentEntries.map(([label]) => label))
      );

      const response = await apiRequest("/api/admission", {
        method: "POST",
        body: payload,
      });

      const submittedRecord = await buildSubmittedAdmissionSnapshot({
        formData: payloadData,
        responseStudent: response.student,
        photoFile,
        casteCertificateFile,
        documentFiles,
      });
      setSuccessRecord(submittedRecord);
      
      setSuccess("Admission submitted successfully!");
      await downloadSubmittedAdmissionPdf(submittedRecord);
      
      resetForm(formData.year);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelDownload = async () => {
    setDownloadLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("year", exportYear);
      const query = params.toString();
      await downloadFile(
        `/api/admission/export/xlsx${query ? `?${query}` : ""}`,
        `admissions-export-${exportYear}.xls`
      );
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleSubmittedFormDownload = async () => {
    if (!successRecord) {
      setError("Please submit the admission form first. The filled form download will use the submitted data.");
      return;
    }

    setError("");
    await downloadSubmittedAdmissionPdf(successRecord);
  };

  const uploadedDocumentCount = requiredDocuments.filter((documentName) => {
    if (documentName === PASS_PHOTO_LABEL) {
      return Boolean(photoFile);
    }

    if (documentName === CASTE_CERTIFICATE_LABEL && !requiresCasteCertificate) {
      return false;
    }

    return Boolean(documentFiles[documentName]);
  }).length;

  const fieldClassName =
    "rounded-[26px] border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-blue-200 hover:bg-white";
  const controlClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:opacity-60";
  const renderField = ({ name, label, icon = <UserRound size={16} className="text-blue-700" />, type = "text", placeholder = "", required = false, disabled = false, min, max, step }) => (
    <label className={fieldClassName}>
      <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {icon}
        {label}
      </span>
      <input
        name={name}
        type={type}
        value={formData[name] ?? ""}
        onChange={handleChange}
        disabled={disabled}
        className={controlClassName}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
      />
    </label>
  );
  const renderSelect = ({ name, label, options, icon = <UserRound size={16} className="text-blue-700" />, placeholder = "Select option", required = false }) => (
    <label className={fieldClassName}>
      <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {icon}
        {label}
      </span>
      <select
        name={name}
        value={formData[name] ?? ""}
        onChange={handleChange}
        className={controlClassName}
        required={required}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_28%),linear-gradient(180deg,#eff6ff_0%,#f8fafc_45%,#e5e7eb_100%)] px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
      <div className="w-full">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <div className="grid xl:grid-cols-[390px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
            <aside className="relative overflow-hidden bg-[linear-gradient(180deg,#0f172a_0%,#0f3d73_52%,#1d4ed8_100%)] px-6 py-7 text-white sm:px-8">
              <div className="hero-grid" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                  <ShieldCheck size={14} />
                  Official Admission Portal
                </span>

                <h1 className="mt-5 text-3xl font-black tracking-tight">
                  Professional course admission form
                </h1>
                <p className="mt-4 text-sm leading-7 text-slate-200">
                  Submit the admission profile once and keep the academic office,
                  Google Forms, Google Sheets, and Excel export records aligned from
                  the same workflow.
                </p>

                <div className="mt-7 space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
                      Workflow
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white">
                      Website Admission Form to Google Form to Google Sheets to Excel
                      export.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
                      Selected Course
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formData.course || "Choose a course below"}
                    </p>
                    {formData.mScSpecialization && (
                      <p className="mt-1 text-sm leading-6 text-blue-100">
                        {formData.mScSpecialization}
                      </p>
                    )}
                    {formData.highestQualification && (
                      <p className="mt-1 text-sm leading-6 text-blue-100">
                        Highest Qualification: {formData.highestQualification}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-8 grid gap-3">
                  <button
                    type="button"
                    onClick={handleExcelDownload}
                    disabled={downloadLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    <FileSpreadsheet size={16} />
                    {downloadLoading ? "Downloading Excel..." : "Download Excel Records"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmittedFormDownload}
                    disabled={!successRecord}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    <FileText size={16} />
                    {successRecord ? "Download Submitted Form" : "Submit First To Download"}
                  </button>
                  <Link
                    to={`/dashboard/academichub/admission/records?year=${encodeURIComponent(exportYear)}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    View Admin Dashboard
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </aside>

            <div className="min-w-0 bg-white px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <div className="rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                      College Admission Management
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                      Student admission application
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Complete the official form below. Every submission is designed to
                      flow into the institute’s admission records dashboard and Google
                      sheet export workflow.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-1 lg:min-w-[220px]">
                    <button
                      type="button"
                      onClick={handleSubmittedFormDownload}
                      disabled={!successRecord}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-100 transition hover:bg-blue-800"
                    >
                      <FileText size={16} />
                      {successRecord ? "Download Submitted Form" : "Submit First To Download"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[28px] border border-amber-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <CheckCircle2 size={22} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                      Required Documents To Be Uploaded
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-900">
                      {formData.course || "Selected course"} document checklist
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Each required document now has its own upload option below. Upload the caste certificate when required by category, and complete every relevant document slot for the selected course.
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                      {requiredDocuments.map((documentName, index) => (
                        <div
                          key={`${formData.course || "course"}-${documentName}`}
                          className="rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm text-slate-700"
                        >
                          <span className="font-semibold text-amber-700">{index + 1}.</span> {documentName}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              {successRecord && (
                <div className="mt-5 rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-900 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        <CheckCircle2 size={16} />
                        Submission Successful
                      </p>
                      <h3 className="mt-2 text-xl font-bold">
                        Admission saved for {successRecord.studentName}
                      </h3>
                      <p className="mt-2 text-sm leading-6">
                        Application ID: {successRecord.applicationId} and current
                        status: {successRecord.status}.
                      </p>
                      <p className="mt-1 text-sm leading-6">
                        Admission year: {successRecord.admissionYear || formData.admissionYear}.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleSubmittedFormDownload}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                      >
                        <FileText size={16} />
                        Download Submitted Form
                      </button>

                      <Link
                        to={`/dashboard/academichub/admission/records?year=${encodeURIComponent(successRecord.admissionYear || formData.admissionYear)}`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Open Dashboard
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div className="rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                      <Building2 size={22} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                        Institution & Course Details
                      </p>
                      <h3 className="text-lg font-bold text-slate-900">
                        Select institution, course, and admission details
                      </h3>
                    </div>
                  </div>
                  <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                    <label className="rounded-[26px] border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-blue-200 hover:bg-white">
                      <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Building2 size={16} className="text-blue-700" />
                        Institution
                      </span>
                      <select
                        name="institutionId"
                        value={formData.institutionId}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        required
                      >
                        <option value="">Select institution</option>
                        {INSTITUTIONS.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="rounded-[26px] border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-blue-200 hover:bg-white">
                      <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <GraduationCap size={16} className="text-blue-700" />
                        Course
                      </span>
                      <select
                        name="courseId"
                        value={formData.courseId}
                        onChange={handleChange}
                        disabled={!formData.institutionId}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                        required
                      >
                        <option value="">Select course</option>
                        {availableCourses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.name} ({course.durationYears} Years)
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="rounded-[26px] border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-blue-200 hover:bg-white">
                      <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CalendarDays size={16} className="text-blue-700" />
                        Admission Year
                      </span>
                      <select
                        name="admissionYear"
                        value={formData.admissionYear}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        required
                      >
                        <option value="">Select admission year</option>
                        {admissionYearSingleOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>

                    {renderField({ name: "admissionDate", label: "Admission Date", icon: <CalendarDays size={16} className="text-blue-700" />, type: "date", required: true })}

                    <label className="rounded-[26px] border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-blue-200 hover:bg-white">
                      <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CalendarDays size={16} className="text-blue-700" />
                        Admission Batch
                      </span>
                      <select
                        name="admissionBatch"
                        value={formData.admissionBatch}
                        onChange={handleChange}
                        disabled={!formData.courseId || !formData.admissionYear}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                        required
                      >
                        <option value="">Auto-generated based on course</option>
                        {admissionBatches.map((batch) => (
                          <option key={batch} value={batch}>
                            {batch}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="rounded-[26px] border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-blue-200 hover:bg-white">
                      <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <GraduationCap size={16} className="text-blue-700" />
                        Current Study Year
                      </span>
                      <select
                        name="currentStudyYear"
                        value={formData.currentStudyYear}
                        onChange={handleChange}
                        disabled={!formData.course}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                        required
                      >
                        <option value="">Select study year</option>
                        {availableStudyYears.map((year) => (
                          <option key={year} value={year}>
                            {STUDY_YEAR_LABELS[parseInt(year) - 1] || `Year ${year}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                      <UserRound size={22} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                        Student Personal Details
                      </p>
                      <h3 className="text-lg font-bold text-slate-900">
                        Identity, contact, and category information
                      </h3>
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                    {renderField({ name: "studentName", label: "Student Full Name", placeholder: "Enter student full name", required: true })}
                    {renderSelect({ name: "gender", label: "Gender", options: ["Male", "Female", "Other"], placeholder: "Select gender", required: true })}
                    {renderField({ name: "dob", label: "Date of Birth", type: "date", required: true })}
                    {renderField({ name: "age", label: "Age (Auto Calculate)", placeholder: "Auto calculated", disabled: true })}
                    {renderSelect({ name: "bloodGroup", label: "Blood Group", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], placeholder: "Select blood group" })}
                    {renderField({ name: "aadhaarNumber", label: "Aadhaar Number", placeholder: "Enter Aadhaar number" })}
                    {renderField({ name: "phone", label: "Mobile Number", icon: <Phone size={16} className="text-blue-700" />, placeholder: "Enter mobile number", required: true })}
                    {renderField({ name: "whatsappNumber", label: "WhatsApp Number", icon: <Phone size={16} className="text-blue-700" />, placeholder: "Enter WhatsApp number" })}
                    {renderField({ name: "email", label: "Email Address", icon: <Mail size={16} className="text-blue-700" />, type: "email", placeholder: "Enter email address", required: true })}
                    {renderField({ name: "nationality", label: "Nationality", placeholder: "Enter nationality" })}
                    {renderField({ name: "religion", label: "Religion", placeholder: "Enter religion" })}
                    {renderSelect({ name: "maritalStatus", label: "Marital Status", options: ["Single", "Married", "Divorced", "Widowed"], placeholder: "Select marital status" })}
                    {renderSelect({ name: "casteCategory", label: "Category", options: CATEGORY_OPTIONS, placeholder: "Select category", required: true })}

                    {requiresMScSpecialization && (
                      <label className={fieldClassName}>
                        <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <GraduationCap size={16} className="text-blue-700" />
                          M.Sc (N) Specialization
                        </span>
                        <select
                          name="mScSpecialization"
                          value={formData.mScSpecialization}
                          onChange={handleChange}
                          className={controlClassName}
                          required
                        >
                          <option value="">Select specialization</option>
                          {MSC_NURSING_SPECIALIZATIONS.map((specialization) => (
                            <option key={specialization} value={specialization}>
                              {specialization}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {requiresMScSpecialization && (
                      <label className={fieldClassName}>
                        <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <GraduationCap size={16} className="text-blue-700" />
                          Highest Qualification
                        </span>
                        <select
                          name="highestQualification"
                          value={formData.highestQualification}
                          onChange={handleChange}
                          className={controlClassName}
                          required
                        >
                          <option value="">Select highest qualification</option>
                          {MSC_NURSING_HIGHEST_QUALIFICATIONS.map((qualification) => (
                            <option key={qualification} value={qualification}>
                              {qualification}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  {requiresCasteCertificate && (
                    <label className="mt-5 block rounded-[26px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
                      <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
                        <FileText size={16} />
                        Upload Category Certificate
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(event) => handleDocumentFileChange(CASTE_CERTIFICATE_LABEL, event)}
                        className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:font-semibold file:text-white"
                        required
                      />
                      <p className="mt-2 text-xs text-amber-700">
                        Required for OBC, SC, ST, and EWS category applications.
                      </p>
                    </label>
                  )}
                </div>

                <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                      <UserRound size={22} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                        Step 3: Parent / Guardian Details
                      </p>
                      <h3 className="text-lg font-bold text-slate-900">
                        Family contact and income details
                      </h3>
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                    {renderField({ name: "fatherName", label: "Father's Name", placeholder: "Enter father's full name", required: true })}
                    {renderField({ name: "motherName", label: "Mother's Name", placeholder: "Enter mother's full name" })}
                    {renderField({ name: "guardianName", label: "Guardian Name", placeholder: "Enter guardian name" })}
                    {renderField({ name: "parentOccupation", label: "Occupation", placeholder: "Enter occupation" })}
                    {renderField({ name: "annualIncome", label: "Annual Income", type: "number", placeholder: "Enter annual income" })}
                    {renderField({ name: "fatherPhone", label: "Mobile Number", icon: <Phone size={16} className="text-blue-700" />, placeholder: "Enter mobile number", required: true })}
                    {renderField({ name: "parentEmail", label: "Email", icon: <Mail size={16} className="text-blue-700" />, type: "email", placeholder: "Enter parent email" })}
                    {renderField({ name: "parentAadhaarNumber", label: "Aadhaar Number", placeholder: "Enter Aadhaar number" })}
                  </div>
                </div>

                <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                      <MapPin size={22} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                        Step 4: Permanent Address
                      </p>
                      <h3 className="text-lg font-bold text-slate-900">
                        Residential address details
                      </h3>
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                    {renderField({ name: "permanentHouseNumber", label: "House Number", icon: <MapPin size={16} className="text-blue-700" />, placeholder: "Enter house number", required: true })}
                    {renderField({ name: "permanentVillage", label: "Village", icon: <MapPin size={16} className="text-blue-700" />, placeholder: "Enter village" })}
                    {renderField({ name: "permanentCity", label: "City", icon: <MapPin size={16} className="text-blue-700" />, placeholder: "Enter city", required: true })}
                    {renderField({ name: "permanentDistrict", label: "District", icon: <MapPin size={16} className="text-blue-700" />, placeholder: "Enter district", required: true })}
                    {renderField({ name: "permanentState", label: "State", icon: <MapPin size={16} className="text-blue-700" />, placeholder: "Enter state", required: true })}
                    {renderField({ name: "permanentPinCode", label: "PIN Code", icon: <MapPin size={16} className="text-blue-700" />, placeholder: "Enter PIN code", required: true })}
                  </div>
                </div>

                <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                        <MapPin size={22} />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                          Step 5: Present Address
                        </p>
                        <h3 className="text-lg font-bold text-slate-900">
                          Current residential address
                        </h3>
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                      <input
                        name="presentSameAsPermanent"
                        type="checkbox"
                        checked={formData.presentSameAsPermanent}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-slate-300 text-blue-700"
                      />
                      Same as Permanent Address
                    </label>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                    {renderField({ name: "presentHouseNumber", label: "House Number", icon: <MapPin size={16} className="text-blue-700" />, placeholder: "Enter house number", disabled: formData.presentSameAsPermanent })}
                    {renderField({ name: "presentVillage", label: "Village", icon: <MapPin size={16} className="text-blue-700" />, placeholder: "Enter village", disabled: formData.presentSameAsPermanent })}
                    {renderField({ name: "presentCity", label: "City", icon: <MapPin size={16} className="text-blue-700" />, placeholder: "Enter city", disabled: formData.presentSameAsPermanent })}
                    {renderField({ name: "presentDistrict", label: "District", icon: <MapPin size={16} className="text-blue-700" />, placeholder: "Enter district", disabled: formData.presentSameAsPermanent })}
                    {renderField({ name: "presentState", label: "State", icon: <MapPin size={16} className="text-blue-700" />, placeholder: "Enter state", disabled: formData.presentSameAsPermanent })}
                    {renderField({ name: "presentPinCode", label: "PIN Code", icon: <MapPin size={16} className="text-blue-700" />, placeholder: "Enter PIN code", disabled: formData.presentSameAsPermanent })}
                  </div>
                </div>

                <div className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                      <GraduationCap size={22} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                        Step 6: Educational Qualification
                      </p>
                      <h3 className="text-lg font-bold text-slate-900">
                        10th and 12th academic details
                      </h3>
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">10th Details</h4>
                    <div className="mt-4 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                      {renderField({ name: "tenthSchoolName", label: "School Name", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter school name" })}
                      {renderField({ name: "tenthBoard", label: "Board", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter board" })}
                      {renderField({ name: "tenthRollNumber", label: "Roll Number", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter roll number" })}
                      {renderField({ name: "tenthRegistrationNumber", label: "Registration Number", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter registration number" })}
                      {renderField({ name: "tenthPassingYear", label: "Passing Year", icon: <CalendarDays size={16} className="text-blue-700" />, type: "number", placeholder: "Enter passing year" })}
                      {renderField({ name: "tenthTotalMarks", label: "Total Marks", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Enter total marks" })}
                      {renderField({ name: "tenthObtainedMarks", label: "Obtained Marks", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Enter obtained marks" })}
                      {renderField({ name: "tenthPercentage", label: "Percentage", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Auto calculated", disabled: true })}
                    </div>
                  </div>

                  <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">12th Details</h4>
                    <div className="mt-4 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                      {renderField({ name: "twelfthCollegeName", label: "College Name", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter college name" })}
                      {renderField({ name: "twelfthBoard", label: "Board", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter board" })}
                      {renderField({ name: "twelfthRollNumber", label: "Roll Number", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter roll number" })}
                      {renderField({ name: "twelfthRegistrationNumber", label: "Registration Number", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter registration number" })}
                      {renderField({ name: "twelfthPassingYear", label: "Passing Year", icon: <CalendarDays size={16} className="text-blue-700" />, type: "number", placeholder: "Enter passing year" })}
                      {renderSelect({ name: "twelfthStream", label: "12th Stream", icon: <GraduationCap size={16} className="text-blue-700" />, options: TWELFTH_STREAM_OPTIONS, placeholder: "Select 12th stream" })}
                      <div className="lg:col-span-2 2xl:col-span-3">
                        <h5 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">12th Marks</h5>
                      </div>
                      {getTwelfthStreamSubjects(formData.twelfthStream).map((subject) =>
                        renderField({
                          name: subject.name,
                          label: `${subject.label} (Max 100)`,
                          icon: <GraduationCap size={16} className="text-blue-700" />,
                          type: "number",
                          placeholder: subject.placeholder,
                          min: "0",
                          max: "100",
                          step: "0.01",
                        })
                      )}
                    </div>

                    <div className="mt-5 rounded-[24px] border border-blue-100 bg-white p-4">
                      <h5 className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">12th Total Mark</h5>
                      <div className="mt-4 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                        {renderField({ name: "twelfthObtainedMarks", label: "Total Score", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Enter total score", min: "0", step: "0.01" })}
                        {renderField({ name: "twelfthTotalMarks", label: "Total Marks", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Enter total marks", min: "0", step: "0.01" })}
                        {renderField({ name: "twelfthPercentage", label: "Percentage", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Auto calculated", disabled: true })}
                      </div>
                    </div>
                  </div>

                  {showsPostBasicBScNursingAcademicInfo && (
                    <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Post Basic B.Sc Nursing Details</h4>
                      <div className="mt-4 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                        {renderField({ name: "postBasicBscNursingCollegeName", label: "College Name", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter post basic college name", required: true })}
                        {renderField({ name: "postBasicBscNursingUniversity", label: "University", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter university", required: true })}
                        {renderField({ name: "postBasicBscNursingRollNumber", label: "Roll Number", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter roll number" })}
                        {renderField({ name: "postBasicBscNursingRegistrationNumber", label: "Registration Number", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter registration number" })}
                        {renderField({ name: "postBasicBscNursingPassingYear", label: "Passing Year", icon: <CalendarDays size={16} className="text-blue-700" />, type: "number", placeholder: "Enter passing year", required: true })}
                        {renderField({ name: "postBasicBscNursingTotalMarks", label: "Total Marks", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Enter total marks" })}
                        {renderField({ name: "postBasicBscNursingObtainedMarks", label: "Obtained Marks", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Enter obtained marks" })}
                        {renderField({ name: "postBasicBscNursingPercentage", label: "Percentage", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Auto calculated", disabled: true })}
                      </div>
                    </div>
                  )}

                  {showsGnmAcademicInfo && (
                    <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">GNM Details</h4>
                      <div className="mt-4 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                        {renderField({ name: "gnmCollegeName", label: "College Name", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter GNM college name", required: true })}
                        {renderField({ name: "gnmBoard", label: "Board / Council", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter board or council", required: true })}
                        {renderField({ name: "gnmRollNumber", label: "Roll Number", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter roll number" })}
                        {renderField({ name: "gnmRegistrationNumber", label: "Registration Number", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter registration number" })}
                        {renderField({ name: "gnmPassingYear", label: "Passing Year", icon: <CalendarDays size={16} className="text-blue-700" />, type: "number", placeholder: "Enter passing year", required: true })}
                        {renderField({ name: "gnmTotalMarks", label: "Total Marks", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Enter total marks" })}
                        {renderField({ name: "gnmObtainedMarks", label: "Obtained Marks", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Enter obtained marks" })}
                        {renderField({ name: "gnmPercentage", label: "Percentage", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Auto calculated", disabled: true })}
                      </div>
                    </div>
                  )}

                  {showsBasicBScNursingAcademicInfo && (
                    <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Basic B.Sc Nursing Details</h4>
                      <div className="mt-4 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                        {renderField({ name: "basicBscNursingCollegeName", label: "College Name", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter basic B.Sc college name", required: true })}
                        {renderField({ name: "basicBscNursingUniversity", label: "University", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter university", required: true })}
                        {renderField({ name: "basicBscNursingRollNumber", label: "Roll Number", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter roll number" })}
                        {renderField({ name: "basicBscNursingRegistrationNumber", label: "Registration Number", icon: <GraduationCap size={16} className="text-blue-700" />, placeholder: "Enter registration number" })}
                        {renderField({ name: "basicBscNursingPassingYear", label: "Passing Year", icon: <CalendarDays size={16} className="text-blue-700" />, type: "number", placeholder: "Enter passing year", required: true })}
                        {renderField({ name: "basicBscNursingTotalMarks", label: "Total Marks", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Enter total marks" })}
                        {renderField({ name: "basicBscNursingObtainedMarks", label: "Obtained Marks", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Enter obtained marks" })}
                        {renderField({ name: "basicBscNursingPercentage", label: "Percentage", icon: <GraduationCap size={16} className="text-blue-700" />, type: "number", placeholder: "Auto calculated", disabled: true })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5 shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                        Document Upload Desk
                      </p>
                      <h3 className="mt-2 text-2xl font-black text-slate-900">
                        Upload verified admission documents
                      </h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        Add clear scanned copies for each record. Required items are
                        marked for the selected course and category.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">
                        {uploadedDocumentCount}/{requiredDocuments.length}
                      </span>{" "}
                      document slots completed
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {requiredDocuments.map((documentName) => {
                    const isPhoto = documentName === PASS_PHOTO_LABEL;
                    const isCasteCertificate = documentName === CASTE_CERTIFICATE_LABEL;
                    const file = documentFiles[documentName] || null;
                    const isCasteRequired = isCasteCertificate ? requiresCasteCertificate : true;
                    const isUploaded = isPhoto ? Boolean(photoFile) : Boolean(file);
                    const helperText =
                      isCasteCertificate && !requiresCasteCertificate
                        ? "Optional for General category."
                        : "Required for this application.";

                    return (
                      <label
                        key={`${formData.course || "course"}-upload-${documentName}`}
                        className="group flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                {isPhoto ? <ImagePlus size={16} /> : <FileText size={16} />}
                              </span>
                              <span className="min-w-0 break-words leading-6">{documentName}</span>
                            </span>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {helperText}
                            </p>
                          </div>

                          <span
                            className={`inline-flex shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                              isUploaded
                                ? "bg-emerald-50 text-emerald-700"
                                : isCasteCertificate && !requiresCasteCertificate
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {isUploaded
                              ? "Uploaded"
                              : isCasteCertificate && !requiresCasteCertificate
                                ? "Optional"
                                : "Required"}
                          </span>
                        </div>

                        <div className="mt-4 flex h-full flex-col gap-4">
                          <input
                            type="file"
                            accept={isPhoto ? "image/*" : ".pdf,.jpg,.jpeg,.png"}
                            onChange={(event) => handleDocumentFileChange(documentName, event)}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition focus-within:border-blue-300 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700"
                            required={isPhoto || (isCasteRequired && !isCasteCertificate)}
                          />

                          {isPhoto ? (
                            photoPreview ? (
                              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                                <img
                                  src={photoPreview}
                                  alt="Admission preview"
                                  className="h-52 w-full object-cover shadow-sm"
                                />
                              </div>
                            ) : (
                              <div className="flex h-52 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">
                                <ImagePlus size={26} className="mb-3 text-slate-400" />
                                Candidate photo preview will appear here.
                              </div>
                            )
                          ) : (
                            <div className="flex min-h-52 flex-1 flex-col justify-between rounded-[24px] border border-dashed border-slate-300 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-4">
                              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Upload size={16} className="text-blue-700" />
                                Document Status
                              </div>

                              <div className="my-4 flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm text-slate-500">
                                <span className="break-words">
                                  {file
                                  ? file.name
                                  : isCasteCertificate && !requiresCasteCertificate
                                    ? "Optional for General category."
                                    : `Upload ${documentName}.`}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                                <span>{DOCUMENT_ACCEPT_HINT}</span>
                                <span>{file ? "1 file selected" : "No file selected"}</span>
                              </div>
                            </div>
                          )}

                          {isPhoto && (
                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                              <span>{PHOTO_ACCEPT_HINT}</span>
                              <span>{photoFile ? "Photo selected" : "No photo selected"}</span>
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    to="/student-admission"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Back to Courses
                  </Link>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1d4ed8_0%,#0f172a_100%)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Submitting..." : "Submit Admission"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StudentAdmissionFormPage;
