import { jsPDF } from "jspdf";

const INSTITUTIONS = {
  college: {
    name: "Sabarmati College of Nursing",
    letterheadUrl: "/college-letter-head.jpg",
    email: "sabarmaticollegeofnursing@gmail.com",
    fallbackLine: "Mahanadi Vihar, Cuttack - 753004",
  },
  school: {
    name: "Sabarmati School of Nursing",
    letterheadUrl: "/school-letter-head.jpg",
    email: "sabarmatischoolofnursing@gmail.com",
    fallbackLine: "Mahanadi Vihar, Cuttack - 753004",
  },
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function getStudentName(student) {
  return student?.studentName || student?.fullName || "Student";
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replaceAll(".", "").replace(/\s+/g, " ").trim();
}

function normalizeCourseText(student) {
  return normalizeText(
    [
      student?.course,
      student?.courseName,
      student?.courseId,
      student?.preferredCourse,
      student?.feeStructureKey,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getInstitutionProfile(student) {
  const explicitInstitution = normalizeText(
    [
      student?.institution,
      student?.institutionName,
      student?.institutionId,
      student?.collegeOrSchool,
      student?.department,
    ]
      .filter(Boolean)
      .join(" ")
  );
  const course = normalizeCourseText(student);
  const isSchool =
    explicitInstitution.includes("school") ||
    explicitInstitution.includes("sabarmati school") ||
    course === "anm" ||
    course === "gnm" ||
    course.includes(" anm") ||
    course.includes(" gnm") ||
    course.includes("auxiliary nursing") ||
    course.includes("general nursing");

  return isSchool ? INSTITUTIONS.school : INSTITUTIONS.college;
}

function formatPlainAmount(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateOnly(value = new Date()) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatAcademicCycle(value) {
  const date = value ? new Date(value) : new Date();
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  const month = Number.isNaN(date.getTime()) ? new Date().getMonth() : date.getMonth();
  const startYear = month >= 5 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function getAdmissionBatch(student) {
  return (
    student?.admissionBatch ||
    student?.batch ||
    student?.admissionYear ||
    student?.academicYear ||
    student?.year ||
    formatAcademicCycle(student?.admissionDate || student?.createdAt)
  );
}

function getRollNumber(student) {
  return (
    student?.rollNumber ||
    student?.rollNo ||
    student?.studentRollNo ||
    student?.tenthRollNumber ||
    "Not available"
  );
}

function getAdmissionNumber(student) {
  return (
    student?.admissionNumber ||
    student?.applicationId ||
    student?.registrationNo ||
    student?.bookingId ||
    "Not available"
  );
}

function formatOrdinalYearLabel(value) {
  const yearNumber = Number.parseInt(String(value || "").replace(/[^\d]/g, ""), 10);

  if (!Number.isFinite(yearNumber) || yearNumber <= 0 || yearNumber > 8) {
    return "Current Year";
  }

  const suffixMap = {
    1: "1st Year",
    2: "2nd Year",
    3: "3rd Year",
    4: "4th Year",
  };

  return suffixMap[yearNumber] || `${yearNumber}th Year`;
}

function getCurrentStudyYear(student) {
  return formatOrdinalYearLabel(
    student?.currentStudyYear ||
      student?.studyYear ||
      student?.yearOfStudy ||
      student?.currentYear ||
      student?.year
  );
}

function formatStudyCertificateYear(student) {
  const rawYear =
    student?.currentStudyYear ||
    student?.studyYear ||
    student?.yearOfStudy ||
    student?.currentYear ||
    student?.year;
  const yearNumber = Number.parseInt(String(rawYear || "").replace(/[^\d]/g, ""), 10);
  const yearLabel = Number.isFinite(yearNumber)
    ? `${yearNumber}${yearNumber === 1 ? "ST" : yearNumber === 2 ? "ND" : yearNumber === 3 ? "RD" : "TH"} Year`
    : getCurrentStudyYear(student);
  const batch = getAdmissionBatch(student);

  return batch && batch !== "Not available" ? `${yearLabel} (${batch} Batch)` : yearLabel;
}

function getStudentPronoun(student) {
  const gender = normalizeText(student?.gender);
  if (gender.startsWith("m")) return "He";
  return "She";
}

function getCourseDurationYearLabel(student) {
  const courseText = normalizeCourseText(student);
  let durationYears = 4;

  if (courseText.includes("gnm") || courseText.includes("general nursing")) {
    durationYears = 3;
  } else if (
    courseText.includes("post basic") ||
    courseText.includes("pbbsc") ||
    courseText.includes("pb bsc") ||
    courseText.includes("msc") ||
    courseText.includes("m sc") ||
    courseText.includes("anm")
  ) {
    durationYears = 2;
  }

  return `${durationYears} Year`;
}

function getDemandCourseLabel(student) {
  const courseText = normalizeCourseText(student);
  if (courseText.includes("gnm") || courseText.includes("general nursing")) return "GNM. (N)";
  if (courseText.includes("anm")) return "ANM. (N)";
  return String(student?.course || student?.courseName || "Course").toUpperCase();
}

function getDemandStudyYearPrefix(student) {
  const rawYear =
    student?.currentStudyYear ||
    student?.studyYear ||
    student?.yearOfStudy ||
    student?.currentYear ||
    "1";
  const yearNumber = Number.parseInt(String(rawYear || "").replace(/[^\d]/g, ""), 10);
  const validYear = Number.isFinite(yearNumber) && yearNumber > 0 ? yearNumber : 1;
  const suffix = validYear === 1 ? "st" : validYear === 2 ? "nd" : validYear === 3 ? "rd" : "th";
  return `${validYear}${suffix} yr`;
}

function getDemandDepositYearPrefix(student) {
  const studyYear = getDemandStudyYearPrefix(student);
  return studyYear.replace(/^(\d+)(st|nd|rd|th)/i, (_, year, suffix) => `${year}${suffix.toUpperCase()}`);
}

function getDemandAcademicYear(student) {
  const batch = String(getAdmissionBatch(student) || "");
  const match = batch.match(/\b(20\d{2})\s*-\s*(\d{2,4})\b/);
  if (!match) return student?.academicYear || student?.year || formatAcademicCycle();
  return `${match[1]}-${match[2].slice(-2)}`;
}

function inferCourseCompletionCycle(student) {
  const admissionBatch = String(getAdmissionBatch(student) || "");
  const batchStartMatch = admissionBatch.match(/\b(20\d{2})\b/);
  const admissionDate = student?.admissionDate ? new Date(student.admissionDate) : null;

  const courseText = normalizeCourseText(student);
  let durationYears = 4;

  if (
    courseText.includes("gnm") ||
    courseText.includes("general nursing")
  ) {
    durationYears = 3;
  } else if (
    courseText.includes("post basic") ||
    courseText.includes("pbbsc") ||
    courseText.includes("pb bsc") ||
    courseText.includes("msc") ||
    courseText.includes("m sc") ||
    courseText.includes("anm")
  ) {
    durationYears = 2;
  }

  const admissionStartYear =
    batchStartMatch?.[1] ||
    (!admissionDate || Number.isNaN(admissionDate.getTime()) ? null : admissionDate.getFullYear());

  if (!admissionStartYear) {
    return formatAcademicCycle();
  }

  const completionStartYear = Number(admissionStartYear) + durationYears - 1;
  return `${completionStartYear}-${completionStartYear + 1}`;
}

function getFeeRows(student) {
  const rows = [
    ...(Array.isArray(student?.feeStructure) ? student.feeStructure : []),
    ...(Array.isArray(student?.extraCharges) ? student.extraCharges : []),
  ];
  return rows
    .filter((item) => Number(item?.amount || 0) > 0)
    .map((item) => ({
      title: item.title || item.name || item.category || "Fee Head",
      amount: Number(item.amount || 0),
    }));
}

async function addInstitutionLetterhead(doc, profile) {
  try {
    const letterhead = await loadImage(profile.letterheadUrl);
    doc.addImage(letterhead, "JPEG", 0, 0, 210, 297);
  } catch {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(44, 39, 125);
    doc.text(profile.name.toUpperCase(), 105, 22, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text(profile.fallbackLine, 105, 31, { align: "center" });
    doc.line(12, 45, 198, 45);
  }
}

function addPrincipalSignature(doc, x = 170, y = 232) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text("Signature of the Principal", x, y, { align: "center" });
}

function addKeyValueRows(doc, rows, startY, labelX = 25, valueX = 82) {
  let y = startY;
  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    doc.text(label, labelX, y);
    doc.text(":-", valueX - 8, y);
    doc.setFont("helvetica", "bold");
    const lines = doc.splitTextToSize(String(value || "Not available"), 100);
    doc.text(lines, valueX, y);
    y += Math.max(lines.length * 6.5, 9);
  });
  return y;
}

function addFeeBreakup(doc, student, startY) {
  const feeRows = getFeeRows(student);
  const totalFee = Number(student?.totalFee || 0);
  const paidAmount = Number(student?.paidAmount || 0);
  const discount = Number(student?.totalDiscount || 0);
  const scholarship = Number(student?.scholarshipAmount || 0);
  const fine = Number(student?.totalFine || 0);
  const pendingAmount = Number(student?.pendingAmount || student?.outstandingAmount || 0);
  let y = startY;
  const tableX = 17;
  const tableWidth = 180;
  const labelX = 22;
  const amountX = 193;

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(tableX, y, tableWidth, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("Fee Head", labelX, y + 5.5);
  doc.text("Amount", amountX, y + 5.5, { align: "right" });
  y += 8;

  const defaultRows = [
    { title: "Course Fee", amount: Number(student?.courseFee || student?.tuitionFee || 50000) },
    { title: "Library Fee", amount: Number(student?.libraryFee || 10000) },
    { title: "Practical Fee", amount: Number(student?.practicalFee || 10000) },
    { title: "Travel Charges", amount: Number(student?.transportFee || student?.travelFee || 10000) },
    { title: "Admission Fee", amount: Number(student?.admissionFee || Math.max(totalFee - 80000, 0)) },
  ].filter((item) => item.amount > 0);
  const displayRows = feeRows.length ? feeRows : defaultRows;
  displayRows.slice(0, 7).forEach((item) => {
    doc.rect(tableX, y, tableWidth, 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(String(item.title), labelX, y + 5);
    doc.text(formatPlainAmount(item.amount), amountX, y + 5, { align: "right" });
    y += 7;
  });

  [
    ["Scholarship", scholarship],
    ["Discount", discount],
    ["Fine", fine],
    ["Total Fee", totalFee],
    ["Pay Amount", paidAmount],
    ["Due Amount", pendingAmount],
  ].forEach(([label, amount]) => {
    doc.rect(tableX, y, tableWidth, 7);
    doc.setFont("helvetica", label === "Due Amount" ? "bold" : "normal");
    doc.setFontSize(10);
    doc.text(label, labelX, y + 5);
    doc.text(formatPlainAmount(amount), amountX, y + 5, { align: "right" });
    y += 7;
  });

  return y;
}

function addBonafideContent(doc, student) {
  const studentName = getStudentName(student);
  const course = student?.course || "Not available";
  const fatherName =
    student?.fatherName ||
    student?.father ||
    student?.guardianName ||
    student?.parentName ||
    "Not available";
  const motherName = student?.motherName || student?.mother || "Not available";
  const selectionProcedure =
    student?.selectionProcedure ||
    student?.admissionSelectionProcedure ||
    student?.selectionBasis ||
    "On The Basis Of Marks";

  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(18);
  doc.text("STUDY/BONAFIDE CERTIFICATE", 105, 75, { align: "center" });
  doc.setLineWidth(0.5);
  doc.line(55, 78, 155, 78);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12.5);
  const introLines = doc.splitTextToSize(
    "This is to certify that the following details pertaining to the student of this Institution is/are true.",
    165
  );
  doc.text(introLines, 25, 101);

  const rowsEndY = addKeyValueRows(
    doc,
    [
      ["Name of the Student", studentName],
      ["Father. Name", fatherName],
      ["Mother name", motherName],
      ["Studying in Course", course],
      ["Year of Course", getCourseDurationYearLabel(student)],
      ["Year of Study", formatStudyCertificateYear(student)],
      ["Selection procedure", selectionProcedure],
    ],
    124
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12.5);
  doc.text(`${getStudentPronoun(student)} is a obedient student in our college .`, 25, rowsEndY + 8);

  addPrincipalSignature(doc, 51, 250);
}

function addDemandContent(doc, student, profile) {
  const studentName = getStudentName(student);
  const courseLabel = getDemandCourseLabel(student);
  const academicYear = getDemandAcademicYear(student);
  const studyYearPrefix = getDemandStudyYearPrefix(student);
  const depositYearPrefix = getDemandDepositYearPrefix(student);
  const courseFee = Number(student?.courseFee || student?.tuitionFee || student?.totalFee || 0);
  const paidAmount = Number(student?.paidAmount || student?.totalPaid || 0);
  const dueAmount = Number(student?.pendingAmount || student?.outstandingAmount || Math.max(courseFee - paidAmount, 0));
  const beneficiaryName = profile.name.replace(/\sof\s/g, " Of ");

  // Place the demand-letter content below the institution letterhead.
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Demanding letter", 105, 76, { align: "center" });
  doc.setLineWidth(0.5);
  doc.line(76, 79, 134, 79);

  doc.setFontSize(14.5);
  doc.text(`NAME:- ${studentName}`, 105, 94, { align: "center" });
  doc.text(`${courseLabel}  (${academicYear}) BATCH`, 105, 110, { align: "center" });
  doc.text(`FEES STRUCTURE OF ${courseLabel} :${academicYear}`, 105, 126, { align: "center" });

  doc.setFontSize(13.5);
  const feeLines = doc.splitTextToSize(
    `${studyYearPrefix} course fees ${formatPlainAmount(courseFee)} ${getStudentPronoun(student)} paid ${formatPlainAmount(
      paidAmount
    )} and due ${formatPlainAmount(dueAmount)}`,
    160
  );
  doc.text(feeLines, 25, 146);

  const depositLines = doc.splitTextToSize(
    `You can be directly deposited ${depositYearPrefix} course fees on bank account.`,
    160
  );
  doc.text(depositLines, 25, 168);

  doc.text("Bank Detail :-", 25, 190);

  let bankY = 205;
  const bankRows = [
    ["Beneficiary Name", beneficiaryName],
    ["Account Number", "511020110000355"],
    ["IFSC Code", "BKID0005110"],
    ["Branch", "Mahanadivihar"],
    ["Bank", "Bank Of India"],
  ];
  bankRows.forEach(([label, value]) => {
    doc.text(label, 25, bankY);
    doc.text(":-", 88, bankY);
    doc.text(value, 96, bankY);
    bankY += 13;
  });

  doc.setFontSize(13.5);
  doc.text("Signature of Principal", 25, 273);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Gmail:- ${profile.email}`, 25, 285);
}

async function addLetterPage(doc, student, type, isFirstPage) {
  if (!isFirstPage) doc.addPage();
  const profile = getInstitutionProfile(student);
  await addInstitutionLetterhead(doc, profile);

  if (type === "bonafide") {
    addBonafideContent(doc, student);
    return;
  }

  addDemandContent(doc, student, profile);
}

function getSafeId(student) {
  return String(student?.registrationNo || student?.admissionNumber || "student")
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export async function downloadStudentLetterPdf({ student, type }) {
  const doc = new jsPDF();
  await addLetterPage(doc, student, type, true);
  const prefix = type === "bonafide" ? "bonafide-certificate" : "demand-letter";
  doc.save(`${prefix}-${getSafeId(student)}.pdf`);
}

export async function printStudentLetterPdf({ student, type, printWindow = null }) {
  const doc = new jsPDF();
  await addLetterPage(doc, student, type, true);
  doc.autoPrint();
  const letterUrl = doc.output("bloburl");
  const targetWindow = printWindow || window.open("", "_blank");
  if (!targetWindow) return;
  targetWindow.addEventListener("load", () => { targetWindow.focus(); targetWindow.print(); }, { once: true });
  targetWindow.location.href = letterUrl;
}

export async function downloadStudentLettersPdf({ students, type, filename }) {
  const letterStudents = Array.isArray(students) ? students.filter(Boolean) : [];
  if (!letterStudents.length) return;

  const doc = new jsPDF();
  for (let index = 0; index < letterStudents.length; index += 1) {
    await addLetterPage(doc, letterStudents[index], type, index === 0);
  }

  const prefix = type === "bonafide" ? "bonafide-certificates" : "demand-letters";
  doc.save(filename || `${prefix}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
