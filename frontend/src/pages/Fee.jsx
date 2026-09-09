import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { jsPDF } from "jspdf";
import {
  AlertCircle,
  BadgeIndianRupee,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  GraduationCap,
  IndianRupee,
  Landmark,
  LayoutDashboard,
  Percent,
  Pencil,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCcw,
  ScrollText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { apiRequest } from "../config/api";
import { getStoredUser } from "../utils/auth";
import { downloadStudentLettersPdf, printStudentLetterPdf } from "../utils/pdfLetters";
import { normalizeRole } from "../utils/permissions";
import { printMoneyReceipt } from "../utils/receiptPdf";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const initialCapabilities = {
  feeDashboard: true,
  manualPayment: true,
  razorpay: true,
  feeSummary: true,
  feeReports: true,
  feeConfig: true,
  feeRefunds: true,
};

const paymentModes = [
  "Cash",
  "Bank",
  "UPI",
  "Cheque",
  "QR Payment",
  "Razorpay Checkout",
  "API Verification",
];

const ALL_FEE_YEARS = "All Years";
const ALL_FEE_COURSES = "All Courses";

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

const DEFAULT_ADMISSION_BATCHES = [
  "2021-2025",
  "2022-2026",
  "2023-2027",
  "2024-2028",
  "2025-2029",
  "2026-2030",
  "2026-2029",
  "2026-2028",
];

const STUDY_YEAR_LABELS = ["First Year", "Second Year", "Third Year", "Fourth Year"];

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateTimeInput(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function getAcademicYearFromDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 5 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function normalizeAcademicYearLabel(value) {
  const normalized = String(value || "").trim();
  const match = normalized.match(/^(\d{4})\s*-\s*(\d{2}|\d{4})$/);
  if (!match) {
    return "";
  }
  const startYear = Number(match[1]);
  const endYear =
    match[2].length === 2
      ? Number(`${String(startYear).slice(0, 2)}${match[2]}`)
      : Number(match[2]);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear !== startYear + 1) {
    return "";
  }
  return `${startYear}-${endYear}`;
}

function getStudentAcademicYear(student) {
  return (
    normalizeAcademicYearLabel(student?.year) ||
    getAcademicYearFromDate(student?.admissionDate) ||
    getAcademicYearFromDate(student?.createdAt)
  );
}

function getStudentStudyYear(student) {
  const value =
    student?.currentStudyYear ||
    student?.studyYear ||
    student?.yearOfStudy ||
    student?.currentYear;
  const year = Number(value);
  return Number.isInteger(year) && year > 0 ? year : 1;
}

function buildUpiPaymentLink({
  upiId,
  payeeName,
  amount,
  transactionNote,
  transactionRef,
}) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount,
    cu: "INR",
    tn: transactionNote,
  });
  if (transactionRef) {
    params.set("tr", transactionRef);
  }
  return `upi://pay?${params.toString()}`;
}

