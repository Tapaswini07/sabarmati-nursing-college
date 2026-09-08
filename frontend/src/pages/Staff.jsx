import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  BadgeIndianRupee,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  CreditCard,
  Download,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  Filter,
  IdCard,
  Landmark,
  Layers3,
  Mail,
  MapPin,
  NotebookText,
  Phone,
  PieChart,
  Printer,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  TimerReset,
  TrendingUp,
  Upload,
  UserCheck,
  UserPlus,
  UserRound,
  UserX,
  Users,
  Wallet,
} from "lucide-react";
import Logo from "../assets/Logo.png";
import { apiRequest } from "../config/api";
import { getStoredUser } from "../utils/auth";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const PROFILE_STORAGE_KEY = "staff-management-profile-meta-v1";
const ACTIVITY_STORAGE_KEY = "staff-management-activity-v1";
const LETTERHEAD_BACKGROUNDS = {
  college: `${import.meta.env.BASE_URL}college-letter-head.jpg`,
  school: `${import.meta.env.BASE_URL}school-letter-head.jpg`,
};

const staffTabs = [
  { id: "dashboard", label: "Dashboard", icon: ShieldCheck },
  { id: "registration", label: "Staff Registration", icon: UserPlus },
  { id: "profiles", label: "Profiles", icon: Users },
  { id: "attendance", label: "Attendance", icon: CheckSquare },
  { id: "leave", label: "Leave", icon: CalendarDays },
  { id: "payroll", label: "Payroll", icon: BadgeIndianRupee },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "idcards", label: "ID Cards", icon: IdCard },
  { id: "reports", label: "Reports", icon: FileBarChart2 },
];

const emptyRegistrationForm = {
  staffType: "College Staff",
  staffName: "",
  employeeId: "",
  department: "",
  designation: "",
  qualification: "",
  experience: "",
  phone: "",
  email: "",
  address: "",
  joiningDate: "",
  salary: "",
  staffStatus: "Active",
  paymentMode: "Bank Transfer",
  bank: "",
  accountNo: "",
};

const fallbackAttendanceSummary = {
  averageAttendance: 0,
  totalPresentDays: 0,
  totalAbsentDays: 0,
  totalLeaveDays: 0,
};

