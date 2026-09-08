import { jsPDF } from "jspdf";

function normalizeText(value) {
  return String(value || "").toLowerCase().replaceAll(".", "").replace(/\s+/g, " ").trim();
}

export function getReceiptInstitutionProfile(student = {}) {
  const institution = normalizeText(student.institution || student.institutionName);
  const course = normalizeText(student.course);
  const isSchoolCourse =
    course.startsWith("anm") ||
    course.startsWith("gnm") ||
    course.includes("auxiliary nursing") ||
    course.includes("general nursing");
  const isSchool = course ? isSchoolCourse : institution.includes("school");

  return {
    name: isSchool ? "Sabarmati School of Nursing" : "Sabarmati College of Nursing",
    prefix: isSchool ? "SSN" : "SCN",
    typeLabel: isSchool ? "School Fee Receipt" : "College Fee Receipt",
    affiliation: isSchool
      ? "Recognized by Indian Nursing Council & Odisha Nurses Registration Council"
      : "Recognized by Odisha Nurses Registration Council &",
    affiliationSecondLine: isSchool
      ? "Affiliated to Odisha Nurses and Midwives Examination Board"
      : "Affiliated to Odisha University of Health Sciences, Bhubaneswar",
    logoPath: isSchool ? "/school-receipt-logo.png" : "/college-receipt-logo.png",
    logoBox: isSchool
      ? { x: 15, y: 9, width: 43, height: 43 }
      : { x: 13, y: 9, width: 48, height: 38 },
    email: "Sabarmaticollegeofnursing@gmail.com",
    phone: "9437184334 / 9337232175",
    address: "Mahanadi Vihar, Cuttack, Odisha - 753004",
  };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function formatDateOnly(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatReceiptAmount(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function convertHundredsToWords(value) {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const parts = [];

  if (value >= 100) {
    parts.push(`${ones[Math.floor(value / 100)]} Hundred`);
    value %= 100;
  }

  if (value >= 20) {
    parts.push(tens[Math.floor(value / 10)]);
    value %= 10;
  }

  if (value > 0) {
    parts.push(ones[value]);
  }

  return parts.join(" ");
}

function amountToWords(value) {
  const amount = Math.floor(Number(value || 0));
  if (!amount) return "Zero";

  const units = [
    { label: "Crore", value: 10000000 },
    { label: "Lakh", value: 100000 },
    { label: "Thousand", value: 1000 },
    { label: "", value: 1 },
  ];
  const parts = [];
  let remaining = amount;

  units.forEach((unit) => {
    const count = Math.floor(remaining / unit.value);
    if (count) {
      parts.push(`${convertHundredsToWords(count)}${unit.label ? ` ${unit.label}` : ""}`);
      remaining %= unit.value;
    }
  });

  return parts.join(" ");
}

function getStudentName(student = {}) {
  return student.studentName || student.fullName || "Student";
}

function getStudentAcademicYear(student = {}) {
  return student.admissionBatch || student.academicYear || student.year || "Not available";
}

function getStudyYearLabel(value) {
  const labels = ["First Year", "Second Year", "Third Year", "Fourth Year"];
  const index = Number(value || 0) - 1;
  return labels[index] || "";
}

async function createMoneyReceiptSheet({ payment = {}, student = {} }) {
  const profile = getReceiptInstitutionProfile(student);
  // A receipt is always generated as one portrait A4 PDF page.  Keeping the
  // receipt in a single PDF page also prevents the printer from treating two
  // receipt copies as one print job.
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const navy = [6, 38, 95];
  const lightBorder = [170, 184, 204];
  const amount = formatReceiptAmount(payment.amount);
  const amountWords = amountToWords(payment.amount);
  const paymentDate = payment.paymentDate || payment.createdAt || new Date();
  const receiptNumber = payment.receiptNumber || `${profile.prefix}-FEE-RECEIPT`;
  const course = student.course || "Not available";
  const registrationNo = student.registrationNo || student.admissionNumber || "Not available";
  const receiptPurpose = payment.purpose || `${profile.typeLabel} - Tuition / Academic Fees`;
  const particular = payment.particular || receiptPurpose;
  const footerNote = payment.footerNote;

  let logo = null;
  try {
    logo = await loadImage(profile.logoPath);
  } catch {
    logo = null;
  }

  const drawReceipt = () => {
    // The receipt design is 297 x 210 mm.  Scale it down uniformly to keep it
    // readable and completely inside a portrait A4 page.
    const scale = 0.64;
    const offsetX = 10;
    const offsetY = 10;
    const x = (value) => offsetX + value * scale;
    const y = (value) => offsetY + value * scale;
    const length = (value) => value * scale;
    const rect = (left, upper, width, height, style) => doc.rect(x(left), y(upper), length(width), length(height), style);
    const line = (x1, y1, x2, y2) => doc.line(x(x1), y(y1), x(x2), y(y2));
    const roundedRect = (left, upper, width, height, radius, style) => doc.roundedRect(x(left), y(upper), length(width), length(height), length(radius), length(radius), style);
    const text = (value, left, upper, options) => doc.text(value, x(left), y(upper), options);
    const size = (value) => doc.setFontSize(length(value));

    doc.setFillColor(...navy); rect(0, 0, 297, 5, "F"); rect(0, 195, 297, 15, "F");
    doc.setDrawColor(...navy); doc.setLineWidth(length(0.7)); rect(4, 4, 289, 202);
    doc.setDrawColor(...lightBorder); doc.setLineWidth(length(0.2)); doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); size(25); text(profile.name.toUpperCase(), 145, 19, { align: "center" });
    size(11); doc.setFont("helvetica", "normal"); text(profile.affiliation, 145, 29, { align: "center" }); text(profile.affiliationSecondLine, 145, 36, { align: "center" }); size(10); text(profile.address, 145, 47, { align: "center" }); text(`${profile.phone}   |   ${profile.email}`, 145, 56, { align: "center" });
    doc.setDrawColor(...navy); doc.setLineWidth(length(0.6));
    if (logo) doc.addImage(logo, "PNG", x(profile.logoBox.x), y(profile.logoBox.y), length(profile.logoBox.width), length(profile.logoBox.height));
    else { doc.circle(x(37), y(30), length(17)); doc.setFont("helvetica", "bold"); size(11); text(profile.prefix, 37, 32, { align: "center" }); }
    doc.setFont("helvetica", "bold"); size(6); text(profile.name.toUpperCase(), 37, 54, { align: "center", maxWidth: length(58) });
    doc.setFillColor(...navy); roundedRect(228, 11, 58, 22, 2, "F"); doc.setTextColor(255, 255, 255); size(16); text("MONEY RECEIPT", 257, 22, { align: "center" }); size(9); text(`(${payment.method || "Payment"})`, 257, 29, { align: "center" });
    doc.setTextColor(20, 31, 48); doc.setFont("helvetica", "normal"); size(9);
    [["Receipt No.", receiptNumber], ["Receipt Date", formatDateOnly(paymentDate)], ["Payment Ref. No.", payment.transactionId || payment.gatewayPaymentId || "-"], ["Transaction Date", formatDateTime(paymentDate)]].forEach(([label, value], index) => { const row = 45 + index * 11; text(label, 226, row); text(":", 252, row); size(7.2); text(doc.splitTextToSize(String(value), length(29)), 257, row); size(9); }); line(221, 38, 221, 82);
    doc.setFillColor(...navy); roundedRect(103, 64, 76, 9, 1, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); size(12); text("RECEIVED WITH THANKS", 141, 70, { align: "center" });
    doc.setTextColor(20, 31, 48); size(10); const studyYear = getStudyYearLabel(student.currentStudyYear);
    [["Received From", getStudentName(student)], ["Application / Roll No.", registrationNo], ["Institution", profile.name], ["Course", course], ["Year", getStudentAcademicYear(student)], ["Purpose", studyYear ? `${receiptPurpose} (${studyYear})` : receiptPurpose]].forEach(([label, value], index) => { const row = 83 + index * 8; doc.setFont("helvetica", "bold"); text(label, 15, row); text(":", 66, row); doc.setFont("helvetica", index === 0 || index === 3 ? "bold" : "normal"); text(doc.splitTextToSize(String(value || "-"), length(122)), 74, row); doc.setDrawColor(...lightBorder); line(14, row + 3, 199, row + 3); });
    doc.setFillColor(...navy); rect(14, 135, 269, 8, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); size(10); text("PARTICULARS", 18, 141); text("AMOUNT (Rs.)", 238, 141, { align: "center" });
    doc.setTextColor(20, 31, 48); doc.setDrawColor(...lightBorder); rect(14, 135, 269, 31); line(193, 135, 193, 158); line(14, 151, 283, 151); line(14, 158, 283, 158); doc.setFont("helvetica", "normal"); text(doc.splitTextToSize(particular, x(168)), 18, 149); text(amount, 238, 149, { align: "center" }); doc.setFont("helvetica", "bold"); text("Total Amount", 18, 156); text(`Rs. ${amount}`, 238, 156, { align: "center" }); text(`(Rupees ${amountWords} Only)`, 18, 164);
    roundedRect(14, 170, 91, 22, 2); doc.setFillColor(...navy); roundedRect(18, 173, 45, 7, 1, "F"); doc.setTextColor(255, 255, 255); text("PAYMENT DETAILS", 40.5, 178, { align: "center" }); doc.setTextColor(20, 31, 48); doc.setFont("helvetica", "normal"); size(8.5); text(`Payment Mode : ${payment.method || "-"}`, 18, 185); text(`Payment Status : ${payment.status || "Confirmed"}`, 18, 190); text(`Transaction ID : ${payment.transactionId || payment.gatewayPaymentId || "-"}`, 62, 190);
    roundedRect(119, 170, 59, 22, 2); doc.setFont("helvetica", "bold"); doc.setTextColor(...navy); text("SCAN TO VERIFY", 148.5, 177, { align: "center" }); size(18); text("QR", 148.5, 187, { align: "center" }); size(7); doc.setFont("helvetica", "normal"); text("(Verification code on official copy)", 148.5, 191, { align: "center" });
    roundedRect(194, 170, 89, 22, 2); doc.setFillColor(...navy); roundedRect(212, 173, 53, 7, 1, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); size(9); text("AUTHORIZED SIGNATURE", 238.5, 178, { align: "center" }); doc.setTextColor(20, 31, 48); doc.setFont("helvetica", "italic"); size(16); text("Authorized", 238.5, 187, { align: "center" }); doc.setFont("helvetica", "normal"); size(7.5); text(`Authorized Signatory, ${profile.name}`, 238.5, 191, { align: "center" });
    doc.setTextColor(255, 255, 255); size(8.5); text("Note: This is a computer generated receipt and does not require any physical signature.", 14, 203); if (footerNote) text(`Note: ${footerNote}`, 14, 208); text(`For any queries, please contact us at ${profile.phone} or ${profile.email}`, 173, 203);
  };

  drawReceipt();
  return { doc, receiptNumber };
}

export async function downloadMoneyReceiptPdf({ payment = {}, student = {} }) {
  const { doc, receiptNumber } = await createMoneyReceiptSheet({ payment, student });
  doc.save(payment.filename || `${receiptNumber}.pdf`);
}

export async function printMoneyReceipt({ payment = {}, student = {}, printWindow = null }) {
  // Open the window while this click handler is still active. The completed PDF
  // is loaded afterwards, so its load event is the only event that prints.
  const targetWindow = printWindow || window.open("", "_blank");
  if (!targetWindow) return;

  const { doc } = await createMoneyReceiptSheet({ payment, student });
  const receiptUrl = doc.output("bloburl");
  targetWindow.addEventListener(
    "load",
    () => {
      targetWindow.focus();
      targetWindow.print();
    },
    { once: true }
  );
  targetWindow.location.replace(receiptUrl);
}

export async function downloadFineReceiptPdf({ fine = {} }) {
  const institution = fine.institution || fine.institutionName || "";
  const student = {
    studentName: fine.studentName,
    registrationNo: fine.studentId,
    admissionNumber: fine.studentId,
    institution,
    institutionName: institution,
    course: fine.course,
    academicYear: fine.academicYear || fine.fineDate?.slice(0, 4) || "Not available",
  };
  const profile = getReceiptInstitutionProfile(student);
  const amount = Number(fine.paidAmount || (fine.paymentStatus === "Paid" ? fine.fineAmount || 0 : 0));
  const receiptKind = profile.name.includes("School") ? "School Fine Receipt" : "College Fine Receipt";
  const payment = {
    amount,
    method: fine.paymentMethod || "Cash",
    status: fine.paymentStatus === "Unpaid" ? "Pending" : "Confirmed",
    receiptNumber: fine.receiptNumber || `${profile.prefix}-FINE-RECEIPT`,
    paymentDate: fine.paidDate || fine.updatedAt || fine.createdAt || new Date(),
    transactionId: fine.transactionId || fine.paymentReference || "-",
    purpose: `${receiptKind} - ${fine.fineType || "Fine Collection"}`,
    particular: `${receiptKind} - Student Fine Collection`,
    filename: `${fine.receiptNumber || profile.prefix + "-fine-receipt"}.pdf`,
  };

  await downloadMoneyReceiptPdf({ payment, student });
}

export async function printFineReceipt({ fine = {}, printWindow = null }) {
  const institution = fine.institution || fine.institutionName || "";
  const student = {
    studentName: fine.studentName,
    registrationNo: fine.studentId,
    admissionNumber: fine.studentId,
    institution,
    institutionName: institution,
    course: fine.course,
    academicYear: fine.academicYear || fine.fineDate?.slice(0, 4) || "Not available",
  };
  const profile = getReceiptInstitutionProfile(student);
  const amount = Number(fine.paidAmount || (fine.paymentStatus === "Paid" ? fine.fineAmount || 0 : 0));
  const receiptKind = profile.name.includes("School") ? "School Fine Receipt" : "College Fine Receipt";

  await printMoneyReceipt({
    student,
    printWindow,
    payment: {
      amount,
      method: fine.paymentMethod || "Cash",
      status: fine.paymentStatus === "Unpaid" ? "Pending" : "Confirmed",
      receiptNumber: fine.receiptNumber || `${profile.prefix}-FINE-RECEIPT`,
      paymentDate: fine.paidDate || fine.updatedAt || fine.createdAt || new Date(),
      transactionId: fine.transactionId || fine.paymentReference || "-",
      purpose: `${receiptKind} - ${fine.fineType || "Fine Collection"}`,
      particular: `${receiptKind} - Student Fine Collection`,
    },
  });
}