function loadRazorpayCheckout() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load Razorpay checkout.")),
        { once: true }
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () =>
      reject(new Error("Unable to load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

function isMissingRouteError(message) {
  return typeof message === "string" && message.includes("Backend route unavailable:");
}

function sanitizeCharge(item, fallback = {}) {
  return {
    chargeId: item?.chargeId || fallback.chargeId || `CHG-${Date.now()}`,
    title: item?.title || fallback.title || "Charge",
    category: item?.category || fallback.category || "Miscellaneous",
    scope: item?.scope || fallback.scope || "Additional",
    amount: Number(item?.amount || 0),
    dueDate: item?.dueDate || fallback.dueDate || "",
    status: item?.status || fallback.status || "Pending",
    note: item?.note || fallback.note || "",
  };
}

function sanitizeDiscount(item) {
  return {
    discountId: item?.discountId || `DISC-${Date.now()}`,
    title: item?.title || "Discount",
    scope: item?.scope || "Student",
    mode: item?.mode || "Flat",
    value: Number(item?.value || 0),
    amount: Number(item?.amount || 0),
    reason: item?.reason || "",
    appliedAt: item?.appliedAt || new Date().toISOString(),
  };
}

function sanitizeStudent(student) {
  if (!student) {
    return null;
  }
  const paymentHistory = Array.isArray(student.paymentHistory)
    ? student.paymentHistory
    : [];
  const refunds = Array.isArray(student.refunds) ? student.refunds : [];
  const feeStructure = Array.isArray(student.feeStructure)
    ? student.feeStructure.map((item) =>
        sanitizeCharge(item, { scope: "Structure", category: "Tuition" })
      )
    : [];
  const extraCharges = Array.isArray(student.extraCharges)
    ? student.extraCharges.map((item) =>
        sanitizeCharge(item, { scope: "Additional", category: "Additional" })
      )
    : [];
  const discounts = Array.isArray(student.discounts)
    ? student.discounts.map(sanitizeDiscount)
    : [];
  const discountTotal =
    student.totalDiscount != null
      ? Number(student.totalDiscount)
      : discounts.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const extraTotal =
    student.totalExtraCharges != null
      ? Number(student.totalExtraCharges)
      : extraCharges.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const fineTotal = Number(student.totalFine || 0);
  const paidAmount =
    student.paidAmount != null
      ? Number(student.paidAmount)
      : paymentHistory.reduce((sum, item) => sum + Number(item.amount || 0), 0) -
        refunds.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalFee =
    student.totalFee != null
      ? Number(student.totalFee)
      : Math.max(Number(student.baseFee || 0) + extraTotal + fineTotal - discountTotal, 0);
  const pendingAmount =
    student.pendingAmount != null
      ? Number(student.pendingAmount)
      : Math.max(totalFee - paidAmount, 0);

  return {
    ...student,
    feePlan: student.feePlan || "Yearly",
    totalFee,
    paidAmount,
    pendingAmount,
    totalDiscount: discountTotal,
    totalExtraCharges: extraTotal,
    totalFine: fineTotal,
    outstandingAmount: Number(student.outstandingAmount ?? pendingAmount),
    outstandingStatus:
      student.outstandingStatus ||
      (pendingAmount <= 0 ? "Cleared" : "Pending"),
    paymentHistory,
    refunds,
    feeStructure,
    extraCharges,
    discounts,
    ledgerEntries: Array.isArray(student.ledgerEntries) ? student.ledgerEntries : [],
  };
}

function createFallbackSummary(students) {
  const normalizedStudents = students.map(sanitizeStudent);
  const totalStudents = normalizedStudents.length;
  const totalFeeCollection = normalizedStudents.reduce(
    (sum, item) => sum + item.paidAmount,
    0
  );
  const totalDueAmount = normalizedStudents.reduce(
    (sum, item) => sum + item.pendingAmount,
    0
  );
  const overdueStudents = normalizedStudents.filter(
    (item) => item.outstandingStatus === "Overdue"
  ).length;

  return {
    totalStudents,
    totalFeeCollection,
    totalDueAmount,
    totalOutstanding: totalDueAmount,
    totalRefunds: normalizedStudents.reduce(
      (sum, item) =>
        sum +
        item.refunds.reduce((refundSum, refund) => refundSum + Number(refund.amount || 0), 0),
      0
    ),
    totalFines: normalizedStudents.reduce((sum, item) => sum + item.totalFine, 0),
    overdueStudents,
    paidStudents: normalizedStudents.filter((item) => item.pendingAmount <= 0).length,
    pendingStudents: normalizedStudents.filter((item) => item.pendingAmount > 0).length,
    monthlyRevenue: [],
    paymentStatusChart: [
      {
        label: "Paid",
        value: normalizedStudents.filter((item) => item.pendingAmount <= 0).length,
      },
      {
        label: "Pending",
        value: normalizedStudents.filter((item) => item.pendingAmount > 0).length,
      },
      { label: "Overdue", value: overdueStudents },
    ],
    outstandingStudents: normalizedStudents
      .filter((item) => item.pendingAmount > 0)
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
      .slice(0, 8)
      .map((item) => ({
        registrationNo: item.registrationNo,
        studentName: item.studentName || item.fullName,
        course: item.course,
        pendingAmount: item.pendingAmount,
        status: item.outstandingStatus,
      })),
  };
}

function createFallbackReports(students) {
  const normalizedStudents = students.map(sanitizeStudent);
  return {
    dailyCollection: normalizedStudents.flatMap((student) =>
      student.paymentHistory.map((payment) => ({
        date: payment.paymentDate,
        receiptNumber: payment.receiptNumber,
        registrationNo: student.registrationNo,
        studentName: student.studentName || student.fullName || "Student",
        method: payment.method,
        amount: payment.amount,
      }))
    ),
    studentLedger: normalizedStudents.map((student) => ({
      registrationNo: student.registrationNo,
      studentName: student.studentName || student.fullName || "Student",
      course: student.course,
      debit: student.totalFee,
      credit: student.paidAmount,
      due: student.pendingAmount,
      refunds: student.refunds.reduce(
        (sum, refund) => sum + Number(refund.amount || 0),
        0
      ),
    })),
    dueReport: normalizedStudents
      .filter((student) => student.pendingAmount > 0)
      .map((student) => ({
        registrationNo: student.registrationNo,
        studentName: student.studentName || student.fullName || "Student",
        course: student.course,
        year: student.year,
        pendingAmount: student.pendingAmount,
        status: student.outstandingStatus,
        nextDueDate: student.nextDueDate,
      })),
    fineReport: normalizedStudents
      .filter((student) => student.totalFine > 0)
      .map((student) => ({
        registrationNo: student.registrationNo,
        studentName: student.studentName || student.fullName || "Student",
        totalFine: student.totalFine,
        status: student.outstandingStatus,
      })),
    refundReport: normalizedStudents.flatMap((student) =>
      student.refunds.map((refund) => ({
        refundNumber: refund.refundNumber,
        registrationNo: student.registrationNo,
        studentName: student.studentName || student.fullName || "Student",
        amount: refund.amount,
        refundDate: refund.refundDate,
        reason: refund.reason,
        status: refund.status,
      }))
    ),
    feeCollectionSummary: normalizedStudents.map((student) => ({
      registrationNo: student.registrationNo,
      studentName: student.studentName || student.fullName || "Student",
      totalFee: student.totalFee,
      paidAmount: student.paidAmount,
      pendingAmount: student.pendingAmount,
    })),
  };
}

function downloadCsv(filename, rows) {
  if (!rows.length) {
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const escaped = String(value).replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeExcelXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createExcelWorksheet(name, rows) {
  const safeRows = Array.isArray(rows) && rows.length ? rows : [{ Info: "No data available" }];
  const headers = Object.keys(safeRows[0]);
  const columnCount = headers.length || 1;
  const sanitizedName = String(name || "Sheet").slice(0, 31);
  const headerRow = `<Row>${headers
    .map(
      (header) =>
        `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeExcelXml(header)}</Data></Cell>`
    )
    .join("")}</Row>`;
  const dataRows = safeRows
    .map((row) => {
      const cells = headers
        .map((header) => {
          const value = row[header];
          const isNumber = typeof value === "number" && Number.isFinite(value);
          return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${
            isNumber ? value : escapeExcelXml(value)
          }</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");
  return `
    <Worksheet ss:Name="${escapeExcelXml(sanitizedName)}">
      <Table ss:ExpandedColumnCount="${columnCount}" ss:DefaultRowHeight="18">
        ${headerRow}
        ${dataRows}
      </Table>
    </Worksheet>
  `;
}

function downloadExcelWorkbook(filename, sheets) {
  if (!Array.isArray(sheets) || !sheets.length) {
    return;
  }
  const workbookXml = `<?xml version="1.0"?>
  <?mso-application progid="Excel.Sheet"?>
  <Workbook
    xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:html="http://www.w3.org/TR/REC-html40">
    <Styles>
      <Style ss:ID="header">
        <Font ss:Bold="1"/>
        <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
      </Style>
    </Styles>
    ${sheets.map((sheet) => createExcelWorksheet(sheet.name, sheet.rows)).join("")}
  </Workbook>`;
  const blob = new Blob([workbookXml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildFeeExcelSheets({ student, summary, reports }) {
  const studentName = student?.studentName || student?.fullName || "Student";
  return [
    {
      name: "Overview",
      rows: [
        {
          "Student Name": studentName,
          "Registration No": student?.registrationNo || "Not available",
          Course: student?.course || "Not available",
          "Fee Plan": student?.feePlan || "Yearly",
          Status: student?.outstandingStatus || "Pending",
          "Total Fee": Number(student?.totalFee || 0),
          "Paid Amount": Number(student?.paidAmount || 0),
          "Pending Amount": Number(student?.pendingAmount || 0),
          "Total Discount": Number(student?.totalDiscount || 0),
          "Extra Charges": Number(student?.totalExtraCharges || 0),
          "Total Fine": Number(student?.totalFine || 0),
          "Next Due Date": formatDate(student?.nextDueDate),
        },
      ],
    },
    {
      name: "Dashboard Summary",
      rows: [
        {
          "Total Students": Number(summary?.totalStudents || 0),
          "Total Collection": Number(summary?.totalFeeCollection || 0),
          "Total Due": Number(summary?.totalDueAmount || 0),
          "Total Outstanding": Number(summary?.totalOutstanding || 0),
          "Total Refunds": Number(summary?.totalRefunds || 0),
          "Total Fines": Number(summary?.totalFines || 0),
          "Paid Students": Number(summary?.paidStudents || 0),
          "Pending Students": Number(summary?.pendingStudents || 0),
          "Overdue Students": Number(summary?.overdueStudents || 0),
        },
      ],
    },
    {
      name: "Payment History",
      rows:
        student?.paymentHistory?.map((payment) => ({
          "Receipt Number": payment.receiptNumber || "",
          Amount: Number(payment.amount || 0),
          Method: payment.method || "",
          "Transaction ID": payment.transactionId || "",
          Status: payment.status || "",
          "Payment Date": formatDate(payment.paymentDate),
          "Confirmed By": payment.confirmedBy || "",
          Note: payment.note || "",
        })) || [],
    },
    {
      name: "Student Ledger",
      rows:
        student?.ledgerEntries?.map((entry) => ({
          Entry: entry.title || "",
          Category: entry.category || "",
          Direction: entry.direction || "",
          Amount: Number(entry.amount || 0),
          "Balance After": Number(entry.balanceAfter || 0),
        })) || [],
    },
    {
      name: "Due Report",
      rows: reports?.dueReport || [],
    },
    {
      name: "Refund Report",
      rows: reports?.refundReport || [],
    },
  ];
}

function downloadRowsPdf(filename, title, rows) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const safeRows = Array.isArray(rows) && rows.length ? rows : [{ Info: "No data available" }];
  const headers = Object.keys(safeRows[0]);
  let y = 58;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 40, 34);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  headers.slice(0, 8).forEach((header, index) => {
    doc.text(String(header).slice(0, 22), 40 + index * 95, y);
  });
  doc.setFont("helvetica", "normal");
  safeRows.slice(0, 28).forEach((row) => {
    y += 22;
    headers.slice(0, 8).forEach((header, index) => {
      doc.text(String(row[header] ?? "").slice(0, 24), 40 + index * 95, y);
    });
  });
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

function printReceipt({ payment, student }) {
  const printWindow = window.open("", "_blank");
  return printMoneyReceipt({ payment, student, printWindow });
}

function printLetter({ student, type }) {
  const printWindow = window.open("", "_blank");
  return printStudentLetterPdf({ student, type, printWindow });
}

function loadPdfImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function getFeeStructureLetterhead(student) {
  const institution = String(
    student?.institution || student?.institutionName || student?.collegeOrSchool || ""
  ).toLowerCase();
  const course = String(student?.course || student?.courseName || "").toLowerCase();
  const isSchoolStudent =
    institution.includes("school") ||
    course === "anm" ||
    course === "gnm" ||
    course.includes("general nursing") ||
    course.includes("auxiliary nursing");

  return isSchoolStudent ? "/school-letter-head.jpg" : "/college-letter-head.jpg";
}

function formatPdfAmount(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-IN")}`;
}

function getFeeStructureDuration(student) {
  const course = String(student?.course || student?.courseName || "").toLowerCase();
  if (course.includes("b.sc") || course.includes("bsc")) return 4;
  if (course === "gnm" || course.includes("general nursing")) return 3;
  return 2;
}

function getFeeStructureCourseLabel(student) {
  const course = String(student?.course || student?.courseName || "").trim();
  return /^gnm(?:\s*\.\s*\(?\s*n\s*\)?)?$/i.test(course)
    ? "GNM. (N)"
    : course || "Not available";
}

function formatFeeStructureYear(value) {
  const year = String(value || "").trim();
  const match = year.match(/^(\d{4})\s*-\s*(\d{2}|\d{4})$/);
  if (!match) return year || "Not available";
  return `${match[1]}-${match[2].slice(-2)}`;
}

function getOrdinalYearLabel(year) {
  return `${year}${year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} Year`;
}

function formatYearlyPdfAmount(amount) {
  return Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function printFeeStructure({ student }) {
  if (!student) {
    return;
  }

  const printWindow = window.open("", "_blank");
  const doc = new jsPDF();
  const studentName = student.studentName || student.fullName || "Student";
  const courseLabel = getFeeStructureCourseLabel(student);
  const batchLabel = formatFeeStructureYear(student.admissionBatch || student.year);
  const academicYearLabel = formatFeeStructureYear(student.academicYear || student.year);
  const feeItems = Array.isArray(student.feeStructure)
    ? student.feeStructure.filter((item) => Number(item?.amount || 0) > 0)
    : [];
  const courseDuration = getFeeStructureDuration(student);
  const rows = feeItems.length
    ? feeItems
    : [{ title: "Course Fee", amount: Number(student.totalFee || 0) }];
  const annualTotal = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const letterheadUrl = `${import.meta.env.BASE_URL}${getFeeStructureLetterhead(student).replace(/^\//, "")}`;

  try {
    const letterhead = await loadPdfImage(letterheadUrl);
    doc.addImage(letterhead, "JPEG", 0, 0, 210, 297);
  } catch {
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 48, "F");
  }

  let y = 76;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    getFeeStructureLetterhead(student) === "/school-letter-head.jpg"
      ? "SABARMATI SCHOOL OF NURSING"
      : "SABARMATI COLLEGE OF NURSING",
    105,
    y,
    { align: "center" }
  );
  y += 8;
  doc.text(`NAME:- :- ${studentName}`, 105, y, { align: "center" });
  y += 8;
  doc.text(`${courseLabel} (${batchLabel}) BATCH`, 105, y, { align: "center" });
  y += 8;
  doc.text(`FEES STRUCTURE OF ${courseLabel} :${academicYearLabel}`, 105, y, {
    align: "center",
  });
  y += 12;

  const tableX = 18;
  const tableWidth = 174;
  const serialWidth = 12;
  const particularsWidth = 54;
  const yearWidth = (tableWidth - serialWidth - particularsWidth) / courseDuration;
  const headerHeight = 16;
  const rowHeight = 9;
  const tableTop = y;
  const drawCell = (x, top, width, height) => doc.rect(x, top, width, height);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  drawCell(tableX, tableTop, serialWidth, headerHeight);
  drawCell(tableX + serialWidth, tableTop, particularsWidth, headerHeight);
  doc.text(["Sl.", "No."], tableX + serialWidth / 2, tableTop + 6, { align: "center" });
  doc.text("Particulars", tableX + serialWidth + particularsWidth / 2, tableTop + 9, { align: "center" });
  Array.from({ length: courseDuration }).forEach((_, index) => {
    const cellX = tableX + serialWidth + particularsWidth + yearWidth * index;
    drawCell(cellX, tableTop, yearWidth, headerHeight);
    doc.text(getOrdinalYearLabel(index + 1), cellX + yearWidth / 2, tableTop + 6, { align: "center" });
    doc.text("(Rs.)", cellX + yearWidth / 2, tableTop + 12, { align: "center" });
  });

  let rowY = tableTop + headerHeight;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  rows.forEach((item, index) => {
    drawCell(tableX, rowY, serialWidth, rowHeight);
    drawCell(tableX + serialWidth, rowY, particularsWidth, rowHeight);
    doc.text(String(index + 1), tableX + serialWidth / 2, rowY + 6, { align: "center" });
    doc.text(String(item.title || "Fee").slice(0, 30), tableX + serialWidth + 3, rowY + 6);
    Array.from({ length: courseDuration }).forEach((_, yearIndex) => {
      const cellX = tableX + serialWidth + particularsWidth + yearWidth * yearIndex;
      drawCell(cellX, rowY, yearWidth, rowHeight);
      doc.text(formatYearlyPdfAmount(item.amount), cellX + yearWidth / 2, rowY + 6, { align: "center" });
    });
    rowY += rowHeight;
  });

  doc.setFont("helvetica", "bold");
  drawCell(tableX, rowY, serialWidth + particularsWidth, rowHeight);
  doc.text("Total", tableX + (serialWidth + particularsWidth) / 2, rowY + 6, { align: "center" });
  Array.from({ length: courseDuration }).forEach((_, index) => {
    const cellX = tableX + serialWidth + particularsWidth + yearWidth * index;
    drawCell(cellX, rowY, yearWidth, rowHeight);
    doc.text(formatYearlyPdfAmount(annualTotal), cellX + yearWidth / 2, rowY + 6, { align: "center" });
  });
  doc.setFontSize(11);
  doc.text("Signature of Principal", tableX, rowY + 28);
  doc.autoPrint();
  const feeStructureUrl = doc.output("bloburl");
  if (!printWindow) return;
  printWindow.addEventListener("load", () => { printWindow.focus(); printWindow.print(); }, { once: true });
  printWindow.location.href = feeStructureUrl;
}

async function downloadLetterBatchPdf({ students, type, selectedFeeYear, selectedFeeCourse }) {
  const availableStudents = Array.isArray(students) ? students.filter(Boolean) : [];
  const letterStudents =
    type === "demand"
      ? availableStudents.filter((item) => Number(item?.pendingAmount || item?.outstandingAmount || 0) > 0)
      : availableStudents;
  if (!letterStudents.length) {
    window.alert(
      type === "demand"
        ? "No pending students are available for demand letter generation."
        : "No students are available for bonafide certificate generation."
    );
    return;
  }
  const yearLabel = selectedFeeYear === ALL_FEE_YEARS ? "all-years" : selectedFeeYear;
  const courseLabel =
    selectedFeeCourse === ALL_FEE_COURSES
      ? "all-courses"
      : selectedFeeCourse.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const prefix = type === "bonafide" ? "bonafide-certificates" : "demand-letters";
  await downloadStudentLettersPdf({
    students: letterStudents,
    type,
    filename: `${prefix}-${courseLabel}-${yearLabel}.pdf`,
  });
}

function statusClass(status) {
  if (status === "Cleared") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "Overdue") {
    return "bg-red-100 text-red-700";
  }
  return "bg-amber-100 text-amber-800";
}

const STUDENT_CUSTOM_FEE_HEADS = [
  { name: "Course Fee", amount: 0 },
  { name: "Miscellaneous Expenses", amount: 0, isGroup: true },
  { name: "• Library Fee", amount: 0, isBreakdown: true },
  { name: "• Practical Fee", amount: 0, isBreakdown: true },
  { name: "• Travel Charges", amount: 0, isBreakdown: true },
];

const STUDENT_CUSTOM_INSTALLMENTS = [
  { name: "Installment 1", dueDate: "", amount: 0, paid: 0, status: "Pending" },
  { name: "Installment 2", dueDate: "", amount: 0, paid: 0, due: 0, status: "Pending" },
  { name: "Installment 3", dueDate: "", amount: 0, paid: 0, status: "Pending" },
];

const STUDENT_CUSTOM_TIMELINE = [
  { label: "Admission Fee", status: "Paid" },
  { label: "Semester Fee", status: "Paid" },
  { label: "Exam Fee", status: "Pending" },
  { label: "Hostel Fee", status: "Pending" },
  { label: "Bus Fee", status: "Pending" },
];

const STUDENT_CUSTOM_LEDGER = [
  { date: "", description: "Admission Fee", debit: 0, credit: 0, balance: 0 },
  { date: "", description: "Tuition Fee", debit: 0, credit: 0, balance: 0 },
  { date: "", description: "Fine", debit: 0, credit: 0, balance: 0 },
];

const STUDENT_CUSTOM_ACTIONS = [
  "Generate Receipt",
  "Download PDF",
  "Download Excel",
  "Email Student",
  "Send WhatsApp Reminder",
  "Collect Payment",
  "Print Challan",
  "Freeze Fee Structure",
  "Clone Fee",
  "Delete Customization",
];

const SUPER_ADMIN_FEE_CONTROLS = [
  "Lock Fee Structure",
  "Unlock",
  "Override Course Fee",
  "Student-wise Custom Fee",
  "Category-wise Fee",
  "Management Quota Fee",
  "Scholarship Override",
  "Hostel Fee Override",
  "Bus Fee Override",
  "Semester Promotion Fee",
  "Previous Due Adjustment",
  "Fine Auto Calculation",
  "Refund Processing",
  "Audit Log",
  "Fee Version History",
];

const FEE_BREAKDOWN_CHART = [
  { label: "Tuition", value: 0, tone: "bg-blue-700" },
  { label: "Hostel", value: 0, tone: "bg-emerald-700" },
  { label: "Exam", value: 0, tone: "bg-amber-600" },
  { label: "Library", value: 0, tone: "bg-sky-600" },
  { label: "Bus", value: 0, tone: "bg-violet-700" },
  { label: "Others", value: 0, tone: "bg-slate-700" },
];

const Fee = () => {
  const currentUser = getStoredUser();
  const currentRole = normalizeRole(currentUser?.role);
  const isStudentView = currentRole === "student";
  const isSuperAdmin = currentRole === "super_admin";
  const isAdmin = currentRole === "admin";
  const canEditReceipts = isSuperAdmin || isAdmin;
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [student, setStudent] = useState(null);
  const [selectedRegistrationNo, setSelectedRegistrationNo] = useState(
    searchParams.get("registrationNo") || ""
  );
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote] = useState("");
  const [upiId, setUpiId] = useState(
    import.meta.env.VITE_UPI_ID || "schoolfees@okaxis"
  );
  const [payeeName, setPayeeName] = useState(
    import.meta.env.VITE_UPI_NAME || "Campus Fee Collection"
  );
  const [showQr, setShowQr] = useState(false);
  const [latestReceipt, setLatestReceipt] = useState(null);
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState(null);
  const [selectedFeeYear, setSelectedFeeYear] = useState(ALL_FEE_YEARS);
  const [selectedFeeCourse, setSelectedFeeCourse] = useState(ALL_FEE_COURSES);
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [selectedAdmissionBatch, setSelectedAdmissionBatch] = useState("");
  const [selectedCourseDuration, setSelectedCourseDuration] = useState("");
  const [selectedStudentStatus, setSelectedStudentStatus] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refundSaving, setRefundSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [capabilities, setCapabilities] = useState(initialCapabilities);
  const [refundForm, setRefundForm] = useState({
    amount: "",
    reason: "",
    reference: "",
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [admissionBatches, setAdmissionBatches] = useState([...DEFAULT_ADMISSION_BATCHES]);
  const [newBatchName, setNewBatchName] = useState("");
  const [academicYears, setAcademicYears] = useState(["2024-2025", "2025-2026", "2026-2027"]);
  const [newAcademicYear, setNewAcademicYear] = useState("");
  const [editingFeeHead, setEditingFeeHead] = useState(null);
  const [editFeeAmount, setEditFeeAmount] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [customFeeHeads, setCustomFeeHeads] = useState(() =>
    STUDENT_CUSTOM_FEE_HEADS.map((item) => ({ ...item }))
  );
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    receiptNumber: "",
    amount: "",
    method: "UPI",
    transactionId: "",
    paymentDate: "",
    note: "",
  });

  const pendingAmount = Number(student?.pendingAmount || 0);
  const hasPendingDue = pendingAmount > 0;
  const normalizedAmount = Number(paymentAmount);
  const isValidAmount =
    Number.isFinite(normalizedAmount) &&
    normalizedAmount > 0 &&
    normalizedAmount <= pendingAmount;

  const transactionReference = useMemo(() => {
    return (
      transactionId.trim() ||
      `FEE-${student?.registrationNo || "STUDENT"}-${Date.now()}`
    );
  }, [transactionId, student?.registrationNo]);

  const upiPaymentLink = useMemo(() => {
    if (!student || !isValidAmount || !upiId.trim() || !payeeName.trim()) {
      return "";
    }
    const transactionNote = [
      student.studentName || student.fullName || "Student Fee",
      student.registrationNo ? `Reg ${student.registrationNo}` : "",
      note.trim(),
    ]
      .filter(Boolean)
      .join(" | ");
    return buildUpiPaymentLink({
      upiId: upiId.trim(),
      payeeName: payeeName.trim(),
      amount: normalizedAmount.toFixed(2),
      transactionNote,
      transactionRef: transactionReference,
    });
  }, [
    student,
    isValidAmount,
    upiId,
    payeeName,
    note,
    normalizedAmount,
    transactionReference,
  ]);

  const feeYearOptions = useMemo(() => {
    const years = students
      .map(getStudentAcademicYear)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    return [ALL_FEE_YEARS, ...new Set(years)];
  }, [students]);

  const feeCourseOptions = useMemo(() => {
    const courses = new Set();
    INSTITUTIONS.forEach((inst) => {
      inst.courses.forEach((course) => courses.add(course.name));
    });
    return [ALL_FEE_COURSES, ...Array.from(courses)];
  }, []);

  const courseDurationOptions = useMemo(() => {
    const institutionsToCheck = selectedInstitution
      ? INSTITUTIONS.filter((institution) => institution.name === selectedInstitution)
      : INSTITUTIONS;
    const matchingCourses = institutionsToCheck.flatMap((institution) =>
      institution.courses.filter(
        (course) =>
          selectedFeeCourse === ALL_FEE_COURSES || course.name === selectedFeeCourse
      )
    );

    const longestCourseDuration = Math.max(
      0,
      ...matchingCourses.map((course) => Number(course.durationYears || 0))
    );
    return Array.from({ length: longestCourseDuration }, (_, index) => index + 1);
  }, [selectedFeeCourse, selectedInstitution]);

  const getCourseOptionLabel = (courseName) => {
    for (const inst of INSTITUTIONS) {
      const found = inst.courses.find((c) => c.name === courseName);
      if (found) return `${courseName} (${found.durationYears} Years)`;
    }
    return courseName;
  };

  const getFilteredStudents = (
    list,
    inst = selectedInstitution,
    course = selectedFeeCourse,
    year = selectedFeeYear,
    batch = selectedAdmissionBatch,
    duration = selectedCourseDuration,
    status = selectedStudentStatus,
    searchTerm = studentSearchTerm
  ) => {
    return list.filter((item) => {
      const matchesYear =
        year === ALL_FEE_YEARS ||
        !year ||
        getStudentAcademicYear(item) === year;
      
      const matchesCourse =
        course === ALL_FEE_COURSES ||
        !course ||
        item.course === course;
      
      const matchesInstitution =
        !inst ||
        inst === "" ||
        inst === "All" ||
        item.institution === inst;
      
      const matchesBatch =
        !batch ||
        batch === "" ||
        batch === "All" ||
        item.admissionBatch === batch;
      
      const matchesDuration =
        !duration ||
        duration === "" ||
        duration === "All" ||
        getStudentStudyYear(item) === Number(duration);
      
      const matchesStatus =
        !status ||
        status === "" ||
        status === "All" ||
        (status === "Active" ? (item.status !== "Inactive" && item.outstandingStatus !== "Inactive") : 
         status === "Inactive" ? (item.status === "Inactive" || item.outstandingStatus === "Inactive") :
         item.status === status || item.outstandingStatus === status);

      const matchesSearch = searchTerm
        ? (item.studentName || item.fullName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (item.registrationNo || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        : true;

      return (
        matchesYear &&
        matchesCourse &&
        matchesInstitution &&
        matchesBatch &&
        matchesDuration &&
        matchesStatus &&
        matchesSearch
      );
    });
  };

  const filteredStudents = useMemo(() => {
    const matched = getFilteredStudents(students);

    if (selectedRegistrationNo) {
      const alreadyIncluded = matched.some(item => item.registrationNo === selectedRegistrationNo);
      if (!alreadyIncluded) {
        const selectedStudent = students.find(item => item.registrationNo === selectedRegistrationNo);
        if (selectedStudent) {
          matched.push(selectedStudent);
        }
      }
    }

    return matched;
  }, [
    selectedFeeCourse,
    selectedFeeYear,
    selectedInstitution,
    selectedAdmissionBatch,
    selectedCourseDuration,
    selectedStudentStatus,
    students,
    studentSearchTerm,
    selectedRegistrationNo
  ]);

  const yearWiseSummary = useMemo(
    () => createFallbackSummary(filteredStudents),
    [filteredStudents]
  );
  const yearWiseReports = useMemo(
    () => createFallbackReports(filteredStudents),
    [filteredStudents]
  );
  const hasDashboardFilter =
    selectedFeeYear !== ALL_FEE_YEARS || selectedFeeCourse !== ALL_FEE_COURSES || selectedInstitution !== "";
  const visibleSummary = !hasDashboardFilter && summary ? summary : yearWiseSummary;
  const visibleReports = !hasDashboardFilter && reports ? reports : yearWiseReports;
  const visibleStudentCount = filteredStudents.length;
  const customFeeTotal = customFeeHeads
    .filter((item) => !item.isBreakdown)
    .reduce((sum, item) => sum + item.amount, 0);
  const scholarshipAmount = Math.round(
    customFeeHeads.filter((item) =>
      ["Course Fee"].includes(item.name)
    ).reduce((sum, item) => sum + item.amount, 0) * 0.2
  );
  const customDiscount = 0;
  const customFine = 0;
  const customExtraCharge = 0;
  const customPaid = 0;
  const customNetPayable =
    customFeeTotal - scholarshipAmount - customDiscount + customFine + customExtraCharge;
  const customRemaining = Math.max(customNetPayable - customPaid, 0);
  const customCourseYearNumber = Number(selectedCourseDuration || getStudentStudyYear(student));
  const customCourseYear =
    STUDY_YEAR_LABELS[customCourseYearNumber - 1] || `${customCourseYearNumber}th Year`;
  const customProfile = {
    name: student?.studentName || student?.fullName || "Rahul Kumar",
    admissionNo:
      student?.admissionNumber ||
      student?.applicationId ||
      student?.registrationNo ||
      "SBN20260045",
    registrationNo: student?.registrationNo || "SBN20260045",
    course:
      student?.course ||
      (selectedFeeCourse !== ALL_FEE_COURSES ? selectedFeeCourse : "B.Sc Nursing"),
    courseYear: customCourseYear,
    section: student?.section || "A",
    category: student?.category || "SC",
    scholarship: student?.scholarshipAmount > 0 ? "Yes" : "Yes",
    status: student?.status || student?.outstandingStatus || "Active",
  };
  const customAcademicYear =
    selectedFeeYear !== ALL_FEE_YEARS
      ? selectedFeeYear
      : student?.academicYear || student?.year || "2026-2027";

  const refreshAnalytics = async (currentStudents) => {
    if (isStudentView) {
      setSummary(createFallbackSummary(currentStudents));
      setReports(createFallbackReports(currentStudents));
      setCapabilities((prev) => ({
        ...prev,
        feeSummary: false,
        feeReports: false,
        manualPayment: false,
        feeConfig: false,
        feeRefunds: false,
      }));
      return;
    }
    try {
      const summaryResponse = await apiRequest("/api/students/fees/summary");
      setSummary(summaryResponse.overview);
      setCapabilities((prev) => ({ ...prev, feeSummary: true }));
    } catch (summaryError) {
      if (isMissingRouteError(summaryError.message)) {
        setCapabilities((prev) => ({ ...prev, feeSummary: false }));
      }
      setSummary(createFallbackSummary(currentStudents));
    }
    try {
      const reportsResponse = await apiRequest("/api/students/fees/reports");
      setReports(reportsResponse.reports);
      setCapabilities((prev) => ({ ...prev, feeReports: true }));
    } catch (reportError) {
      if (isMissingRouteError(reportError.message)) {
        setCapabilities((prev) => ({ ...prev, feeReports: false }));
      }
      setReports(createFallbackReports(currentStudents));
    }
  };

  const refreshSelectedStudent = async (registrationNo, listOverride) => {
    const currentList = listOverride || students;
    let nextStudent = null;
    try {
      const response = await apiRequest(
        `/api/students/fee-dashboard?registrationNo=${encodeURIComponent(
          registrationNo
        )}`
      );
      nextStudent = sanitizeStudent(response.student);
      setCapabilities((prev) => ({ ...prev, feeDashboard: true }));
    } catch (loadError) {
      if (isMissingRouteError(loadError.message)) {
        setCapabilities((prev) => ({ ...prev, feeDashboard: false }));
      }
      nextStudent = currentList.find(
        (item) => item.registrationNo === registrationNo
      );
      if (!nextStudent) {
        throw loadError;
      }
    }
    setStudent(nextStudent);
    setLatestReceipt(nextStudent.paymentHistory?.[0] || null);
    setPaymentAmount(
      nextStudent.pendingAmount > 0 ? String(nextStudent.pendingAmount) : ""
    );
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (isStudentView) {
          const response = await apiRequest("/api/students/me/fees");
          const normalizedStudent = sanitizeStudent(response.student);
          const nextStudents = normalizedStudent ? [normalizedStudent] : [];
          if (ignore) {
            return;
          }
          setStudents(nextStudents);
          setStudent(normalizedStudent);
          setLatestReceipt(normalizedStudent?.paymentHistory?.[0] || null);
          setSelectedRegistrationNo(normalizedStudent?.registrationNo || "");
          setPaymentAmount(
            normalizedStudent?.pendingAmount > 0
              ? String(normalizedStudent.pendingAmount)
              : ""
          );
          await refreshAnalytics(nextStudents);
        } else {
          const list = await apiRequest("/api/students");
          const normalizedList = list.map(sanitizeStudent);
          if (ignore) {
            return;
          }
          setStudents(normalizedList);
          await refreshAnalytics(normalizedList);
          const registrationNo =
            searchParams.get("registrationNo") ||
            selectedRegistrationNo ||
            normalizedList[0]?.registrationNo ||
            "";
          if (!registrationNo) {
            setStudent(null);
            return;
          }
          setSelectedRegistrationNo(registrationNo);
          await refreshSelectedStudent(registrationNo, normalizedList);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!hasPendingDue) {
      setPaymentAmount("");
      setShowQr(false);
    }
  }, [hasPendingDue]);

  const updateLocalStudent = async (nextStudent, receipt) => {
    const normalized = sanitizeStudent(nextStudent);
    const nextStudents = students.map((item) =>
      item._id === normalized._id ? normalized : item
    );
    setStudent(normalized);
    setLatestReceipt(receipt || normalized.paymentHistory?.[0] || null);
    setStudents(nextStudents);
    setPaymentAmount(
      normalized.pendingAmount > 0 ? String(normalized.pendingAmount) : ""
    );
    setTransactionId("");
    setNote("");
    setShowQr(false);
    await refreshAnalytics(nextStudents);
  };

  const handleSearchTermChange = async (event) => {
    const term = event.target.value;
    setStudentSearchTerm(term);
    
    const exactMatch = students.find(
      (item) =>
        (item.studentName || item.fullName || "").toLowerCase() === term.toLowerCase() ||
        (item.registrationNo || "").toLowerCase() === term.toLowerCase()
    );
    if (exactMatch) {
      setSelectedRegistrationNo(exactMatch.registrationNo);
      setLoading(true);
      try {
        await refreshSelectedStudent(exactMatch.registrationNo);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleStudentChange = async (event) => {
    const registrationNo = event.target.value;
    setSelectedRegistrationNo(registrationNo);
    setError("");
    setSuccess("");
    setShowQr(false);
    setTransactionId("");
    setNote("");
    if (!registrationNo) {
      setStudent(null);
      return;
    }
    setLoading(true);
    try {
      await refreshSelectedStudent(registrationNo);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFeeYearChange = async (event) => {
    const nextYear = event.target.value;
    const nextStudents = getFilteredStudents(
      students,
      selectedInstitution,
      selectedFeeCourse,
      nextYear,
      selectedAdmissionBatch,
      selectedCourseDuration,
      selectedStudentStatus
    );
    const selectedStudentInYear = nextStudents.some(
      (item) => item.registrationNo === selectedRegistrationNo
    );
    setSelectedFeeYear(nextYear);
    setError("");
    setSuccess("");
    setShowQr(false);
    setTransactionId("");
    setNote("");
    if (selectedStudentInYear) {
      return;
    }
    const nextRegistrationNo = nextStudents[0]?.registrationNo || "";
    setSelectedRegistrationNo(nextRegistrationNo);
    if (!nextRegistrationNo) {
      setStudent(null);
      return;
    }
    setLoading(true);
    try {
      await refreshSelectedStudent(nextRegistrationNo, nextStudents);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFeeCourseChange = async (event) => {
    const nextCourse = event.target.value;
    
    // Reset year filter to "All Years" when a specific course is selected
    // This ensures all years/semesters for that course are shown
    const nextYear = nextCourse === ALL_FEE_COURSES ? selectedFeeYear : ALL_FEE_YEARS;
    
    // A course selection determines the available study years; reset the year filter.
    const nextDuration = "";
    
    const nextStudents = getFilteredStudents(
      students,
      selectedInstitution,
      nextCourse,
      nextYear,
      selectedAdmissionBatch,
      nextDuration,
      selectedStudentStatus
    );
    const selectedStudentInCourse = nextStudents.some(
      (item) => item.registrationNo === selectedRegistrationNo
    );
    setSelectedFeeCourse(nextCourse);
    setSelectedFeeYear(nextYear);
    setSelectedCourseDuration(nextDuration);
    setError("");
    setSuccess("");
    setShowQr(false);
    setTransactionId("");
    setNote("");
    if (selectedStudentInCourse) {
      return;
    }
    const nextRegistrationNo = nextStudents[0]?.registrationNo || "";
    setSelectedRegistrationNo(nextRegistrationNo);
    if (!nextRegistrationNo) {
      setStudent(null);
      return;
    }
    setLoading(true);
    try {
      await refreshSelectedStudent(nextRegistrationNo, nextStudents);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInstitutionChange = async (event) => {
    const nextInstitution = event.target.value;
    const nextStudents = getFilteredStudents(
      students,
      nextInstitution,
      selectedFeeCourse,
      selectedFeeYear,
      selectedAdmissionBatch,
      selectedCourseDuration,
      selectedStudentStatus
    );
    setSelectedInstitution(nextInstitution);
    setError("");
    setSuccess("");
    setShowQr(false);
    setTransactionId("");
    setNote("");
    const nextRegistrationNo = nextStudents[0]?.registrationNo || "";
    setSelectedRegistrationNo(nextRegistrationNo);
    if (!nextRegistrationNo) {
      setStudent(null);
      return;
    }
    setLoading(true);
    try {
      await refreshSelectedStudent(nextRegistrationNo, nextStudents);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdmissionBatchChange = async (value) => {
    setSelectedAdmissionBatch(value);
    const nextStudents = getFilteredStudents(
      students,
      selectedInstitution,
      selectedFeeCourse,
      selectedFeeYear,
      value,
      selectedCourseDuration,
      selectedStudentStatus
    );
    setError("");
    setSuccess("");
    setShowQr(false);
    setTransactionId("");
    setNote("");
    const nextRegistrationNo = nextStudents[0]?.registrationNo || "";
    setSelectedRegistrationNo(nextRegistrationNo);
    if (!nextRegistrationNo) {
      setStudent(null);
      return;
    }
    setLoading(true);
    try {
      await refreshSelectedStudent(nextRegistrationNo, nextStudents);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseDurationChange = async (value) => {
    setSelectedCourseDuration(value);
    const nextStudents = getFilteredStudents(
      students,
      selectedInstitution,
      selectedFeeCourse,
      selectedFeeYear,
      selectedAdmissionBatch,
      value,
      selectedStudentStatus
    );
    setError("");
    setSuccess("");
    setShowQr(false);
    setTransactionId("");
    setNote("");
    const nextRegistrationNo = nextStudents[0]?.registrationNo || "";
    setSelectedRegistrationNo(nextRegistrationNo);
    if (!nextRegistrationNo) {
      setStudent(null);
      return;
    }
    setLoading(true);
    try {
      await refreshSelectedStudent(nextRegistrationNo, nextStudents);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentStatusChange = async (value) => {
    setSelectedStudentStatus(value);
    const nextStudents = getFilteredStudents(
      students,
      selectedInstitution,
      selectedFeeCourse,
      selectedFeeYear,
      selectedAdmissionBatch,
      selectedCourseDuration,
      value
    );
    setError("");
    setSuccess("");
    setShowQr(false);
    setTransactionId("");
    setNote("");
    const nextRegistrationNo = nextStudents[0]?.registrationNo || "";
    setSelectedRegistrationNo(nextRegistrationNo);
    if (!nextRegistrationNo) {
      setStudent(null);
      return;
    }
    setLoading(true);
    try {
      await refreshSelectedStudent(nextRegistrationNo, nextStudents);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const validatePaymentInput = () => {
    if (!student) {
      return "Select a student first.";
    }
    if (!hasPendingDue) {
      return "This student has no pending due. Payment is already cleared.";
    }
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return "Enter a valid payment amount.";
    }
    if (normalizedAmount > pendingAmount) {
      return "Payment amount cannot be greater than the pending due.";
    }
    return "";
  };

  const handleGenerateQr = () => {
    setError("");
    setSuccess("");
    const validationMessage = validatePaymentInput();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    if (!upiId.trim()) {
      setError("Enter a valid UPI ID before generating the QR code.");
      return;
    }
    if (!payeeName.trim()) {
      setError("Enter the payee name before generating the QR code.");
      return;
    }
    setShowQr(true);
  };

  const handleManualConfirm = async () => {
    const validationMessage = validatePaymentInput();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiRequest(`/api/students/${student._id}/fees/pay`, {
        method: "POST",
        body: JSON.stringify({
          amount: normalizedAmount,
          method: paymentMethod,
          provider: ["Cash", "Bank", "Cheque"].includes(paymentMethod)
            ? paymentMethod
            : "Manual",
          transactionId,
          note,
          confirmedBy: paymentMethod === "API Verification" ? "Payment API" : "Admin",
        }),
      });
      setCapabilities((prev) => ({ ...prev, manualPayment: true }));
      await updateLocalStudent(response.student, response.receipt);
      setSuccess(response.message);
    } catch (paymentError) {
      if (isMissingRouteError(paymentError.message)) {
        setCapabilities((prev) => ({ ...prev, manualPayment: false }));
        setError(
          "Manual payment confirmation is not available on the connected backend yet. Please restart or redeploy the backend with the latest student fee routes."
        );
      } else {
        setError(paymentError.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRazorpayPayment = async () => {
    const validationMessage = validatePaymentInput();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await loadRazorpayCheckout();
      const orderResponse = await apiRequest(
        `/api/students/${student._id}/fees/razorpay-order`,
        {
          method: "POST",
          body: JSON.stringify({ amount: normalizedAmount }),
        }
      );
      setCapabilities((prev) => ({ ...prev, razorpay: true }));
      const razorpay = new window.Razorpay({
        key: orderResponse.keyId,
        amount: orderResponse.order.amount,
        currency: orderResponse.order.currency,
        name: payeeName.trim() || "Campus Fee Collection",
        description: `Student fee payment for ${student.studentName || student.fullName}`,
        order_id: orderResponse.order.id,
        prefill: {
          name: student.studentName || student.fullName || "",
          email: student.email || "",
          contact: student.phone || "",
        },
        notes: {
          registrationNo: student.registrationNo || "",
          course: student.course || "",
        },
        theme: {
          color: "#0f766e",
        },
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await apiRequest(
              `/api/students/${student._id}/fees/verify-razorpay`,
              {
                method: "POST",
                body: JSON.stringify({
                  amount: normalizedAmount,
                  note,
                  ...paymentResponse,
                }),
              }
            );
            await updateLocalStudent(verifyResponse.student, verifyResponse.receipt);
            setSuccess(verifyResponse.message);
          } catch (verifyError) {
            if (isMissingRouteError(verifyError.message)) {
              setCapabilities((prev) => ({ ...prev, razorpay: false }));
            }
            setError(verifyError.message);
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
          },
        },
      });
      razorpay.on("payment.failed", (response) => {
        setError(
          response.error?.description || "Razorpay payment was not completed."
        );
        setSubmitting(false);
      });
      razorpay.open();
    } catch (checkoutError) {
      if (isMissingRouteError(checkoutError.message)) {
        setCapabilities((prev) => ({ ...prev, razorpay: false }));
        setError(
          "Razorpay automatic checkout is not available on the connected backend yet. Please restart or redeploy the backend with the latest student fee routes."
        );
      } else {
        setError(checkoutError.message);
      }
      setSubmitting(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!student) {
      setError("Select a student first.");
      return;
    }
    const refundAmount = Number(refundForm.amount);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      setError("Enter a valid refund amount.");
      return;
    }
    setRefundSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiRequest(`/api/students/${student._id}/fees/refund`, {
        method: "POST",
        body: JSON.stringify({
          amount: refundAmount,
          reason: refundForm.reason,
          reference: refundForm.reference,
          processedBy: "Admin",
        }),
      });
      setCapabilities((prev) => ({ ...prev, feeRefunds: true }));
      await updateLocalStudent(response.student);
      setRefundForm({ amount: "", reason: "", reference: "" });
      setSuccess(response.message);
    } catch (refundError) {
      if (isMissingRouteError(refundError.message)) {
        setCapabilities((prev) => ({ ...prev, feeRefunds: false }));
        setError("Refund processing route is unavailable on the connected backend.");
      } else {
        setError(refundError.message);
      }
    } finally {
      setRefundSaving(false);
    }
  };

  const handleEditReceipt = (payment) => {
    if (!payment || !canEditReceipts) return;
    setEditingReceipt(payment);
    setReceiptForm({
      receiptNumber: payment.receiptNumber || "",
      amount: payment.amount != null ? String(payment.amount) : "",
      method: payment.method || "UPI",
      transactionId: payment.transactionId || "",
      paymentDate: formatDateTimeInput(payment.paymentDate),
      note: payment.note || "",
    });
    setError("");
    setSuccess("");
  };

  const handleCloseReceiptModal = () => {
    setEditingReceipt(null);
    setReceiptForm({
      receiptNumber: "",
      amount: "",
      method: "UPI",
      transactionId: "",
      paymentDate: "",
      note: "",
    });
  };

  const handleReceiptFormChange = (event) => {
    const { name, value } = event.target;
    setReceiptForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveReceipt = async () => {
    if (!student || !editingReceipt) return;
    const nextAmount = Number(receiptForm.amount);
    if (!receiptForm.receiptNumber.trim()) {
      setError("Receipt number is required.");
      return;
    }
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      setError("Enter a valid receipt amount.");
      return;
    }

    setReceiptSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data: response } = await apiRequest.post(
        `/api/students/${student._id}/fees/receipts/${encodeURIComponent(editingReceipt.receiptNumber)}`,
        {
          receiptNumber: receiptForm.receiptNumber.trim(),
          amount: nextAmount,
          method: receiptForm.method,
          provider: ["Cash", "Bank", "Cheque"].includes(receiptForm.method)
            ? receiptForm.method
            : editingReceipt.provider || "Manual",
          transactionId: receiptForm.transactionId,
          paymentDate: receiptForm.paymentDate
            ? new Date(receiptForm.paymentDate).toISOString()
            : editingReceipt.paymentDate,
          note: receiptForm.note,
          confirmedBy: editingReceipt.confirmedBy || "Admin",
        }
      );
      await updateLocalStudent(response.student, response.receipt);
      handleCloseReceiptModal();
      setSuccess(response.message || "Receipt updated successfully.");
    } catch (receiptError) {
      setError(receiptError.message);
    } finally {
      setReceiptSaving(false);
    }
  };

  const handleAddAdmissionBatch = () => {
    if (!newBatchName.trim()) {
      setError("Enter a valid admission batch name (e.g., 2026-2030)");
      return;
    }
    if (admissionBatches.includes(newBatchName.trim())) {
      setError("This admission batch already exists.");
      return;
    }
    setAdmissionBatches([...admissionBatches, newBatchName.trim()]);
    setNewBatchName("");
    setSuccess("Admission batch added successfully.");
  };

  const handleDeleteAdmissionBatch = (batch) => {
    if (!isSuperAdmin) {
      setError("Only Super Admin can delete admission batches.");
      return;
    }
    const confirmed = window.confirm(`Delete admission batch "${batch}"?`);
    if (!confirmed) return;
    setAdmissionBatches(admissionBatches.filter((b) => b !== batch));
    setSuccess("Admission batch deleted successfully.");
  };

  const handleAddAcademicYear = () => {
    if (!newAcademicYear.trim()) {
      setError("Enter a valid academic year (e.g., 2026-2027)");
      return;
    }
    if (academicYears.includes(newAcademicYear.trim())) {
      setError("This academic year already exists.");
      return;
    }
    setAcademicYears([...academicYears, newAcademicYear.trim()]);
    setNewAcademicYear("");
    setSuccess("Academic year added successfully.");
  };

  const handleDeleteAcademicYear = (year) => {
    if (!isSuperAdmin) {
      setError("Only Super Admin can delete academic years.");
      return;
    }
    const confirmed = window.confirm(`Delete academic year "${year}"?`);
    if (!confirmed) return;
    setAcademicYears(academicYears.filter((y) => y !== year));
    setSuccess("Academic year deleted successfully.");
  };

  const handleEditFeeHead = (feeHead) => {
    setEditingFeeHead(feeHead);
    setEditFeeAmount(feeHead.amount.toString());
    setShowEditModal(true);
  };

  const handleSaveFeeHead = async () => {
    if (!editingFeeHead) return;
    const newAmount = Number(editFeeAmount);
    if (isNaN(newAmount) || newAmount < 0) {
      setError("Please enter a valid amount.");
      return;
    }

    let updatedHeads = customFeeHeads.map((item) =>
      item.name === editingFeeHead.name ? { ...item, amount: newAmount } : item
    );

    // Miscellaneous Expenses is the live subtotal of its three fee heads.
    if (editingFeeHead.isBreakdown) {
      const miscellaneousTotal = updatedHeads
        .filter((item) => item.isBreakdown)
        .reduce((sum, item) => sum + item.amount, 0);
      updatedHeads = updatedHeads.map((item) =>
        item.isGroup ? { ...item, amount: miscellaneousTotal } : item
      );
    }

    const newTotalFee = updatedHeads
      .filter((item) => !item.isBreakdown)
      .reduce((sum, item) => sum + item.amount, 0);
    setCustomFeeHeads(updatedHeads);

    // Save the billable heads (course, library, practical and travel) for the selected student.
    if (student) {
      const categoryByTitle = {
        "Course Fee": "Tuition",
        "Library Fee": "Library",
        "Practical Fee": "Practical",
        "Travel Charges": "Transport",
      };
      const updatedFeeStructure = updatedHeads
        .filter((item) => item.name === "Course Fee" || item.isBreakdown)
        .map((item) => {
          const title = item.name.replace(/^•\s*/, "");
          return {
            chargeId: `CHG-${title.replace(/[^A-Za-z]/g, "").toUpperCase()}-${Date.now()}`,
            title,
            category: categoryByTitle[title] || "Miscellaneous",
            scope: "Structure",
            amount: item.amount,
            dueDate: "",
            status: "Pending",
            note: "Student-wise custom fee structure",
          };
        });
      const newPendingAmount = Math.max(newTotalFee - (student.paidAmount || 0), 0);
      
      // Update student state
      const updatedStudent = {
        ...student,
        feeStructure: updatedFeeStructure,
        totalFee: newTotalFee,
        pendingAmount: newPendingAmount,
        outstandingAmount: newPendingAmount,
        outstandingStatus: newPendingAmount <= 0 ? "Cleared" : "Pending"
      };
      
      setStudent(updatedStudent);
      
      // Update the students list as well
      setStudents(prevStudents => 
        prevStudents.map(s => 
          s.registrationNo === student.registrationNo ? updatedStudent : s
        )
      );
      
      // Try to save to backend if available
      try {
        await apiRequest(`/api/students/${student._id}/fees/config`, {
          method: "PATCH",
          body: JSON.stringify({
            feeStructure: updatedFeeStructure,
            baseFee: newTotalFee
          })
        });
      } catch (error) {
        // Backend update failed, but local state is updated
        console.log("Backend update failed, using local state only");
      }
      
      setSuccess(`Updated ${editingFeeHead.name} to ${formatCurrency(newAmount)}. Total Fee updated to ${formatCurrency(newTotalFee)}`);
    } else {
      setSuccess(`Updated ${editingFeeHead.name} to ${formatCurrency(newAmount)}`);
    }
    
    setShowEditModal(false);
    setEditingFeeHead(null);
    setEditFeeAmount("");
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingFeeHead(null);
    setEditFeeAmount("");
  };

  const handleClearStudentFeeData = async () => {
    if (!isSuperAdmin || !student?._id) {
      setError("Only Super Admin can clear student fee data.");
      return;
    }

    if (!window.confirm(`Clear all fee data for ${student.studentName || student.fullName}? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await apiRequest(`/api/students/${student._id}/fees/clear`, { method: "PATCH" });
      setStudent(response.student);
      setStudents((current) => current.map((item) => (item._id === response.student._id ? response.student : item)));
      setCustomFeeHeads(STUDENT_CUSTOM_FEE_HEADS.map((item) => ({ ...item })));
      setSuccess("Student fee data was cleared. The student profile remains available.");
    } catch (clearError) {
      setError(clearError.message || "Unable to clear student fee data.");
    }
  };

  const handleDeleteStudent = async () => {
    if (!isSuperAdmin || !student?._id) {
      setError("Only Super Admin can delete a student.");
      return;
    }

    if (!window.confirm(`Delete ${student.studentName || student.fullName}? This removes the student and all fee details permanently.`)) {
      return;
    }

    try {
      await apiRequest(`/api/students/${student._id}`, { method: "DELETE" });
      const nextStudents = students.filter((item) => item._id !== student._id);
      setStudents(nextStudents);
      setStudent(null);
      setSelectedRegistrationNo("");
      setSuccess("Demo student and all fee details were deleted.");
      await refreshAnalytics(nextStudents);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete student.");
    }
  };

  const notices = isStudentView
    ? []
    : [
        !capabilities.feeDashboard
          ? "Fee dashboard route unavailable. The page is using the general student list fallback."
          : "",
        !capabilities.manualPayment
          ? "Manual payment confirmation route is unavailable on the connected backend."
          : "",
        !capabilities.razorpay
          ? "Razorpay order creation route is unavailable on the connected backend."
          : "",
        !capabilities.feeSummary
          ? "Analytics summary route unavailable. Dashboard cards are using local fallback calculations."
          : "",
        !capabilities.feeReports
          ? "Reports route unavailable. Report tables are using local fallback calculations."
          : "",
        !capabilities.feeConfig
          ? "Fee configuration updates are unavailable on the connected backend."
          : "",
        !capabilities.feeRefunds
          ? "Refund management route is unavailable on the connected backend."
          : "",
      ].filter(Boolean);

  const summaryCards = [
    {
      label: "Total Fee Collection",
      value: formatCurrency(visibleSummary?.totalFeeCollection),
      icon: IndianRupee,
      tone: "bg-emerald-50 border-emerald-200 text-emerald-900",
    },
    {
      label: "Total Due Amount",
      value: formatCurrency(visibleSummary?.totalDueAmount),
      icon: AlertCircle,
      tone: "bg-amber-50 border-amber-200 text-amber-900",
    },
    {
      label: "Refund Processed",
      value: formatCurrency(visibleSummary?.totalRefunds),
      icon: RefreshCcw,
      tone: "bg-rose-50 border-rose-200 text-rose-900",
    },
    {
      label: "Late Fee Fines",
      value: formatCurrency(visibleSummary?.totalFines),
      icon: Percent,
      tone: "bg-white border-slate-200 text-slate-900",
    },
  ];

  const managementReports = useMemo(() => {
    const rows = filteredStudents.map((item) => ({
      "Student Name": item.studentName || item.fullName || "Student",
      "Admission Number": item.admissionNumber || item.applicationId || item.registrationNo || "",
      "Roll Number": item.rollNumber || item.registrationNo || "",
      Institution: item.institution || "Not available",
      Course: item.course || "",
      "Admission Batch": item.admissionBatch || "",
      "Academic Year": item.academicYear || item.year || "",
      "Study Year": STUDY_YEAR_LABELS[(Number(item.currentStudyYear || 1) - 1)] || "First Year",
      "Total Fee": Number(item.totalFee || 0),
      Paid: Number(item.paidAmount || 0),
      Pending: Number(item.pendingAmount || 0),
      Fine: Number(item.totalFine || 0),
      Scholarship: Number(item.scholarshipAmount || 0),
      Discount: Number(item.totalDiscount || 0),
      "Payment Method": item.paymentHistory?.[0]?.method || "",
      "Receipt Number": item.paymentHistory?.[0]?.receiptNumber || "",
      "Payment Status": item.outstandingStatus || "Pending",
    }));
    return [
      { name: "Admission Batch-wise Fee Report", rows },
      { name: "Institution-wise Fee Report", rows },
      { name: "Course-wise Fee Report", rows },
      { name: "Academic Year-wise Fee Report", rows },
      { name: "First Year Fee Collection Report", rows: rows.filter((item) => item["Study Year"] === "First Year") },
      { name: "Second Year Fee Collection Report", rows: rows.filter((item) => item["Study Year"] === "Second Year") },
      { name: "Third Year Fee Collection Report", rows: rows.filter((item) => item["Study Year"] === "Third Year") },
      { name: "Fourth Year Fee Collection Report", rows: rows.filter((item) => item["Study Year"] === "Fourth Year") },
      { name: "Outstanding Fee Report", rows: rows.filter((item) => item.Pending > 0) },
      { name: "Paid Fee Report", rows: rows.filter((item) => item.Pending <= 0) },
      { name: "Scholarship Report", rows: rows.filter((item) => item.Scholarship > 0) },
      { name: "Discount Report", rows: rows.filter((item) => item.Discount > 0) },
      { name: "Fine Report", rows: rows.filter((item) => item.Fine > 0) },
      { name: "Student Ledger Report", rows },
    ];
  }, [filteredStudents]);

  const handleDownloadExcel = () => {
    const excelSheets = buildFeeExcelSheets({
      student,
      summary: visibleSummary,
      reports: visibleReports,
    });
    const registrationNo = student?.registrationNo || "fee-report";
    const yearLabel = selectedFeeYear === ALL_FEE_YEARS ? "all-years" : selectedFeeYear;
    downloadExcelWorkbook(`fee-report-${registrationNo}-${yearLabel}.xls`, excelSheets);
  };

  return (
    <section className="min-h-screen bg-slate-100 px-3 py-4 sm:px-4 lg:px-6">
      <div className="w-full space-y-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-900 px-5 py-6 text-white sm:px-8 sm:py-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100">
                  <ShieldCheck size={14} />
                  Finance Office
                </span>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Comprehensive Fee Management System
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  Manage institution fee structures, admission batches, student fee collection, receipts, 
                  demand letters, bonafide certificates, and comprehensive reports.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                {!isStudentView && (
                  <>
                    <div className="min-w-[220px]">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                        Institution
                      </label>
                      <select
                        value={selectedInstitution}
                        onChange={handleInstitutionChange}
                        className="w-full rounded-xl border border-white/20 bg-white/10 px-3 text-white transition focus-within:border-white/50"
                      >
                        <option value="">All Institutions</option>
                        {INSTITUTIONS.map((inst) => (
                          <option key={inst.id} value={inst.name}>{inst.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-[220px]">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                        Course Wise
                      </label>
                      <select
                        value={selectedFeeCourse}
                        onChange={handleFeeCourseChange}
                        className="w-full rounded-xl border border-white/20 bg-white/10 px-3 text-white transition focus-within:border-white/50"
                      >
                        {feeCourseOptions.map((course) => (
                          <option key={course} value={course}>
                            {getCourseOptionLabel(course)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-[190px]">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                        Academic Year
                      </label>
                      <select
                        value={selectedFeeYear}
                        onChange={handleFeeYearChange}
                        className="w-full rounded-xl border border-white/20 bg-white/10 px-3 text-white transition focus-within:border-white/50"
                      >
                        {feeYearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <Link
                  to="/dashboard/academichub/admission"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  New Admission
                </Link>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Refresh Dashboard
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-7">
            {error && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}
            {notices.length > 0 && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-sm font-semibold text-amber-900">
                  Backend compatibility notices
                </p>
                <div className="mt-2 space-y-2 text-sm text-amber-800">
                  {notices.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                  Loading student fee workspace...
                </div>
              </div>
            ) : students.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <h2 className="text-xl font-bold text-slate-900">
                  No students available yet
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Create a student admission first, then return here to manage fee payments,
                  receipts, reports, and ledger entries.
                </p>
                <Link
                  to="/dashboard/academichub/admission"
                  className="mt-5 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open Admission Form
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {!isStudentView && (
                  <div className="flex gap-2 border-b border-slate-200">
                    {[
                      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                      { id: "fee-structure", label: "Fee Structure", icon: BadgeIndianRupee },
                      { id: "admission-batches", label: "Admission Batches", icon: Calendar },
                      { id: "academic-years", label: "Academic Years", icon: Calendar },
                      { id: "institutions", label: "Institutions", icon: Building2 },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                          activeTab === tab.id
                            ? "border-b-2 border-slate-900 text-slate-900"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <tab.icon size={16} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "dashboard" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {summaryCards.map((card) => {
                        const Icon = card.icon;
                        return (
                          <div
                            key={card.label}
                            className={`rounded-2xl border p-5 ${card.tone}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em]">
                                  {card.label}
                                </p>
                                <p className="mt-3 text-3xl font-black">{card.value}</p>
                              </div>
                              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <Icon size={22} />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!isStudentView && (
                      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.85fr)]">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                              <LayoutDashboard size={22} />
                            </span>
                            <div>
                              <h2 className="text-xl font-bold text-slate-900">Dashboard Snapshot</h2>
                              <p className="text-sm text-slate-500">
                                Collection summary, payment status mix, and top outstanding students.
                              </p>
                            </div>
                          </div>
                          <div className="mt-5 grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl bg-slate-50 p-4">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                Total Students
                              </p>
                              <p className="mt-2 text-2xl font-black text-slate-900">
                                {visibleSummary?.totalStudents || visibleStudentCount}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                Paid Students
                              </p>
                              <p className="mt-2 text-2xl font-black text-emerald-900">
                                {visibleSummary?.paidStudents || 0}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                Overdue Students
                              </p>
                              <p className="mt-2 text-2xl font-black text-red-700">
                                {visibleSummary?.overdueStudents || 0}
                              </p>
                            </div>
                          </div>
                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-700">
                                Monthly Revenue Analytics
                              </h3>
                              <span className="text-xs text-slate-500">Last 6 months</span>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-6">
                              {(visibleSummary?.monthlyRevenue?.length
                                ? visibleSummary.monthlyRevenue
                                : Array.from({ length: 6 }).map((_, index) => ({
                                    label: `M${index + 1}`,
                                    total: 0,
                                  }))
                              ).map((item) => {
                                const maxValue = Math.max(
                                  ...(visibleSummary?.monthlyRevenue?.map((entry) => entry.total) || [1])
                                );
                                const height = maxValue > 0 ? (item.total / maxValue) * 120 : 10;
                                return (
                                  <div key={item.label} className="flex flex-col items-center gap-3">
                                    <div className="flex h-32 w-full items-end rounded-2xl bg-white px-3 py-3">
                                      <div
                                        className="w-full rounded-lg bg-slate-700 transition-all"
                                        style={{ height: `${Math.max(height, 10)}px` }}
                                      />
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                                      <p className="text-[11px] text-slate-500">
                                        {formatCurrency(item.total)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                              <ScrollText size={22} />
                            </span>
                            <div>
                              <h2 className="text-xl font-bold text-slate-900">Outstanding Report</h2>
                              <p className="text-sm text-slate-500">
                                Students with open balances and their current payment status.
                              </p>
                            </div>
                          </div>
                          <div className="mt-5 space-y-3">
                            {(visibleSummary?.outstandingStudents || []).length ? (
                              visibleSummary.outstandingStudents.map((item) => (
                                <div
                                  key={item.registrationNo}
                                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                >
                                  <div className="flex items-center justify-between gap-4">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">
                                        {item.studentName}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {item.registrationNo} • {item.course}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-slate-900">
                                        {formatCurrency(item.pendingAmount)}
                                      </p>
                                      <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                                          item.status
                                        )}`}
                                      >
                                        {item.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                                No outstanding balances at the moment.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {isStudentView && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-700">
                            <LayoutDashboard size={22} />
                          </span>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900">Student Fee Overview</h2>
                            <p className="text-sm text-slate-600">
                              View your fee summary, receipt history, and payment ledger from one place.
                            </p>
                          </div>
                        </div>
                        <div className="mt-5 grid gap-4 md:grid-cols-4">
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              Total Fee
                            </p>
                            <p className="mt-2 text-2xl font-black text-slate-900">
                              {formatCurrency(student?.totalFee)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              Paid
                            </p>
                            <p className="mt-2 text-2xl font-black text-emerald-900">
                              {formatCurrency(student?.paidAmount)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              Pending
                            </p>
                            <p className="mt-2 text-2xl font-black text-amber-900">
                              {formatCurrency(student?.pendingAmount)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              Receipts
                            </p>
                            <p className="mt-2 text-2xl font-black text-sky-900">
                              {student?.paymentHistory?.length || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.9fr)]">
                      <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(380px,0.85fr)]">
                            {!isStudentView && (
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex flex-col gap-4">
                                {showAdvancedFilters && (
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Institution
                                      </label>
                                      <select
                                        value={selectedInstitution}
                                        onChange={handleInstitutionChange}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                      >
                                        <option value="">Choose Institution</option>
                                        {INSTITUTIONS.map((inst) => (
                                          <option key={inst.id} value={inst.name}>
                                            {inst.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Course
                                      </label>
                                      <select
                                        value={selectedFeeCourse}
                                        onChange={handleFeeCourseChange}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                      >
                                        <option value={ALL_FEE_COURSES}>{ALL_FEE_COURSES}</option>
                                        {(() => {
                                          let coursesToShow = [];
                                          if (selectedInstitution) {
                                            const instObj = INSTITUTIONS.find(inst => inst.name === selectedInstitution);
                                            if (instObj) {
                                              coursesToShow = instObj.courses.map(c => c.name);
                                            }
                                          } else {
                                            const coursesSet = new Set();
                                            INSTITUTIONS.forEach(inst => inst.courses.forEach(c => coursesSet.add(c.name)));
                                            coursesToShow = Array.from(coursesSet);
                                          }
                                          return coursesToShow.map(c => (
                                            <option key={c} value={c}>{getCourseOptionLabel(c)}</option>
                                          ));
                                        })()}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Admission Batch
                                      </label>
                                      <select
                                        value={selectedAdmissionBatch}
                                        onChange={(e) => handleAdmissionBatchChange(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                      >
                                        <option value="">Choose Admission Batch</option>
                                        {admissionBatches.map((batch) => (
                                          <option key={batch} value={batch}>
                                            {batch}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Academic Year
                                      </label>
                                      <select
                                        value={selectedFeeYear}
                                        onChange={handleFeeYearChange}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                      >
                                        <option value={ALL_FEE_YEARS}>Choose Academic Year</option>
                                        {feeYearOptions.filter(y => y !== ALL_FEE_YEARS).map((year) => (
                                          <option key={year} value={year}>
                                            {year}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Course Year
                                      </label>
                                      <select
                                        value={selectedCourseDuration}
                                        onChange={(e) => handleCourseDurationChange(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                      >
                                        <option value="">Choose Course Year</option>
                                        {courseDurationOptions.map((duration) => (
                                          <option key={duration} value={duration}>
                                            {STUDY_YEAR_LABELS[Number(duration) - 1] || `${duration}th Year`}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Status
                                      </label>
                                      <select
                                        value={selectedStudentStatus}
                                        onChange={(e) => handleStudentStatusChange(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                      >
                                        <option value="All">All</option>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Pending">Pending</option>
                                      </select>
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Search Student Name / Reg No
                                  </label>
                                  <div className="relative w-full">
                                    <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-50">
                                      <Search size={17} strokeWidth={1.9} className="shrink-0 text-slate-400" aria-hidden="true" />
                                      <input
                                        value={studentSearchTerm}
                                        onChange={(e) => {
                                          setStudentSearchTerm(e.target.value);
                                          setShowDropdown(true);
                                        }}
                                        onFocus={() => setShowDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                        placeholder="Type name or registration no..."
                                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-[#8192b0]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                        className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                                        title="Toggle Advanced Filters"
                                      >
                                        <SlidersHorizontal size={16} />
                                      </button>
                                    </label>
                                    
                                    {showDropdown && (() => {
                                      const term = studentSearchTerm.trim().toLowerCase();
                                      const searchResults = term
                                        ? filteredStudents.filter(
                                            (item) =>
                                              (item.studentName || item.fullName || "")
                                                .toLowerCase()
                                                .includes(term) ||
                                              (item.registrationNo || "")
                                                .toLowerCase()
                                                .includes(term)
                                          )
                                        : filteredStudents;
                                      const displayResults = searchResults.slice(0, 15);
                                      
                                      if (displayResults.length === 0) return null;
                                      
                                      return (
                                        <div className="absolute left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
                                          {displayResults.map((item) => (
                                            <button
                                              key={item._id}
                                              type="button"
                                              onClick={async () => {
                                                setStudentSearchTerm(item.studentName || item.fullName);
                                                setSelectedRegistrationNo(item.registrationNo);
                                                setShowDropdown(false);
                                                setLoading(true);
                                                try {
                                                  await refreshSelectedStudent(item.registrationNo);
                                                } catch (loadError) {
                                                  setError(loadError.message);
                                                } finally {
                                                  setLoading(false);
                                                }
                                              }}
                                              className="flex w-full flex-col items-start px-4 py-2.5 text-left hover:bg-slate-50 transition"
                                            >
                                              <span className="text-sm font-bold text-slate-900">
                                                {item.studentName || item.fullName}
                                              </span>
                                              <span className="text-xs text-slate-500 mt-0.5">
                                                {item.registrationNo}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Select Student
                                  </label>
                                  <select
                                    value={selectedRegistrationNo}
                                    onChange={handleStudentChange}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                  >
                                    {filteredStudents.length === 0 ? (
                                      <option value="">No students found</option>
                                    ) : null}
                                    {filteredStudents.map((item) => (
                                      <option key={item._id} value={item.registrationNo}>
                                        {item.studentName || item.fullName} - {item.registrationNo}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                                  <UserRound size={22} />
                                </span>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                                    Student Profile
                                  </p>
                                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                                    {student?.studentName || student?.fullName || "Not selected"}
                                  </h2>
                                </div>
                              </div>
                              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Registration No
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {student?.registrationNo || "Not available"}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Admission Number
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {student?.admissionNumber || student?.applicationId || "Not available"}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Roll Number
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {student?.rollNumber || student?.registrationNo || "Not available"}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Institution
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {student?.institution || "Not available"}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Course
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {student?.course || "Not available"}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Admission Batch
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {student?.admissionBatch || "Not available"}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Academic Year
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {student?.academicYear || student?.year || "Not available"}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Current Study Year
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {STUDY_YEAR_LABELS[(Number(student?.currentStudyYear || 1) - 1)] || "First Year"}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Plan
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {student?.feePlan || "Yearly"}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Fee Structure
                                  </p>
                                  <p className="mt-2 break-words text-sm font-semibold text-slate-900">
                                    {student?.feeStructureKey || (student?.activeFeeStructure ? "Active mapped structure" : "Not mapped")}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Status
                                  </p>
                                  <span
                                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                                      student?.outstandingStatus
                                    )}`}
                                  >
                                    {student?.outstandingStatus || "Pending"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Total Fee
                              </p>
                              <p className="mt-3 text-2xl font-black text-slate-900">
                                {formatCurrency(student?.totalFee)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Paid
                              </p>
                              <p className="mt-3 text-2xl font-black text-emerald-900">
                                {formatCurrency(student?.paidAmount)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Pending
                              </p>
                              <p className="mt-3 text-2xl font-black text-slate-900">
                                {formatCurrency(student?.pendingAmount)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Fine
                              </p>
                              <p className="mt-3 text-2xl font-black text-slate-900">
                                {formatCurrency(student?.totalFine)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Scholarship
                              </p>
                              <p className="mt-3 text-2xl font-black text-slate-900">
                                {formatCurrency(student?.scholarshipAmount)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Discount
                              </p>
                              <p className="mt-3 text-2xl font-black text-slate-900">
                                {formatCurrency(student?.totalDiscount)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                              <CreditCard size={22} />
                            </span>
                            <div>
                              <h3 className="text-xl font-bold text-slate-900">Fee Collection</h3>
                              <p className="text-sm text-slate-500">
                                Collect semester or yearly payments using cash, bank, UPI, cheque, QR, or Razorpay.
                              </p>
                            </div>
                          </div>
                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Payment Mode
                              </label>
                              <select
                                value={paymentMethod}
                                onChange={(event) => {
                                  setPaymentMethod(event.target.value);
                                  setShowQr(false);
                                }}
                                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                              >
                                {paymentModes.map((mode) => (
                                  <option key={mode} value={mode}>
                                    {mode}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Payment Amount
                              </label>
                              <div className="flex items-center rounded-2xl border border-slate-300 bg-slate-50 px-3 transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                                <IndianRupee size={16} className="text-slate-400" />
                                <input
                                  type="number"
                                  min="1"
                                  value={paymentAmount}
                                  onChange={(event) => setPaymentAmount(event.target.value)}
                                  disabled={!hasPendingDue}
                                  className="w-full rounded-2xl bg-transparent px-3 py-3 text-sm text-slate-700 outline-none"
                                  placeholder={
                                    hasPendingDue ? "Enter payment amount" : "No pending due"
                                  }
                                />
                              </div>
                              {!hasPendingDue ? (
                                <p className="mt-2 text-xs font-medium text-emerald-700">
                                  Payment already cleared for this student. Confirm payment is disabled.
                                </p>
                              ) : null}
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                UPI ID
                              </label>
                              <input
                                type="text"
                                value={upiId}
                                onChange={(event) => setUpiId(event.target.value)}
                                disabled={!hasPendingDue}
                                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                placeholder="schoolfees@okaxis"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Payee Name
                              </label>
                              <input
                                type="text"
                                value={payeeName}
                                onChange={(event) => setPayeeName(event.target.value)}
                                disabled={!hasPendingDue}
                                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                placeholder="Campus Fee Collection"
                              />
                            </div>
                            {paymentMethod !== "Razorpay Checkout" && (
                              <>
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Transaction Reference
                                  </label>
                                  <input
                                    type="text"
                                    value={transactionId}
                                    onChange={(event) => setTransactionId(event.target.value)}
                                    disabled={!hasPendingDue}
                                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                    placeholder="Optional transaction id"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Note
                                  </label>
                                  <textarea
                                    rows="3"
                                    value={note}
                                    onChange={(event) => setNote(event.target.value)}
                                    disabled={!hasPendingDue}
                                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                    placeholder="Add note, reference, or confirmation details"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            {paymentMethod === "Razorpay Checkout" ? (
                              <button
                                type="button"
                                onClick={handleRazorpayPayment}
                                disabled={submitting || !student || pendingAmount <= 0}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {submitting ? (
                                  <>
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <CreditCard size={16} />
                                    Pay with Razorpay
                                  </>
                                )}
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={handleGenerateQr}
                                  disabled={!hasPendingDue}
                                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                >
                                  <QrCode size={16} />
                                  Generate QR
                                </button>
                                <button
                                  type="button"
                                  onClick={handleManualConfirm}
                                  disabled={submitting || !student || !hasPendingDue}
                                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {submitting ? (
                                    <>
                                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                      Confirming...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 size={16} />
                                      Confirm Payment
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                                <ReceiptText size={22} />
                              </span>
                              <div>
                                <h3 className="text-xl font-bold text-slate-900">Receipt & Documents</h3>
                                <p className="text-sm text-slate-500">
                                  QR payment access, printable receipt, demand letter, and bonafide certificate.
                                </p>
                              </div>
                            </div>
                            {latestReceipt && (
                              <button
                                type="button"
                                onClick={() =>
                                  printReceipt({ payment: latestReceipt, student })
                                }
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                <Printer size={16} />
                                Print Receipt
                              </button>
                            )}
                          </div>
                          {paymentMethod === "Razorpay Checkout" ? (
                            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">
                                Razorpay Checkout
                              </p>
                              <h4 className="mt-2 text-lg font-bold text-slate-900">
                                Online payment
                              </h4>
                              <p className="mt-3 text-sm leading-7 text-slate-600">
                                The system creates a Razorpay order, opens secure checkout, verifies the signature,
                                and generates the receipt automatically.
                              </p>
                              <div className="mt-4 space-y-2 text-sm text-slate-600">
                                <p>
                                  <span className="font-semibold text-slate-900">Student:</span>{" "}
                                  {student?.studentName || student?.fullName}
                                </p>
                                <p>
                                  <span className="font-semibold text-slate-900">Amount:</span>{" "}
                                  {formatCurrency(paymentAmount)}
                                </p>
                                <p>
                                  <span className="font-semibold text-slate-900">Payee:</span>{" "}
                                  {payeeName || "Not set"}
                                </p>
                              </div>
                            </div>
                          ) : showQr && upiPaymentLink ? (
                            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                              <div className="flex justify-center rounded-2xl bg-white p-4">
                                <QRCodeSVG
                                  value={upiPaymentLink}
                                  size={220}
                                  bgColor="#ffffff"
                                  fgColor="#0f172a"
                                  level="M"
                                  includeMargin
                                />
                              </div>
                              <div className="mt-4 space-y-2 text-sm text-slate-600">
                                <p>
                                  <span className="font-semibold text-slate-900">Amount:</span>{" "}
                                  {formatCurrency(paymentAmount)}
                                </p>
                                <p>
                                  <span className="font-semibold text-slate-900">UPI ID:</span>{" "}
                                  {upiId}
                                </p>
                                <p>
                                  <span className="font-semibold text-slate-900">Payee:</span>{" "}
                                  {payeeName}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                              <p className="text-sm leading-7 text-slate-600">
                                Generate a QR code or use another payment flow to begin collection. The latest
                                confirmed receipt will appear here for download.
                              </p>
                            </div>
                          )}
                          <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <button
                              type="button"
                              onClick={() => printLetter({ student, type: "demand" })}
                              disabled={!student}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <ScrollText size={16} />
                              Demand Letter
                            </button>
                            <button
                              type="button"
                              onClick={() => printLetter({ student, type: "bonafide" })}
                              disabled={!student}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <GraduationCap size={16} />
                              Bonafide Certificate
                            </button>
                            <button
                              type="button"
                              onClick={() => printFeeStructure({ student })}
                              disabled={!student}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <BadgeIndianRupee size={16} />
                              Fees Structure
                            </button>
                          </div>
                          {latestReceipt && (
                            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                                    Latest Receipt
                                  </p>
                                  <h4 className="mt-2 text-lg font-bold text-emerald-950">
                                    {latestReceipt.receiptNumber}
                                  </h4>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {canEditReceipts && (
                                    <button
                                      type="button"
                                      onClick={() => handleEditReceipt(latestReceipt)}
                                      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                                    >
                                      <Pencil size={16} />
                                      Edit
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      printReceipt({ payment: latestReceipt, student })
                                    }
                                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                                  >
                                    <Printer size={16} />
                                    Print Receipt
                                  </button>
                                </div>
                              </div>
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl bg-white px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Amount
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {formatCurrency(latestReceipt.amount)}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-white px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Confirmed On
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {formatDate(latestReceipt.paymentDate)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isStudentView && (
                      <div className="space-y-6">
                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                                <Landmark size={22} />
                              </span>
                              <div>
                                <h3 className="text-xl font-bold text-slate-900">Refund Management</h3>
                                <p className="text-sm text-slate-500">
                                  Record refund payments and preserve a clean audit trail.
                                </p>
                              </div>
                            </div>
                            <div className="mt-5 space-y-3">
                              <input
                                type="number"
                                value={refundForm.amount}
                                onChange={(event) =>
                                  setRefundForm((prev) => ({
                                    ...prev,
                                    amount: event.target.value,
                                  }))
                                }
                                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none"
                                placeholder="Refund amount"
                              />
                              <input
                                type="text"
                                value={refundForm.reference}
                                onChange={(event) =>
                                  setRefundForm((prev) => ({
                                    ...prev,
                                    reference: event.target.value,
                                  }))
                                }
                                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none"
                                placeholder="Refund reference"
                              />
                              <textarea
                                rows="3"
                                value={refundForm.reason}
                                onChange={(event) =>
                                  setRefundForm((prev) => ({
                                    ...prev,
                                    reason: event.target.value,
                                  }))
                                }
                                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none"
                                placeholder="Reason for refund"
                              />
                              <button
                                type="button"
                                onClick={handleProcessRefund}
                                disabled={refundSaving || !student}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {refundSaving ? "Processing..." : "Process Refund"}
                              </button>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                  <FileSpreadsheet size={22} />
                                </span>
                                <div>
                                  <h3 className="text-xl font-bold text-slate-900">Reports & Export</h3>
                                  <p className="text-sm text-slate-500">
                                    Daily collection, due, fine, refund, ledger, and certificate exports.
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleDownloadExcel}
                                disabled={!student}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Download size={16} />
                                Download Excel
                              </button>
                            </div>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() =>
                                  downloadCsv(
                                    `daily-collection-report-${selectedFeeYear}.csv`,
                                    visibleReports?.dailyCollection || []
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                <Banknote size={16} />
                                Daily Collection
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  downloadCsv(
                                    `student-ledger-report-${selectedFeeYear}.csv`,
                                    visibleReports?.studentLedger || []
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                <ScrollText size={16} />
                                Student Ledger
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  downloadCsv(
                                    `due-report-${selectedFeeYear}.csv`,
                                    visibleReports?.dueReport || []
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                <AlertCircle size={16} />
                                Due Report
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  downloadCsv(
                                    `refund-report-${selectedFeeYear}.csv`,
                                    visibleReports?.refundReport || []
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                <RefreshCcw size={16} />
                                Refund Report
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  downloadLetterBatchPdf({
                                    students: filteredStudents,
                                    type: "demand",
                                    selectedFeeYear,
                                    selectedFeeCourse,
                                  })
                                }
                                disabled={!visibleStudentCount}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <ScrollText size={16} />
                                Batch Demand Letters
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  downloadLetterBatchPdf({
                                    students: filteredStudents,
                                    type: "bonafide",
                                    selectedFeeYear,
                                    selectedFeeCourse,
                                  })
                                }
                                disabled={!visibleStudentCount}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <GraduationCap size={16} />
                                Batch Bonafide Certificates
                              </button>
                            </div>
                            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-sm font-black text-slate-950">Professional Fee Reports</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Admission batch, institution, course, study-year, outstanding, paid, scholarship, discount, and fine reports.
                              </p>
                              <div className="mt-4 grid gap-3">
                                {managementReports.map((report) => {
                                  const slug = report.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                                  return (
                                    <div key={report.name} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div>
                                        <p className="text-sm font-bold text-slate-900">{report.name}</p>
                                        <p className="text-xs text-slate-500">{report.rows.length} records</p>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() => downloadRowsPdf(`${slug}.pdf`, report.name, report.rows)}
                                          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                                        >
                                          PDF
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => downloadExcelWorkbook(`${slug}.xls`, [{ name: report.name, rows: report.rows }])}
                                          className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
                                        >
                                          Excel
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                    )}

                    <div className="grid gap-6 xl:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">Payment History</h3>
                            <p className="text-sm text-slate-500">
                              Every confirmed payment generates a receipt entry automatically.
                            </p>
                          </div>
                        </div>
                        {student?.paymentHistory?.length ? (
                          <div className="mt-5 overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                  <th className="px-3 py-3 font-semibold">Receipt</th>
                                  <th className="px-3 py-3 font-semibold">Amount</th>
                                  <th className="px-3 py-3 font-semibold">Method</th>
                                  <th className="px-3 py-3 font-semibold">Transaction</th>
                                  <th className="px-3 py-3 font-semibold">Date</th>
                                  <th className="px-3 py-3 font-semibold">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {student.paymentHistory.map((payment) => (
                                  <tr key={payment.receiptNumber} className="border-b border-slate-100">
                                    <td className="px-3 py-3 font-medium text-slate-900">
                                      {payment.receiptNumber}
                                    </td>
                                    <td className="px-3 py-3 text-slate-700">
                                      {formatCurrency(payment.amount)}
                                    </td>
                                    <td className="px-3 py-3 text-slate-700">
                                      {payment.method}
                                    </td>
                                    <td className="px-3 py-3 text-slate-700">
                                      {payment.transactionId}
                                    </td>
                                    <td className="px-3 py-3 text-slate-700">
                                      {formatDate(payment.paymentDate)}
                                    </td>
                                    <td className="px-3 py-3">
                                      <div className="flex flex-wrap gap-2">
                                        {canEditReceipts && (
                                          <button
                                            type="button"
                                            onClick={() => handleEditReceipt(payment)}
                                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
                                          >
                                            <Pencil size={14} />
                                            Edit
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            printReceipt({ payment, student })
                                          }
                                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                        >
                                          <Printer size={14} />
                                          Print Receipt
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                            No payments confirmed yet.
                          </div>
                        )}
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">Student Ledger</h3>
                          <p className="text-sm text-slate-500">
                            Debit, credit, due, discount, fine, and refund movements for the selected student.
                          </p>
                        </div>
                        {student?.ledgerEntries?.length ? (
                          <div className="mt-5 overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                  <th className="px-3 py-3 font-semibold">Entry</th>
                                  <th className="px-3 py-3 font-semibold">Category</th>
                                  <th className="px-3 py-3 font-semibold">Direction</th>
                                  <th className="px-3 py-3 font-semibold">Amount</th>
                                  <th className="px-3 py-3 font-semibold">Balance</th>
                                </tr>
                              </thead>
                              <tbody>
                                {student.ledgerEntries.map((entry) => (
                                  <tr key={entry.entryId} className="border-b border-slate-100">
                                    <td className="px-3 py-3 font-medium text-slate-900">
                                      {entry.title}
                                    </td>
                                    <td className="px-3 py-3 text-slate-700">
                                      {entry.category}
                                    </td>
                                    <td className="px-3 py-3 text-slate-700">
                                      {entry.direction}
                                    </td>
                                    <td className="px-3 py-3 text-slate-700">
                                      {formatCurrency(entry.amount)}
                                    </td>
                                    <td className="px-3 py-3 text-slate-700">
                                      {formatCurrency(entry.balanceAfter)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                            Ledger entries will appear after fee structures or payments are posted.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "fee-structure" && isSuperAdmin && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                            <BadgeIndianRupee size={22} />
                          </span>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700">
                              Home / Fee Management / Student Fee Customization
                            </p>
                            <h2 className="mt-1 text-xl font-bold text-slate-900">
                              Student Fee Structure Customization
                            </h2>
                            <p className="text-sm text-slate-500">
                              Create course-wise and course-year-wise structures, then override fees for one student.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
                            <Plus size={16} />
                            New Fee Structure
                          </button>
                          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
                            <RefreshCcw size={16} />
                            Clone Previous Year
                          </button>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-3 md:grid-cols-4">
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Academic Year
                          </span>
                          <select value={customAcademicYear} onChange={handleFeeYearChange} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800">
                            {feeYearOptions.map((year) => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Course
                          </span>
                          <select value={selectedFeeCourse} onChange={handleFeeCourseChange} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800">
                            {feeCourseOptions.map((course) => (
                              <option key={course} value={course}>{getCourseOptionLabel(course)}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Course Year
                          </span>
                          <select value={selectedCourseDuration} onChange={(event) => handleCourseDurationChange(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800">
                            <option value="">Choose Course Year</option>
                            {courseDurationOptions.map((year) => (
                              <option key={year} value={year}>
                                {STUDY_YEAR_LABELS[year - 1] || `${year}th Year`}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Session
                          </span>
                          <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800" defaultValue="Regular">
                            <option>Regular</option>
                            <option>Supplementary</option>
                            <option>Management</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.82fr)_minmax(420px,1.18fr)_minmax(300px,0.9fr)]">
                      <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <div className="flex items-center gap-3">
                            <Search size={18} className="text-slate-500" />
                            <h3 className="text-base font-black text-slate-950">Student Search</h3>
                          </div>
                          <div className="mt-4 space-y-4">
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-slate-700">Admission No</span>
                              <input value={customProfile.admissionNo} readOnly className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-800" />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-slate-700">Student Name</span>
                              <input value={studentSearchTerm} onChange={(event) => setStudentSearchTerm(event.target.value)} placeholder="Search by name" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800" />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-slate-700">Select Student</span>
                              <select value={selectedRegistrationNo} onChange={handleStudentChange} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800">
                                {filteredStudents.length === 0 ? (
                                  <option value="">No students found - Try clearing filters</option>
                                ) : (
                                  filteredStudents.map((item) => (
                                    <option key={item._id} value={item.registrationNo}>
                                      {item.studentName || item.fullName} - {item.registrationNo}
                                    </option>
                                  ))
                                )}
                              </select>
                            </label>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                              <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-slate-700">Course</span>
                                <select value={selectedFeeCourse} onChange={handleFeeCourseChange} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800">
                                  {feeCourseOptions.map((course) => (
                                    <option key={course} value={course}>{getCourseOptionLabel(course)}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-slate-700">Course Year</span>
                                <select value={selectedCourseDuration} onChange={(event) => handleCourseDurationChange(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800">
                                  <option value="">Choose Course Year</option>
                                  {courseDurationOptions.map((year) => (
                                    <option key={year} value={year}>
                                      {STUDY_YEAR_LABELS[year - 1] || `${year}th Year`}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-slate-700">Section</span>
                                <select value={customProfile.section} disabled className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-800 disabled:cursor-not-allowed">
                                  <option>{customProfile.section}</option>
                                </select>
                              </label>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => {
                                setSelectedInstitution("");
                                setSelectedFeeCourse(ALL_FEE_COURSES);
                                setSelectedFeeYear(ALL_FEE_YEARS);
                                setSelectedAdmissionBatch("");
                                setSelectedCourseDuration("");
                                setSelectedStudentStatus("");
                                setStudentSearchTerm("");
                              }}
                              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Clear All Filters
                            </button>
                            <button type="button" className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
                              Search Student
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                              <UserRound size={22} />
                            </span>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Student Profile</p>
                              <h3 className="text-lg font-black text-slate-950">{customProfile.name}</h3>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3">
                            {[
                              ["Admission No", customProfile.admissionNo],
                              ["Course", customProfile.course],
                              ["Course Year", customProfile.courseYear],
                              ["Category", customProfile.category],
                              ["Scholarship", customProfile.scholarship],
                              ["Status", customProfile.status],
                            ].map(([label, value]) => (
                              <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
                                <span className="text-sm font-bold text-slate-900">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-xl font-black text-slate-950">Student Fee Structure</h3>
                              <p className="text-sm text-slate-500">{customAcademicYear} / {customProfile.course} / {customProfile.courseYear}</p>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                              Student-wise Custom Fee
                            </span>
                          </div>
                          {isSuperAdmin && student?._id && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={handleClearStudentFeeData}
                                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
                              >
                                <Trash2 size={14} />
                                Clear Student Fee Data
                              </button>
                              <button
                                type="button"
                                onClick={handleDeleteStudent}
                                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700"
                              >
                                <Trash2 size={14} />
                                Delete Student
                              </button>
                            </div>
                          )}
                          <div className="mt-5 overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                  <th className="px-3 py-3 font-bold">Fee Head</th>
                                  <th className="px-3 py-3 font-bold">Amount</th>
                                  <th className="px-3 py-3 text-right font-bold">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {customFeeHeads.map((item) => (
                                  <tr key={item.name} className="border-b border-slate-100">
                                    <td className="px-3 py-3 font-semibold text-slate-900">{item.name}</td>
                                    <td className="px-3 py-3 text-slate-700">{formatCurrency(item.amount)}</td>
                                    <td className="px-3 py-3 text-right">
                                      {item.isGroup ? (
                                        <span className="text-xs font-medium text-slate-400">Auto total</span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleEditFeeHead(item)}
                                          className="inline-flex items-center gap-1 rounded-lg border border-sky-200 px-2.5 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-50"
                                        >
                                          <Pencil size={13} /> Edit
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-950 px-5 py-4 text-white">
                            <span className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">Total Fee</span>
                            <span className="text-2xl font-black">{formatCurrency(customFeeTotal)}</span>
                          </div>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h3 className="text-lg font-black text-slate-950">Installment Plan</h3>
                            <div className="mt-4 space-y-3">
                              {STUDENT_CUSTOM_INSTALLMENTS.map((item) => (
                                <div key={item.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-bold text-slate-950">{item.name}</p>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "Paid" ? "bg-emerald-100 text-emerald-700" : item.status === "Due" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"}`}>
                                      {item.status}
                                    </span>
                                  </div>
                                  <div className="mt-3 grid gap-2 text-sm text-slate-700">
                                    <p>Due Date: <strong>{item.dueDate}</strong></p>
                                    <p>Amount: <strong>{formatCurrency(item.amount)}</strong></p>
                                    <p>Paid: <strong>{formatCurrency(item.paid)}</strong></p>
                                    {item.due ? <p>Due: <strong>{formatCurrency(item.due)}</strong></p> : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h3 className="text-lg font-black text-slate-950">Fee Timeline</h3>
                            <div className="mt-4 space-y-3">
                              {STUDENT_CUSTOM_TIMELINE.map((item) => (
                                <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                  <span className="font-semibold text-slate-900">{item.label}</span>
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                    {item.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <div className="flex items-center gap-3">
                            <Percent size={18} className="text-indigo-700" />
                            <h3 className="text-base font-black text-slate-950">Student Fee Customization</h3>
                          </div>
                          <div className="mt-4 space-y-5">
                            <div className="rounded-xl bg-slate-50 p-4">
                              <p className="font-bold text-slate-900">Scholarship</p>
                              <div className="mt-3 grid gap-3">
                                <div className="flex gap-4 text-sm font-semibold text-slate-700">
                                  <label className="inline-flex items-center gap-2"><input type="radio" defaultChecked /> Percentage</label>
                                  <label className="inline-flex items-center gap-2"><input type="radio" /> Fixed</label>
                                </div>
                                <input defaultValue="20" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" />
                                <div className="grid gap-2 text-sm font-semibold text-slate-700">
                                  <label className="inline-flex items-center gap-2"><input type="checkbox" defaultChecked /> Tuition Fee</label>
                                  <label className="inline-flex items-center gap-2"><input type="checkbox" defaultChecked /> Exam Fee</label>
                                  <label className="inline-flex items-center gap-2"><input type="checkbox" /> Hostel</label>
                                  <label className="inline-flex items-center gap-2"><input type="checkbox" /> Bus</label>
                                </div>
                              </div>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-4">
                              <p className="font-bold text-slate-900">Discount</p>
                              <input defaultValue="Merit Scholarship" className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" />
                              <input defaultValue="0" className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" />
                            </div>
                            <div className="rounded-xl bg-slate-50 p-4">
                              <p className="font-bold text-slate-900">Fine</p>
                              <input defaultValue="Late Payment" className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" />
                              <input defaultValue="0" className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" />
                            </div>
                            <div className="rounded-xl bg-slate-50 p-4">
                              <p className="font-bold text-slate-900">Extra Charge</p>
                              <input defaultValue="Convocation Fee" className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" />
                              <div className="mt-3 flex gap-2">
                                <input defaultValue="0" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" />
                                <button type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Add</button>
                              </div>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 px-5 py-4">
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Net Payable</p>
                              <p className="mt-2 text-3xl font-black text-emerald-950">{formatCurrency(customNetPayable)}</p>
                            </div>
                            <button type="button" className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[minmax(420px,1.1fr)_minmax(300px,0.9fr)_minmax(280px,0.8fr)]">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-lg font-black text-slate-950">Student Fee Ledger</h3>
                        <div className="mt-4 overflow-x-auto">
                          <table className="min-w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500">
                                <th className="px-3 py-3 font-bold">Date</th>
                                <th className="px-3 py-3 font-bold">Description</th>
                                <th className="px-3 py-3 font-bold">Debit</th>
                                <th className="px-3 py-3 font-bold">Credit</th>
                                <th className="px-3 py-3 font-bold">Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {STUDENT_CUSTOM_LEDGER.map((entry) => (
                                <tr key={`${entry.date}-${entry.description}`} className="border-b border-slate-100">
                                  <td className="px-3 py-3 text-slate-700">{entry.date}</td>
                                  <td className="px-3 py-3 font-semibold text-slate-900">{entry.description}</td>
                                  <td className="px-3 py-3 text-slate-700">{formatCurrency(entry.debit)}</td>
                                  <td className="px-3 py-3 text-slate-700">{formatCurrency(entry.credit)}</td>
                                  <td className="px-3 py-3 text-slate-700">{formatCurrency(entry.balance)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-lg font-black text-slate-950">Payment Summary</h3>
                        <div className="mt-4 space-y-3">
                          {[
                            ["Total Fee", customFeeTotal],
                            ["Scholarship", -scholarshipAmount],
                            ["Discount", -customDiscount],
                            ["Fine", customFine],
                            ["Extra Charges", customExtraCharge],
                            ["Paid", customPaid],
                            ["Remaining", customRemaining],
                          ].map(([label, amount]) => (
                            <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                              <span className="text-sm font-semibold text-slate-700">{label}</span>
                              <span className={`text-sm font-black ${amount < 0 ? "text-emerald-700" : label === "Remaining" ? "text-rose-700" : "text-slate-950"}`}>
                                {amount < 0 ? "-" : amount > 0 && ["Fine", "Extra Charges"].includes(label) ? "+" : ""}{formatCurrency(Math.abs(amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-lg font-black text-slate-950">Quick Actions</h3>
                        <div className="mt-4 grid gap-2">
                          {STUDENT_CUSTOM_ACTIONS.map((action) => (
                            <button key={action} type="button" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                              <span>{action}</span>
                              {action.includes("PDF") || action.includes("Download") ? <Download size={15} /> : <ReceiptText size={15} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.9fr)_minmax(420px,1.1fr)]">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-lg font-black text-slate-950">Super Admin Controls</h3>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {SUPER_ADMIN_FEE_CONTROLS.map((control) => (
                            <label key={control} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800">
                              <input type="checkbox" defaultChecked />
                              {control}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center gap-3">
                          <FileSpreadsheet size={18} className="text-slate-600" />
                          <h3 className="text-lg font-black text-slate-950">Fee Breakdown Chart</h3>
                        </div>
                        <div className="mt-5 space-y-4">
                          {FEE_BREAKDOWN_CHART.map((item) => (
                            <div key={item.label} className="grid grid-cols-[86px_minmax(0,1fr)_92px] items-center gap-3">
                              <span className="text-sm font-bold text-slate-700">{item.label}</span>
                              <div className="h-3 rounded-full bg-slate-100">
                                <div className={`h-3 rounded-full ${item.tone}`} style={{ width: `${Math.max((item.value / 45000) * 100, 8)}%` }} />
                              </div>
                              <span className="text-right text-sm font-black text-slate-950">{formatCurrency(item.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "admission-batches" && isSuperAdmin && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                        <Calendar size={22} />
                      </span>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Admission Batch Management</h2>
                        <p className="text-sm text-slate-500">
                          Create and manage admission batches (e.g., 2021-2025, 2022-2026). Each batch preserves its own fee structure.
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Add New Batch</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newBatchName}
                            onChange={(e) => setNewBatchName(e.target.value)}
                            className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                            placeholder="e.g., 2026-2030"
                          />
                          <button
                            onClick={handleAddAdmissionBatch}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-950">All Admission Batches</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {admissionBatches.map((batch) => (
                          <div key={batch} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <p className="font-semibold text-slate-900">{batch}</p>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteAdmissionBatch(batch)}
                                className="rounded-lg border border-rose-200 p-2 text-rose-700 transition hover:bg-rose-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "academic-years" && isSuperAdmin && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                        <Calendar size={22} />
                      </span>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Academic Year Management</h2>
                        <p className="text-sm text-slate-500">
                          Create and manage academic years (e.g., 2024-2025, 2025-2026).
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Add New Academic Year</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newAcademicYear}
                            onChange={(e) => setNewAcademicYear(e.target.value)}
                            className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                            placeholder="e.g., 2026-2027"
                          />
                          <button
                            onClick={handleAddAcademicYear}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-950">All Academic Years</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {academicYears.map((year) => (
                          <div key={year} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <p className="font-semibold text-slate-900">{year}</p>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteAcademicYear(year)}
                                className="rounded-lg border border-rose-200 p-2 text-rose-700 transition hover:bg-rose-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "institutions" && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                        <Building2 size={22} />
                      </span>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Institution Management</h2>
                        <p className="text-sm text-slate-500">
                          View and manage institutions with their respective courses and fee structures.
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-4">
                      {INSTITUTIONS.map((institution) => (
                        <div key={institution.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                                <Building2 size={18} />
                              </span>
                              <div>
                                <p className="font-bold text-slate-900">{institution.name}</p>
                                <p className="text-xs text-slate-500">{institution.courses.length} courses</p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                            {institution.courses.map((course) => (
                              <div key={course.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <GraduationCap size={16} className="text-slate-500" />
                                  <div>
                                    <p className="font-semibold text-slate-900">{course.name}</p>
                                    <p className="text-xs text-slate-500">{course.durationYears} Years</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black text-slate-950">Edit Fee Head</h3>
            <p className="mt-1 text-sm text-slate-500">Update the amount for {editingFeeHead?.name}</p>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-slate-900">Amount (₹)</label>
              <input
                type="number"
                value={editFeeAmount}
                onChange={(e) => setEditFeeAmount(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                placeholder="Enter amount"
                min="0"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFeeHead}
                className="flex-1 rounded-xl bg-sky-600 px-4 py-3 font-bold text-white transition hover:bg-sky-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {editingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-950">Edit Receipt</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Update receipt details for {editingReceipt.receiptNumber}
                </p>
              </div>
              <ReceiptText className="text-emerald-700" size={24} />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-900">Receipt Number</span>
                <input
                  name="receiptNumber"
                  value={receiptForm.receiptNumber}
                  onChange={handleReceiptFormChange}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Receipt number"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-900">Amount</span>
                <input
                  name="amount"
                  type="number"
                  min="1"
                  value={receiptForm.amount}
                  onChange={handleReceiptFormChange}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Amount"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-900">Payment Method</span>
                <select
                  name="method"
                  value={receiptForm.method}
                  onChange={handleReceiptFormChange}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {paymentModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-900">Confirmed On</span>
                <input
                  name="paymentDate"
                  type="datetime-local"
                  value={receiptForm.paymentDate}
                  onChange={handleReceiptFormChange}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-slate-900">Transaction ID</span>
                <input
                  name="transactionId"
                  value={receiptForm.transactionId}
                  onChange={handleReceiptFormChange}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Transaction ID"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-slate-900">Note</span>
                <textarea
                  name="note"
                  value={receiptForm.note}
                  onChange={handleReceiptFormChange}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Receipt note"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleCloseReceiptModal}
                disabled={receiptSaving}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReceipt}
                disabled={receiptSaving}
                className="flex-1 rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {receiptSaving ? "Saving..." : "Save Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Fee;