const fallbackCompliance = {
  pfEmployeePercent: 12,
  pfEmployerPercent: 12,
  esiEmployeePercent: 0.75,
  esiEmployerPercent: 3.25,
  tdsRule: "Applied by salary band and annualized taxable income",
};

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatRupees(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function numberToWords(value) {
  const number = Math.floor(Number(value || 0));
  if (number === 0) {
    return "Zero";
  }

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

  const underHundred = (amount) =>
    amount < 20 ? ones[amount] : `${tens[Math.floor(amount / 10)]}${amount % 10 ? ` ${ones[amount % 10]}` : ""}`;

  const underThousand = (amount) => {
    const hundred = Math.floor(amount / 100);
    const remainder = amount % 100;
    return `${hundred ? `${ones[hundred]} Hundred` : ""}${hundred && remainder ? " " : ""}${
      remainder ? underHundred(remainder) : ""
    }`.trim();
  };

  const parts = [
    [Math.floor(number / 10000000), "Crore"],
    [Math.floor((number % 10000000) / 100000), "Lakh"],
    [Math.floor((number % 100000) / 1000), "Thousand"],
    [number % 1000, ""],
  ];

  return parts
    .filter(([amount]) => amount)
    .map(([amount, label]) => `${underThousand(amount)} ${label}`.trim())
    .join(" ");
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function getWrappedTextHeight(doc, text, maxWidth, lineHeight) {
  return doc.splitTextToSize(text, maxWidth).length * lineHeight;
}

function getAppointmentAddressBlock(employee) {
  const addressParts = String(employee.address || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    guardian: employee.guardianName || employee.fatherName || employee.parentName || "Not added",
    at: employee.at || employee.village || addressParts[0] || "Not added",
    po: employee.po || employee.postOffice || addressParts[1] || addressParts[0] || "Not added",
    district: employee.district || employee.dist || addressParts[2] || "Not added",
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
          return `"${String(value).replaceAll('"', '""')}"`;
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

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function isSchoolStaff(staffType) {
  return String(staffType || "").toLowerCase().includes("school");
}

async function addAppointmentLetterheadBackground(doc, staffType) {
  const backgroundUrl = isSchoolStaff(staffType) ? LETTERHEAD_BACKGROUNDS.school : LETTERHEAD_BACKGROUNDS.college;

  try {
    const background = await loadImage(backgroundUrl);
    doc.addImage(background, "JPEG", 0, 0, 210, 297);
  } catch {
    // Continue with a plain page if the letterhead asset cannot be loaded.
  }
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readJsonStorage(key, fallbackValue) {
  if (typeof window === "undefined") {
    return fallbackValue;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function inferStaffStatus(payrollStatus, leaveMap, employeeId) {
  if (leaveMap.get(employeeId)?.status === "Approved") {
    return "On Leave";
  }
  if (payrollStatus === "On Hold") {
    return "Inactive";
  }
  return "Active";
}

function normalizeProfileMeta(meta = {}) {
  return {
    staffType: meta.staffType || "College Staff",
    qualification: meta.qualification || "",
    experience: meta.experience || "",
    phone: meta.phone || "",
    email: meta.email || "",
    address: meta.address || "",
    joiningDate: meta.joiningDate || "",
    staffStatus: meta.staffStatus || "",
    photoName: meta.photoName || "",
    photoDataUrl: meta.photoDataUrl || "",
    documents: Array.isArray(meta.documents) ? meta.documents : [],
  };
}

async function printPayslip(employee) {
  const printWindow = window.open("", "_blank");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const schoolStaff = isSchoolStaff(employee.staffType);
  const institution = schoolStaff ? "Sabarmati School of Nursing" : "Sabarmati College of Nursing";
  const filenamePrefix = schoolStaff ? "school" : "college";
  const grossSalary = Number(employee.grossSalary || 0);
  const allowances = Number(employee.allowances || 0);
  const overtime = Number(employee.overtime || 0);
  const bonus = Number(employee.bonus || 0);
  const deductions = Number(employee.deductions || 0);
  const pf = Number(employee.pf || 0);
  const esi = Number(employee.esi || 0);
  const tax = Number(employee.tax || 0);
  const advance = Number(employee.advance || 0);
  const basicPay = Math.max(grossSalary - allowances - overtime - bonus, 0);
  const otherDeductions = Math.max(deductions - pf - esi - tax - advance, 0);
  const netSalary = Number(employee.netSalary || grossSalary + allowances + overtime + bonus - deductions);
  const amount = (value) => `Rs. ${formatRupees(value)}`;

  await addAppointmentLetterheadBackground(doc, employee.staffType);

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SALARY STATEMENT", 105, 70, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Signature of employee: __________________________", 192, 78, { align: "right" });

  const certificate = `This is to certify that ${employee.name || "the employee"}, Staff ID ${employee.id || "-"}, ` +
    `is a permanent employee of ${institution}. The following is the salary statement for ${employee.salaryMonth || "the current month"}.`;
  const certificateLines = doc.splitTextToSize(certificate, 174);
  doc.text(certificateLines, 18, 91);

  const drawSalaryTable = (x, y, width, title, rows, totalLabel, total) => {
    const titleHeight = 6;
    const rowHeight = 6.3;
    const totalHeight = 9;
    const height = titleHeight + rows.length * rowHeight + totalHeight;
    const divider = x + width * 0.61;

    doc.setDrawColor(45, 45, 45);
    doc.setLineWidth(0.35);
    doc.rect(x, y, width, height);
    doc.line(x, y + titleHeight, x + width, y + titleHeight);
    doc.line(divider, y + titleHeight, divider, y + height);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(title, x + width / 2, y + 4.2, { align: "center" });

    rows.forEach(([label, value], index) => {
      const rowY = y + titleHeight + rowHeight * (index + 1);
      doc.line(x, rowY, x + width, rowY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(label, x + 2, rowY - 2);
      doc.text(amount(value), x + width - 2, rowY - 2, { align: "right" });
    });

    const totalY = y + titleHeight + rows.length * rowHeight;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.4);
    doc.text(totalLabel, divider - 2, totalY + 6, { align: "right" });
    doc.text(amount(total), x + width - 2, totalY + 6, { align: "right" });
  };

  const tableY = 113;
  drawSalaryTable(18, tableY, 82, "GROSS SALARY (Rs.)", [
    ["Basic Pay", basicPay],
    ["Allowances", allowances],
    ["Overtime", overtime],
    ["Bonus", bonus],
    ["Other Earnings", 0],
  ], "Gross Salary (1)", grossSalary);
  drawSalaryTable(110, tableY, 82, "DEDUCTIONS (Rs.)", [
    ["EPF", pf],
    ["Insurance / ESI", esi],
    ["TDS", tax],
    ["Advance", advance],
    ["Others", otherDeductions],
  ], "Total Deduction (2)", deductions);

  const netY = 168;
  doc.setDrawColor(45, 45, 45);
  doc.rect(56, netY, 98, 10);
  doc.line(121, netY, 121, netY + 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("NET SALARY (1-2)", 118, netY + 6.5, { align: "right" });
  doc.text(amount(netSalary), 151, netY + 6.5, { align: "right" });

  doc.setFontSize(8.5);
  doc.text(`(Net Salary Rupees: ${numberToWords(netSalary)} only)`, 18, 185);
  const details = [
    ["Date of joining in the present employment", formatDate(employee.joiningDate)],
    ["Present designation", employee.designation || "-"],
    ["Department", employee.department || "-"],
    ["Payment mode", employee.paymentMode || "-"],
  ];
  details.forEach(([label, value], index) => {
    const y = 197 + index * 9;
    doc.setFont("helvetica", "normal");
    doc.text(label, 18, y);
    doc.text(":", 99, y);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), 103, y);
  });

  doc.setFont("helvetica", "normal");
  doc.text("This salary statement is issued for official records.", 18, 236);
  doc.line(18, 252, 89, 252);
  doc.line(132, 252, 192, 252);
  doc.setFont("helvetica", "bold");
  doc.text("Prepared by Payroll & Accounts", 18, 258);
  doc.text("Authorised Signatory", 192, 258, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Place: Cuttack`, 18, 270);
  doc.text(`Date: ${formatDate(employee.paidDate)}`, 18, 277);
  doc.text("Office Stamp", 192, 270, { align: "right" });
  doc.setFontSize(7.5);
  doc.text("Computer-generated salary statement", 105, 289, { align: "center" });
  doc.autoPrint();
  const payslipUrl = doc.output("bloburl");
  if (!printWindow) return;
  printWindow.addEventListener("load", () => { printWindow.focus(); printWindow.print(); }, { once: true });
  printWindow.location.href = payslipUrl;
}

async function downloadAppointmentLetterPdf(employee) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const schoolStaff = isSchoolStaff(employee.staffType);
  const institution = schoolStaff ? "Sabarmati School of Nursing" : "Sabarmati College of Nursing";
  const refPrefix = schoolStaff ? "SSN" : "SCN";
  const salary = Number(employee.grossSalary || employee.netSalary || 0);
  const appointmentDate = employee.joiningDate || new Date().toISOString();
  const addressBlock = getAppointmentAddressBlock(employee);
  const pageWidth = 210;
  const contentLeft = 18;
  const contentRight = 194;
  const titleY = 76;

  await addAppointmentLetterheadBackground(doc, employee.staffType);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(`Ref: ${refPrefix}/${new Date().getFullYear()}/${employee.id}`, contentLeft, titleY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.text("APPOINTMENT LETTER", pageWidth / 2, titleY, { align: "center" });
  doc.line(86, titleY + 1.5, 124, titleY + 1.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("TO", contentLeft, 90);
  doc.setFont("helvetica", "bold");
  doc.text(`Ms.: ${employee.name}`, contentLeft, 102);
  doc.text(`D/O: ${addressBlock.guardian}`, contentLeft, 109);
  doc.text(`AT  : ${addressBlock.at}`, contentLeft, 116);
  doc.text(`PO  : ${addressBlock.po}`, contentLeft, 123);
  doc.text(`DIST: ${addressBlock.district}`, contentLeft, 130);

  doc.setFont("helvetica", "normal");
  doc.text("Madam,", 22, 151);

  const bodyStartY = 164;
  const bodyLineHeight = 6.2;
  const bulletGap = 3.2;
  const signatureY = 252;
  const maxBodyBottomY = signatureY - 14;
  const bodyMaxWidth = contentRight - 30;
  const bulletMaxWidth = contentRight - 38;
  const introText = `You are hereby appointed on Date ${formatDate(appointmentDate)} as ${employee.designation} of ${institution}, Mahanadivihar, Cuttack with following terms and conditions.`;
  const bullets = [
    `A consolidated salary of Rs.${formatRupees(salary)}/- (${numberToWords(salary)} Rupees Only) per month.`,
    "A copy of PAN card, Aadhaar card with two passport size photos is to be submitted in the office.",
    "An undertaking is to be furnished by you to the effect that you are not serving any other institution.",
    "If your qualification or related documents submitted by you are not accepted by the concerned authority, you will be accountable for the lapse.",
    "If employee desires to leave the institution, the notice period of 2 months should be served.",
  ];

  doc.setFontSize(12.5);
  let requiredBodyHeight =
    getWrappedTextHeight(doc, introText, bodyMaxWidth, bodyLineHeight) +
    10 +
    bullets.reduce(
      (total, item) => total + Math.max(getWrappedTextHeight(doc, item, bulletMaxWidth, bodyLineHeight), bodyLineHeight) + bulletGap,
      0
    );

  if (bodyStartY + requiredBodyHeight > maxBodyBottomY) {
    doc.setFontSize(11.5);
    requiredBodyHeight =
      getWrappedTextHeight(doc, introText, bodyMaxWidth, 5.8) +
      8 +
      bullets.reduce(
        (total, item) => total + Math.max(getWrappedTextHeight(doc, item, bulletMaxWidth, 5.8), 5.8) + 2.6,
        0
      );
  }

  const activeLineHeight = bodyStartY + requiredBodyHeight > maxBodyBottomY ? 5.4 : doc.getFontSize() === 11.5 ? 5.8 : bodyLineHeight;
  const activeBulletGap = doc.getFontSize() === 11.5 ? 2.6 : bulletGap;
  let y = addWrappedText(
    doc,
    introText,
    30,
    bodyStartY,
    bodyMaxWidth,
    activeLineHeight
  );

  y += doc.getFontSize() === 11.5 ? 8 : 10;
  bullets.forEach((item) => {
    doc.text("-", 30, y);
    y = addWrappedText(doc, item, 38, y, bulletMaxWidth, activeLineHeight) + activeBulletGap;
  });

  const signatureCenterX = 150;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Principal", signatureCenterX, signatureY, { align: "center" });
  doc.text(`(${institution})`, signatureCenterX, signatureY + 11, { align: "center" });

  doc.save(`${employee.id}-appointment-letter.pdf`);
}

async function downloadIdCardPdf(employee) {
  const staffType = employee.staffType || "College Staff";
  const cardTitle = `${staffType.toUpperCase()} ID CARD`;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [54, 86],
  });

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(0, 0, 86, 54, 4, 4, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(3, 3, 80, 48, 3, 3, "F");

  try {
    const logoImage = await loadImage(Logo);
    doc.addImage(logoImage, "PNG", 6, 6, 10, 10);
  } catch {
    // Continue without logo if asset loading fails.
  }

  if (employee.photoDataUrl) {
    try {
      doc.addImage(employee.photoDataUrl, "JPEG", 60, 9, 16, 18);
    } catch {
      // Ignore photo rendering issue and continue.
    }
  }

  doc.setTextColor(29, 78, 216);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(cardTitle, 19, 11);
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(6.5);
  doc.text("Institution Staff Management Office", 19, 15);

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(employee.name, 6, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(employee.designation, 6, 29);
  doc.text(`Employee ID: ${employee.id}`, 6, 34);
  doc.text(`Type: ${staffType}`, 6, 39);
  doc.text(`Department: ${employee.department}`, 6, 44);
  doc.text(`Issued: ${formatDate(new Date().toISOString())}`, 6, 48);

  doc.save(`${employee.id}-${staffType.toLowerCase().replace(/\s+/g, "-")}-id-card.pdf`);
}

function Staff() {
  const currentUser = getStoredUser();
  const reviewerName = currentUser?.name || currentUser?.email || "Admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    staffTabs.some((tab) => tab.id === initialTab) ? initialTab : "dashboard"
  );
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [salaryMonth, setSalaryMonth] = useState("May 2026");
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [availableMonths, setAvailableMonths] = useState(["May 2026"]);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(fallbackAttendanceSummary);
  const [departmentAnalytics, setDepartmentAnalytics] = useState([]);
  const [complianceSettings, setComplianceSettings] = useState(fallbackCompliance);
  const [actionId, setActionId] = useState("");
  const [leaveSummary, setLeaveSummary] = useState({
    totalLeaves: 0,
    approvedLeaves: 0,
    pendingRequests: 0,
    rejectedLeaves: 0,
  });
  const [leaveRows, setLeaveRows] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [profileMeta, setProfileMeta] = useState(() => readJsonStorage(PROFILE_STORAGE_KEY, {}));
  const [activityLog, setActivityLog] = useState(() => readJsonStorage(ACTIVITY_STORAGE_KEY, []));
  const [registrationForm, setRegistrationForm] = useState(emptyRegistrationForm);
  const [registrationPhoto, setRegistrationPhoto] = useState(null);
  const [registrationDocuments, setRegistrationDocuments] = useState([]);
  const [registrationLoading, setRegistrationLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileMeta));
    }
  }, [profileMeta]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activityLog.slice(0, 20)));
    }
  }, [activityLog]);

  const appendActivity = (message) => {
    const item = { message, createdAt: new Date().toISOString() };
    setActivityLog((current) => [item, ...current].slice(0, 20));
  };

  const fetchDashboard = async () => {
    const [payrollResponse, leaveResponse] = await Promise.all([
      apiRequest("/api/staff/payroll-dashboard"),
      apiRequest("/api/leaves").catch(() => null),
    ]);

    const staff = Array.isArray(payrollResponse.staff) ? payrollResponse.staff : [];
    const months =
      Array.isArray(payrollResponse.availableMonths) && payrollResponse.availableMonths.length
        ? payrollResponse.availableMonths
        : ["May 2026"];

    setStaffMembers(staff);
    setAvailableMonths(months);
    setDepartmentAnalytics(
      Array.isArray(payrollResponse.departmentAnalytics) ? payrollResponse.departmentAnalytics : []
    );
    setAttendanceRows(Array.isArray(payrollResponse.attendanceRows) ? payrollResponse.attendanceRows : []);
    setAttendanceSummary(payrollResponse.attendanceSummary || fallbackAttendanceSummary);
    setComplianceSettings(payrollResponse.complianceSettings || fallbackCompliance);
    setSalaryMonth((current) => (months.includes(current) ? current : months[0]));

    if (leaveResponse) {
      setLeaveSummary(leaveResponse.summary || leaveSummary);
      setLeaveRows(Array.isArray(leaveResponse.leaves) ? leaveResponse.leaves : []);
      setPendingApprovals(
        Array.isArray(leaveResponse.pendingApprovals) ? leaveResponse.pendingApprovals : []
      );
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadModule = async () => {
      setLoading(true);
      setError("");

      try {
        await fetchDashboard();
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message);
          setStaffMembers([]);
          setAttendanceRows([]);
          setDepartmentAnalytics([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadModule();

    return () => {
      ignore = true;
    };
  }, []);

  const leaveMap = useMemo(() => {
    const approvedLeaves = new Map();
    leaveRows.forEach((leave) => {
      if (leave.status === "Approved" && leave.employeeId) {
        approvedLeaves.set(leave.employeeId, leave);
      }
    });
    return approvedLeaves;
  }, [leaveRows]);

  const enrichedStaff = useMemo(() => {
    return staffMembers.map((employee) => {
      const meta = normalizeProfileMeta({
        ...employee,
        ...(profileMeta[employee.id] || profileMeta[employee.employeeId] || {}),
      });
      const inferredStatus = inferStaffStatus(employee.status, leaveMap, employee.employeeId || employee.id);

      return {
        ...employee,
        staffType: meta.staffType,
        qualification: meta.qualification,
        experience: meta.experience,
        phone: meta.phone,
        email: meta.email,
        address: meta.address,
        joiningDate: meta.joiningDate,
        staffStatus: meta.staffStatus || inferredStatus,
        photoName: meta.photoName,
        photoDataUrl: meta.photoDataUrl,
        documents: meta.documents,
      };
    });
  }, [leaveMap, profileMeta, staffMembers]);

  const departmentOptions = useMemo(
    () => ["All", ...new Set(enrichedStaff.map((item) => item.department).filter(Boolean))],
    [enrichedStaff]
  );

  const statusOptions = useMemo(
    () => ["All", ...new Set(enrichedStaff.map((item) => item.staffStatus).filter(Boolean))],
    [enrichedStaff]
  );

  const filteredStaff = useMemo(() => {
    return enrichedStaff.filter((employee) => {
      const matchesSearch =
        search.trim() === "" ||
        [
          employee.id,
          employee.name,
          employee.designation,
          employee.department,
          employee.staffType,
          employee.email,
          employee.phone,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesDepartment =
        departmentFilter === "All" || employee.department === departmentFilter;
      const matchesStatus = statusFilter === "All" || employee.staffStatus === statusFilter;
      const matchesMonth =
        activeTab === "payroll" || activeTab === "attendance" || activeTab === "reports"
          ? employee.salaryMonth === salaryMonth
          : true;

      return matchesSearch && matchesDepartment && matchesStatus && matchesMonth;
    });
  }, [activeTab, departmentFilter, enrichedStaff, salaryMonth, search, statusFilter]);

  const filteredAttendanceRows = useMemo(() => {
    const ids = new Set(filteredStaff.map((item) => item.id));
    return attendanceRows
      .filter((employee) => ids.has(employee.id))
      .map((employee) => {
        const staffMatch = filteredStaff.find((item) => item.id === employee.id);
        return {
          ...employee,
          staffStatus: staffMatch?.staffStatus || "Active",
        };
      });
  }, [attendanceRows, filteredStaff]);

  const selectedEmployee = filteredStaff[0] || enrichedStaff[0] || null;

  const payrollSummary = useMemo(() => {
    return {
      totalStaff: filteredStaff.length,
      activeStaff: filteredStaff.filter((employee) => employee.staffStatus === "Active").length,
      inactiveStaff: filteredStaff.filter((employee) => employee.staffStatus === "Inactive").length,
      onLeaveStaff: filteredStaff.filter((employee) => employee.staffStatus === "On Leave").length,
      totalPayroll: filteredStaff.reduce((sum, employee) => sum + employee.netSalary, 0),
      totalGross: filteredStaff.reduce((sum, employee) => sum + employee.grossSalary, 0),
      totalDeductions: filteredStaff.reduce((sum, employee) => sum + employee.deductions, 0),
      totalBonus: filteredStaff.reduce((sum, employee) => sum + employee.bonus, 0),
      totalPf: filteredStaff.reduce((sum, employee) => sum + Number(employee.pf || 0), 0),
      totalEsi: filteredStaff.reduce((sum, employee) => sum + Number(employee.esi || 0), 0),
      totalTds: filteredStaff.reduce((sum, employee) => sum + Number(employee.tax || 0), 0),
      processed: filteredStaff.filter((employee) => employee.status === "Processed").length,
      pending: filteredStaff.filter((employee) => employee.status === "Pending").length,
      onHold: filteredStaff.filter((employee) => employee.status === "On Hold").length,
    };
  }, [filteredStaff]);

  const reportExports = useMemo(() => {
    return {
      payroll: filteredStaff.map((employee) => ({
        employeeId: employee.id,
        staffType: employee.staffType,
        staffName: employee.name,
        department: employee.department,
        designation: employee.designation,
        staffStatus: employee.staffStatus,
        grossSalary: employee.grossSalary,
        deductions: employee.deductions,
        netSalary: employee.netSalary,
        salaryMonth: employee.salaryMonth,
        paymentMode: employee.paymentMode,
      })),
      attendance: filteredAttendanceRows.map((employee) => ({
        employeeId: employee.id,
        staffName: employee.name,
        department: employee.department,
        presentDays: employee.presentDays,
        leaveDays: employee.leaveDays,
        absentDays: employee.absentDays,
        attendancePct: employee.attendancePct,
        attendanceAdjustedNet: employee.attendanceAdjustedNet,
      })),
      leave: leaveRows.map((leave) => ({
        employeeName: leave.employeeName,
        employeeId: leave.employeeId,
        department: leave.department,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days: leave.days,
        status: leave.status,
      })),
      staffDirectory: filteredStaff.map((employee) => ({
        employeeId: employee.id,
        staffName: employee.name,
        department: employee.department,
        designation: employee.designation,
        qualification: employee.qualification,
        experience: employee.experience,
        phone: employee.phone,
        email: employee.email,
        joiningDate: employee.joiningDate,
        staffStatus: employee.staffStatus,
        staffType: employee.staffType,
      })),
      salary: filteredStaff.map((employee) => ({
        employeeId: employee.id,
        staffName: employee.name,
        grossSalary: employee.grossSalary,
        allowances: employee.allowances,
        overtime: employee.overtime,
        deductions: employee.deductions,
        bonus: employee.bonus,
        pf: employee.pf,
        esi: employee.esi,
        tds: employee.tax,
        netSalary: employee.netSalary,
      })),
    };
  }, [filteredAttendanceRows, filteredStaff, leaveRows]);

  const documentLibrary = useMemo(() => {
    return filteredStaff.flatMap((employee) =>
      employee.documents.map((document, index) => ({
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        documentName: document.name,
        documentType: document.type || "Supporting Document",
        sizeLabel: document.sizeLabel || "",
        key: `${employee.id}-${index}-${document.name}`,
      }))
    );
  }, [filteredStaff]);

  const filteredDepartmentAnalytics = useMemo(() => {
    return departmentAnalytics.filter((item) =>
      departmentFilter === "All" ? true : item.department === departmentFilter
    );
  }, [departmentAnalytics, departmentFilter]);

  const maxDepartmentPayout = Math.max(
    ...filteredDepartmentAnalytics.map((item) => item.payout),
    1
  );

  const changeTab = (tabId) => {
    setActiveTab(tabId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tabId);
    setSearchParams(nextParams);
  };

  const refreshDashboard = async () => {
    setError("");
    try {
      await fetchDashboard();
    } catch (refreshError) {
      setError(refreshError.message);
    }
  };

  const handleStatusUpdate = async (employeeId, status) => {
    setActionId(`${employeeId}-${status}`);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/staff/${employeeId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          approvedBy: "Payroll Admin",
          approvalNote:
            status === "Processed"
              ? "Approved from salary run control"
              : "Marked for payroll review",
        }),
      });
      appendActivity(`Payroll status updated to ${status} for staff record ${employeeId}.`);
      setSuccess(`Payroll status updated to ${status}.`);
      await refreshDashboard();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setActionId("");
    }
  };

  const handleLeaveAction = async (leaveId, status) => {
    setActionId(`${leaveId}-${status}`);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/leaves/${leaveId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          reviewedBy: reviewerName,
          reviewNote:
            status === "Approved"
              ? "Approved from staff management control center"
              : "Rejected after admin review",
        }),
      });
      appendActivity(`Leave request ${status.toLowerCase()} from staff management workflow.`);
      setSuccess(`Leave request ${status.toLowerCase()} successfully.`);
      await refreshDashboard();
    } catch (leaveError) {
      setError(leaveError.message);
    } finally {
      setActionId("");
    }
  };

  const handleRegistrationChange = (event) => {
    const { name, value } = event.target;
    setRegistrationForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleRegisterStaff = async (event) => {
    event.preventDefault();
    setRegistrationLoading(true);
    setError("");
    setSuccess("");

    try {
      const photoDataUrl = registrationPhoto ? await fileToDataUrl(registrationPhoto) : "";
      const documents = registrationDocuments.map((file) => ({
        name: file.name,
        type: file.type || "Document",
        sizeLabel: `${Math.max(file.size / 1024, 1).toFixed(0)} KB`,
      }));
      const staffPayload = {
        staffType: registrationForm.staffType,
        staffId: registrationForm.employeeId,
        employeeId: registrationForm.employeeId,
        name: registrationForm.staffName,
        designation: registrationForm.designation,
        department: registrationForm.department,
        qualification: registrationForm.qualification,
        experience: registrationForm.experience,
        phone: registrationForm.phone,
        email: registrationForm.email,
        address: registrationForm.address,
        joiningDate: registrationForm.joiningDate,
        staffStatus: registrationForm.staffStatus,
        photoName: registrationPhoto?.name || "",
        photoDataUrl,
        documents,
        paymentMode: registrationForm.paymentMode,
        status: registrationForm.staffStatus === "Inactive" ? "On Hold" : "Pending",
        grossSalary: Number(registrationForm.salary || 0),
        netSalary: Number(registrationForm.salary || 0),
        salaryMonth,
        paidDate: "",
        bank: registrationForm.bank,
        accountNo: registrationForm.accountNo,
      };

      const response = await apiRequest("/api/staff", {
        method: "POST",
        body: JSON.stringify(staffPayload),
      });

      const createdId = response.staff?.id || registrationForm.employeeId;

      setProfileMeta((current) => ({
        ...current,
        [createdId]: {
          staffType: registrationForm.staffType,
          qualification: registrationForm.qualification,
          experience: registrationForm.experience,
          phone: registrationForm.phone,
          email: registrationForm.email,
          address: registrationForm.address,
          joiningDate: registrationForm.joiningDate,
          staffStatus: registrationForm.staffStatus,
          photoName: registrationPhoto?.name || "",
          photoDataUrl,
          documents,
        },
      }));

      appendActivity(`New staff registration created for ${registrationForm.staffName}.`);
      setSuccess("Staff registration saved successfully.");
      setRegistrationForm(emptyRegistrationForm);
      setRegistrationPhoto(null);
      setRegistrationDocuments([]);
      await refreshDashboard();
    } catch (registrationError) {
      setError(registrationError.message);
    } finally {
      setRegistrationLoading(false);
    }
  };

  const complianceCards = [
    {
      title: "PF Contribution",
      value: formatCurrency(payrollSummary.totalPf),
      note: `Employee ${formatPercent(complianceSettings.pfEmployeePercent)}`,
      icon: ShieldCheck,
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "ESI Contribution",
      value: formatCurrency(payrollSummary.totalEsi),
      note: `Employee ${formatPercent(complianceSettings.esiEmployeePercent)}`,
      icon: Layers3,
      iconClass: "bg-sky-100 text-sky-700",
    },
    {
      title: "TDS Deduction",
      value: formatCurrency(payrollSummary.totalTds),
      note: complianceSettings.tdsRule,
      icon: TimerReset,
      iconClass: "bg-amber-100 text-amber-700",
    },
  ];

  const exportDirectorySheet = () => {
    downloadCsv("staff-directory-report.csv", reportExports.staffDirectory);
  };

  const exportPayrollSheet = () => {
    downloadCsv("staff-payroll-sheet.csv", reportExports.payroll);
  };

  const exportAttendanceSheet = () => {
    downloadCsv("staff-attendance-report.csv", reportExports.attendance);
  };

  const exportLeaveSheet = () => {
    downloadCsv("staff-leave-report.csv", reportExports.leave);
  };

  const exportSalarySheet = () => {
    downloadCsv("staff-salary-report.csv", reportExports.salary);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Staff",
            value: payrollSummary.totalStaff,
            note: "Registered across departments",
            icon: Users,
            tone: "bg-blue-100 text-blue-700",
          },
          {
            label: "Active Staff",
            value: payrollSummary.activeStaff,
            note: "Currently working",
            icon: UserCheck,
            tone: "bg-emerald-100 text-emerald-700",
          },
          {
            label: "On Leave",
            value: payrollSummary.onLeaveStaff,
            note: "Approved leave requests",
            icon: CalendarDays,
            tone: "bg-amber-100 text-amber-700",
          },
          {
            label: "Salary Expense",
            value: formatCurrency(payrollSummary.totalPayroll),
            note: "Current cycle net payout",
            icon: Wallet,
            tone: "bg-slate-100 text-slate-800",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{card.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{card.note}</p>
                </div>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone}`}>
                  <Icon size={20} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Department-wise Staff Count</h3>
              <p className="text-sm text-slate-500">Live staffing and salary contribution by department.</p>
            </div>
            <PieChart className="text-blue-600" size={22} />
          </div>

          <div className="mt-5 space-y-4">
            {filteredDepartmentAnalytics.map((item) => (
              <div key={item.department}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{item.department}</span>
                  <span className="text-slate-500">
                    {item.employees} staff • {formatCurrency(item.payout)}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${(item.payout / maxDepartmentPayout) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Activity Logs</h3>
              <p className="text-sm text-slate-500">Approvals, registrations, and payroll actions.</p>
            </div>
            <Activity className="text-blue-600" size={22} />
          </div>

          <div className="mt-5 space-y-3">
            {(activityLog.length ? activityLog : [
              {
                message: "Staff module is ready for registrations, approvals, and payroll processing.",
                createdAt: new Date().toISOString(),
              },
            ]).map((item, index) => (
              <div key={`${item.message}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm text-slate-700">{item.message}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Attendance Analytics</h3>
              <p className="text-sm text-slate-500">Daily attendance impact on staff availability and salary.</p>
            </div>
            <CheckSquare className="text-blue-600" size={22} />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">Average Attendance</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{formatPercent(attendanceSummary.averageAttendance)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">Present Days</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{attendanceSummary.totalPresentDays}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">Leave Days</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{attendanceSummary.totalLeaveDays}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">Absent Days</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{attendanceSummary.totalAbsentDays}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Admin Controls</h3>
              <p className="text-sm text-slate-500">Role-based access, alerts, and workflow settings.</p>
            </div>
            <Settings2 className="text-blue-600" size={22} />
          </div>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Access Control</p>
              <p className="mt-2 text-sm text-slate-700">Roles configured for Super Admin, HR Manager, Finance Head, and Principal.</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Approval Workflow</p>
              <p className="mt-2 text-sm text-slate-700">New staff entries route to payroll setup, leave requests route to HR review, and salary runs require admin validation.</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Notifications</p>
              <p className="mt-2 text-sm text-slate-700">{pendingApprovals.length} leave requests pending approval and {payrollSummary.pending} payroll records awaiting processing.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRegistration = () => (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <form onSubmit={handleRegisterStaff} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Staff Registration</h3>
            <p className="text-sm text-slate-500">Create new staff records with HR, payroll, and document details.</p>
          </div>
          <UserPlus className="text-blue-600" size={22} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Staff Type</span>
            <select
              name="staffType"
              value={registrationForm.staffType}
              onChange={handleRegistrationChange}
              className="w-full bg-transparent text-sm text-slate-900 outline-none"
            >
              <option>College Staff</option>
              <option>School Staff</option>
            </select>
          </label>

          {[
            ["staffName", "Staff Name", "text"],
            ["employeeId", "Employee ID", "text"],
            ["department", "Department", "text"],
            ["designation", "Designation", "text"],
            ["qualification", "Qualification", "text"],
            ["experience", "Experience", "text"],
            ["phone", "Phone Number", "tel"],
            ["email", "Email Address", "email"],
            ["joiningDate", "Date of Joining", "date"],
            ["salary", "Salary", "number"],
            ["bank", "Bank Name", "text"],
            ["accountNo", "Account Number", "text"],
          ].map(([name, label, type]) => (
            <label key={name} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
              <input
                name={name}
                type={type}
                value={registrationForm[name]}
                onChange={handleRegistrationChange}
                className="w-full bg-transparent text-sm text-slate-900 outline-none"
                placeholder={label}
                required={["staffName", "employeeId", "department", "designation", "salary"].includes(name)}
              />
            </label>
          ))}

          <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Staff Status</span>
            <select
              name="staffStatus"
              value={registrationForm.staffStatus}
              onChange={handleRegistrationChange}
              className="w-full bg-transparent text-sm text-slate-900 outline-none"
            >
              <option>Active</option>
              <option>Inactive</option>
              <option>On Leave</option>
            </select>
          </label>

          <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment Mode</span>
            <select
              name="paymentMode"
              value={registrationForm.paymentMode}
              onChange={handleRegistrationChange}
              className="w-full bg-transparent text-sm text-slate-900 outline-none"
            >
              <option>Bank Transfer</option>
              <option>UPI</option>
              <option>Cash</option>
              <option>Cheque</option>
            </select>
          </label>

          <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Address</span>
            <textarea
              name="address"
              value={registrationForm.address}
              onChange={handleRegistrationChange}
              rows="4"
              className="w-full resize-none bg-transparent text-sm text-slate-900 outline-none"
              placeholder="Full address"
            />
          </label>

          <label className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-4">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              <Upload size={14} />
              Upload Photo
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setRegistrationPhoto(event.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700"
            />
            <p className="mt-2 text-xs text-slate-500">{registrationPhoto ? registrationPhoto.name : "Upload passport-size photo"}</p>
          </label>

          <label className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-4">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              <FileText size={14} />
              Upload Documents
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => setRegistrationDocuments(Array.from(event.target.files || []))}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700"
            />
            <p className="mt-2 text-xs text-slate-500">
              {registrationDocuments.length ? `${registrationDocuments.length} documents selected` : "Aadhaar, PAN, qualification, and experience documents"}
            </p>
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">New registrations feed into staff payroll and profile management workflows.</p>
          <button
            type="submit"
            disabled={registrationLoading}
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {registrationLoading ? "Saving..." : "Create Staff Record"}
          </button>
        </div>
      </form>

      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Approval Workflow</h3>
              <p className="text-sm text-slate-500">Recommended process for staff onboarding security.</p>
            </div>
            <ShieldCheck className="text-blue-600" size={22} />
          </div>
          <div className="mt-5 space-y-3">
            {[
              "Step 1: Super Admin registers staff and uploads core documents.",
              "Step 2: HR validates qualification, experience, and identity records.",
              "Step 3: Finance configures salary, PF, ESI, and bank details.",
              "Step 4: Department head activates access and attendance tracking.",
            ].map((step) => (
              <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Multi-department Coverage</h3>
              <p className="text-sm text-slate-500">Current departments available in the staff registry.</p>
            </div>
            <Building2 className="text-blue-600" size={22} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {departmentOptions.filter((item) => item !== "All").map((department) => (
              <span key={department} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {department}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfiles = () => (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Staff Directory</h3>
            <p className="text-sm text-slate-500">Profile management with department, status, and contact information.</p>
          </div>
          <button
            type="button"
            onClick={exportDirectorySheet}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <FileSpreadsheet size={16} />
            Export Excel
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[1080px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-3 py-3 font-semibold">Staff</th>
                <th className="px-3 py-3 font-semibold">Department</th>
                <th className="px-3 py-3 font-semibold">Qualification</th>
                <th className="px-3 py-3 font-semibold">Experience</th>
                <th className="px-3 py-3 font-semibold">Contact</th>
                <th className="px-3 py-3 font-semibold">Joining Date</th>
                <th className="px-3 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((employee) => (
                <tr key={employee.id} className="border-b border-slate-100">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-900">{employee.name}</p>
                    <p className="text-xs text-slate-500">{employee.id} • {employee.designation}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{employee.department}</td>
                  <td className="px-3 py-3 text-slate-700">{employee.qualification || "Not added"}</td>
                  <td className="px-3 py-3 text-slate-700">{employee.experience || "Not added"}</td>
                  <td className="px-3 py-3 text-slate-700">
                    <div>{employee.phone || "No phone"}</div>
                    <div className="text-xs text-slate-500">{employee.email || "No email"}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{formatDate(employee.joiningDate)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        employee.staffStatus === "Active"
                          ? "bg-emerald-100 text-emerald-700"
                          : employee.staffStatus === "On Leave"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {employee.staffStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmployee && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Selected Staff Profile</h3>
              <p className="text-sm text-slate-500">Extended profile information for the current staff selection.</p>
            </div>
            <UserRound className="text-blue-600" size={22} />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Phone</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEmployee.phone || "Not added"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Email</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEmployee.email || "Not added"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Qualification</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEmployee.qualification || "Not added"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Experience</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEmployee.experience || "Not added"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Address</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEmployee.address || "Not added"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Joined On</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(selectedEmployee.joiningDate)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Documents</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEmployee.documents.length} uploaded</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Average Attendance</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{formatPercent(attendanceSummary.averageAttendance)}</p>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Present Days</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{attendanceSummary.totalPresentDays}</p>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Leave Days</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{attendanceSummary.totalLeaveDays}</p>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Absent Days</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{attendanceSummary.totalAbsentDays}</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Daily Attendance Register</h3>
            <p className="text-sm text-slate-500">Present, absent, and leave tracking aligned with salary calculations.</p>
          </div>
          <button
            type="button"
            onClick={exportAttendanceSheet}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <FileSpreadsheet size={16} />
            Export Attendance
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-3 py-3 font-semibold">Staff</th>
                <th className="px-3 py-3 font-semibold">Present</th>
                <th className="px-3 py-3 font-semibold">Leave</th>
                <th className="px-3 py-3 font-semibold">Absent</th>
                <th className="px-3 py-3 font-semibold">Attendance</th>
                <th className="px-3 py-3 font-semibold">Attendance Salary</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendanceRows.map((employee) => (
                <tr key={employee.id} className="border-b border-slate-100">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-900">{employee.name}</p>
                    <p className="text-xs text-slate-500">{employee.department} • {employee.staffStatus}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{employee.presentDays}</td>
                  <td className="px-3 py-3 text-slate-700">{employee.leaveDays}</td>
                  <td className="px-3 py-3 text-slate-700">{employee.absentDays}</td>
                  <td className="px-3 py-3 text-slate-700">{formatPercent(employee.attendancePct)}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{formatCurrency(employee.attendanceAdjustedNet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderLeave = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { title: "Total Requests", value: leaveSummary.totalLeaves, tone: "bg-blue-100 text-blue-700", icon: ClipboardList },
          { title: "Approved", value: leaveSummary.approvedLeaves, tone: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
          { title: "Pending", value: leaveSummary.pendingRequests, tone: "bg-amber-100 text-amber-700", icon: TimerReset },
          { title: "Rejected", value: leaveSummary.rejectedLeaves, tone: "bg-rose-100 text-rose-700", icon: UserX },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{item.title}</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{item.value}</p>
                </div>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                  <Icon size={20} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Leave Approval Queue</h3>
              <p className="text-sm text-slate-500">Approve or reject leave requests from one workspace.</p>
            </div>
            <BellRing className="text-blue-600" size={22} />
          </div>

          <div className="mt-5 space-y-4">
            {pendingApprovals.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No leave approvals are pending.
              </div>
            ) : (
              pendingApprovals.map((request) => (
                <div key={request._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{request.employeeName}</p>
                      <p className="mt-1 text-xs text-slate-500">{request.department} • {request.leaveType}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {formatDate(request.startDate)} to {formatDate(request.endDate)} • {request.days} day(s)
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleLeaveAction(request._id, "Approved")}
                      disabled={actionId === `${request._id}-Approved`}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionId === `${request._id}-Approved` ? "Approving..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLeaveAction(request._id, "Rejected")}
                      disabled={actionId === `${request._id}-Rejected`}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionId === `${request._id}-Rejected` ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Leave History</h3>
              <p className="text-sm text-slate-500">Department-wise leave history and balances.</p>
            </div>
            <button
              type="button"
              onClick={exportLeaveSheet}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <FileSpreadsheet size={16} />
              Export Report
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-3 font-semibold">Staff</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold">Days</th>
                  <th className="px-3 py-3 font-semibold">Dates</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveRows.map((item) => (
                  <tr key={item._id} className="border-b border-slate-100">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-900">{item.employeeName}</p>
                      <p className="text-xs text-slate-500">{item.employeeId} • {item.department}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{item.leaveType}</td>
                    <td className="px-3 py-3 text-slate-700">{item.days}</td>
                    <td className="px-3 py-3 text-slate-700">{formatDate(item.startDate)} to {formatDate(item.endDate)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.status === "Approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "Rejected"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPayroll = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {complianceCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{card.title}</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{card.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{card.note}</p>
                </div>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconClass}`}>
                  <Icon size={20} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Salary Run Control</h3>
            <p className="text-sm text-slate-500">Approve payroll, download payslips, and monitor staff payment history.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportPayrollSheet}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <FileSpreadsheet size={16} />
              Export Payroll
            </button>
            <button
              type="button"
              onClick={exportSalarySheet}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <NotebookText size={16} />
              Salary Report
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredStaff.map((employee) => (
            <div key={employee.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{employee.name}</p>
                  <p className="text-xs text-slate-500">{employee.designation} • {employee.department}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">{employee.status}</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Gross</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(employee.grossSalary)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Net</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(employee.netSalary)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">PF + ESI</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency((employee.pf || 0) + (employee.esi || 0))}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">TDS</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(employee.tax)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(employee._id, "Processed")}
                  disabled={actionId === `${employee._id}-Processed`}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 size={14} />
                  {actionId === `${employee._id}-Processed` ? "Approving..." : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(employee._id, "On Hold")}
                  disabled={actionId === `${employee._id}-On Hold`}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <TimerReset size={14} />
                  {actionId === `${employee._id}-On Hold` ? "Updating..." : "Hold"}
                </button>
                <button
                  type="button"
                  onClick={() => printPayslip(employee)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  <Printer size={14} />
                  {isSchoolStaff(employee.staffType) ? "School Payslip" : "College Payslip"}
                </button>
                <button
                  type="button"
                  onClick={() => downloadAppointmentLetterPdf(employee)}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  <FileText size={14} />
                  Appointment Letter
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Document Management</h3>
            <p className="text-sm text-slate-500">Aadhaar, PAN, qualification, and experience document registry.</p>
          </div>
          <FileText className="text-blue-600" size={22} />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-3 py-3 font-semibold">Staff</th>
                <th className="px-3 py-3 font-semibold">Department</th>
                <th className="px-3 py-3 font-semibold">Document</th>
                <th className="px-3 py-3 font-semibold">Type</th>
                <th className="px-3 py-3 font-semibold">Size</th>
              </tr>
            </thead>
            <tbody>
              {documentLibrary.length ? (
                documentLibrary.map((item) => (
                  <tr key={item.key} className="border-b border-slate-100">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-900">{item.employeeName}</p>
                      <p className="text-xs text-slate-500">{item.employeeId}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{item.department}</td>
                    <td className="px-3 py-3 text-slate-700">{item.documentName}</td>
                    <td className="px-3 py-3 text-slate-700">{item.documentType}</td>
                    <td className="px-3 py-3 text-slate-700">{item.sizeLabel || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-3 py-10 text-center text-sm text-slate-500">
                    Uploaded staff documents will appear here after registration.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderIdCards = () => (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Printable Staff ID Card</h3>
            <p className="text-sm text-slate-500">Official ID card generation with logo, photo, and core staff data.</p>
          </div>
          <IdCard className="text-blue-600" size={22} />
        </div>

        {selectedEmployee ? (
          <div className="mt-5 rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] p-5 text-white shadow-[0_24px_70px_rgba(30,64,175,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">{selectedEmployee.staffType} ID</p>
                <h4 className="mt-2 text-xl font-bold">{selectedEmployee.name}</h4>
                <p className="mt-1 text-sm text-blue-100">{selectedEmployee.designation}</p>
              </div>
              <img src={Logo} alt="Institution logo" className="h-12 w-12 rounded-2xl bg-white object-contain p-1.5" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-blue-100">Employee ID</p>
                <p className="mt-2 font-semibold">{selectedEmployee.id}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-blue-100">Staff Type</p>
                <p className="mt-2 font-semibold">{selectedEmployee.staffType}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-blue-100">Department</p>
                <p className="mt-2 font-semibold">{selectedEmployee.department}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-blue-100">Status</p>
                <p className="mt-2 font-semibold">{selectedEmployee.staffStatus}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-blue-100">Contact</p>
                <p className="mt-2 font-semibold">{selectedEmployee.phone || "Not added"}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadIdCardPdf(selectedEmployee)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                <Download size={16} />
                Download ID Card
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Ready for Card Generation</h3>
            <p className="text-sm text-slate-500">Staff who can be selected for printable ID output.</p>
          </div>
          <Users className="text-blue-600" size={22} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {filteredStaff.map((employee) => (
            <div key={employee.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{employee.name}</p>
              <p className="mt-1 text-xs text-slate-500">{employee.id} • {employee.department}</p>
              <p className="mt-3 text-sm text-slate-600">{employee.designation}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadIdCardPdf(employee)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  <Download size={14} />
                  Generate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Staff Directory Report",
            action: exportDirectorySheet,
            icon: Users,
            description: "Department-wise staff registry export",
          },
          {
            title: "Attendance Report",
            action: exportAttendanceSheet,
            icon: CheckSquare,
            description: "Monthly attendance and salary-adjusted output",
          },
          {
            title: "Salary Report",
            action: exportSalarySheet,
            icon: FileBarChart2,
            description: "Payroll, PF, ESI, TDS, and payouts",
          },
          {
            title: "Leave Report",
            action: exportLeaveSheet,
            icon: CalendarDays,
            description: "Leave history and approval outcomes",
          },
        ].map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.title}
              type="button"
              onClick={report.action}
              className="rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Icon size={22} />
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{report.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{report.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                <Download size={14} />
                Export now
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Professional Report Summary</h3>
            <p className="text-sm text-slate-500">High-level insights for HR, finance, and administration.</p>
          </div>
          <TrendingUp className="text-blue-600" size={22} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total Departments</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{departmentOptions.filter((item) => item !== "All").length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Active Staff</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{payrollSummary.activeStaff}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pending Payroll</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{payrollSummary.pending}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pending Leave</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{leaveSummary.pendingRequests}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActivePage = () => {
    if (activeTab === "dashboard") {
      return renderDashboard();
    }
    if (activeTab === "registration") {
      return renderRegistration();
    }
    if (activeTab === "profiles") {
      return renderProfiles();
    }
    if (activeTab === "attendance") {
      return renderAttendance();
    }
    if (activeTab === "leave") {
      return renderLeave();
    }
    if (activeTab === "payroll") {
      return renderPayroll();
    }
    if (activeTab === "documents") {
      return renderDocuments();
    }
    if (activeTab === "idcards") {
      return renderIdCards();
    }
    return renderReports();
  };

  return (
    <section className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_26%),linear-gradient(180deg,#eff6ff_0%,#f8fafc_52%,#edf2f7_100%)] p-4 md:p-6 lg:p-8">
      <div className="page-enter mx-auto max-w-[1680px] space-y-6">
        <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
          <div className="relative p-6 md:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(148,163,184,0.12),_transparent_28%)]" />

            <div className="relative grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
              <div className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_56%,#2563eb_100%)] p-6 text-white shadow-[0_24px_70px_rgba(30,64,175,0.28)] md:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                    <ShieldCheck size={14} />
                    Staff Management
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-slate-100">
                    <BriefcaseBusiness size={14} />
                    Admin Workspace
                  </span>
                </div>

                <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                  Professional staff operations control center for registration, attendance, leave, payroll, and compliance.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-blue-100 sm:text-base">
                  Manage staff records, profiles, attendance, leave requests, payroll approvals, printable ID cards,
                  document verification, and export-ready reports from one secure responsive admin module.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">Total Staff</p>
                    <p className="mt-2 text-2xl font-bold text-white">{payrollSummary.totalStaff}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">Active Staff</p>
                    <p className="mt-2 text-2xl font-bold text-white">{payrollSummary.activeStaff}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">On Leave</p>
                    <p className="mt-2 text-2xl font-bold text-white">{payrollSummary.onLeaveStaff}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">Salary Expense</p>
                    <p className="mt-2 text-2xl font-bold text-white">{formatCurrency(payrollSummary.totalPayroll)}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Admin Features</p>
                      <h2 className="mt-3 text-2xl font-bold text-slate-900">Role-based and approval-ready</h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Built for Super Admin, HR, Finance, and leadership teams with clear approval workflows and operational visibility.
                      </p>
                    </div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Landmark size={22} />
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["Super Admin", "HR Manager", "Finance Head", "Principal", "Department Lead"].map((role) => (
                      <span key={role} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_100%)] p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Monthly Status</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Processed</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{payrollSummary.processed}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{payrollSummary.pending}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">On Hold</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{payrollSummary.onHold}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">Quick Actions</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => changeTab("registration")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      <UserPlus size={16} />
                      Add Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedEmployee && printPayslip(selectedEmployee)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      <ReceiptText size={16} />
                      {selectedEmployee && isSchoolStaff(selectedEmployee.staffType) ? "School Payslip" : "College Payslip"}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedEmployee && downloadAppointmentLetterPdf(selectedEmployee)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      <FileText size={16} />
                      Appointment Letter
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedEmployee && downloadIdCardPdf(selectedEmployee)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      <IdCard size={16} />
                      ID Card
                    </button>
                    <button
                      type="button"
                      onClick={exportDirectorySheet}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      <FileSpreadsheet size={16} />
                      Export Reports
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-8 grid gap-4 rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <Search size={14} />
                    Search
                  </span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Staff name, id, department..."
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </label>

                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <Building2 size={14} />
                    Department
                  </span>
                  <select
                    value={departmentFilter}
                    onChange={(event) => setDepartmentFilter(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  >
                    {departmentOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <Filter size={14} />
                    Staff Status
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  >
                    {statusOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <CalendarDays size={14} />
                    Salary Month
                  </span>
                  <select
                    value={salaryMonth}
                    onChange={(event) => setSalaryMonth(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  >
                    {availableMonths.map((month) => (
                      <option key={month}>{month}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Active Scope</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{salaryMonth}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {filteredStaff.length} staff matched in {staffTabs.find((tab) => tab.id === activeTab)?.label}.
                    </p>
                  </div>
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                    <Users size={24} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm">
            Loading staff management dashboard...
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5" />
              <div>
                <p className="font-semibold">Unable to load staff management data</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Workspace</p>
              <div className="mt-4 space-y-3">
                {staffTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => changeTab(tab.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                        activeTab === tab.id
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <Icon size={18} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              {success && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}
              {renderActivePage()}
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Selected Staff Snapshot</h3>
                    <p className="text-sm text-slate-500">Quick profile, salary, and communication summary.</p>
                  </div>
                  <BadgeIndianRupee className="text-blue-600" size={22} />
                </div>

                {selectedEmployee ? (
                  <div className="mt-5 rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] p-5">
                    <p className="text-lg font-bold text-slate-900">{selectedEmployee.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedEmployee.designation} • {selectedEmployee.department}</p>
                    <div className="mt-5 grid gap-3">
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-slate-500">Net Salary</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatCurrency(selectedEmployee.netSalary)}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-slate-500">Payment Mode</p>
                        <p className="mt-1 font-semibold text-slate-900">{selectedEmployee.paymentMode}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-slate-500">Staff Type</p>
                        <p className="mt-1 font-semibold text-slate-900">{selectedEmployee.staffType}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-slate-500">Phone</p>
                        <p className="mt-1 font-semibold text-slate-900">{selectedEmployee.phone || "Not added"}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-slate-500">Email</p>
                        <p className="mt-1 font-semibold text-slate-900">{selectedEmployee.email || "Not added"}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-slate-500">Status</p>
                        <p className="mt-1 font-semibold text-slate-900">{selectedEmployee.staffStatus}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => printPayslip(selectedEmployee)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        <Printer size={16} />
                        {isSchoolStaff(selectedEmployee.staffType) ? "School Payslip" : "College Payslip"}
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadAppointmentLetterPdf(selectedEmployee)}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                      >
                        <FileText size={16} />
                        Appointment Letter
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadIdCardPdf(selectedEmployee)}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                      >
                        <IdCard size={16} />
                        ID Card
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                    No staff records matched the current filters.
                  </div>
                )}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Notifications</h3>
                    <p className="text-sm text-slate-500">Operational alerts for HR and finance.</p>
                  </div>
                  <BellRing className="text-amber-500" size={22} />
                </div>
                <div className="mt-5 space-y-4">
                  {[
                    {
                      label: "Pending Payroll Approval",
                      value: `${payrollSummary.pending} staff`,
                      color: "bg-amber-500",
                      width: `${filteredStaff.length ? (payrollSummary.pending / filteredStaff.length) * 100 : 0}%`,
                    },
                    {
                      label: "Leave Approval Queue",
                      value: `${leaveSummary.pendingRequests} requests`,
                      color: "bg-blue-600",
                      width: `${leaveSummary.totalLeaves ? (leaveSummary.pendingRequests / leaveSummary.totalLeaves) * 100 : 0}%`,
                    },
                    {
                      label: "Attendance Average",
                      value: formatPercent(attendanceSummary.averageAttendance),
                      color: "bg-emerald-500",
                      width: `${Math.min(attendanceSummary.averageAttendance, 100)}%`,
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700">{item.label}</span>
                        <span className="text-slate-500">{item.value}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Contact & Identity</h3>
                    <p className="text-sm text-slate-500">Quick-reference details for the selected staff member.</p>
                  </div>
                  <UserRound className="text-blue-600" size={22} />
                </div>
                {selectedEmployee ? (
                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        <Phone size={16} className="text-blue-600" />
                        {selectedEmployee.phone || "Phone not added"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        <Mail size={16} className="text-blue-600" />
                        {selectedEmployee.email || "Email not added"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        <MapPin size={16} className="text-blue-600" />
                        {selectedEmployee.address || "Address not added"}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default Staff;
