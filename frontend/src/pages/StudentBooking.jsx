import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { apiRequest } from "../config/api";
import { printMoneyReceipt } from "../utils/receiptPdf";
import {
  BadgeIndianRupee,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileDown,
  FileSpreadsheet,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Printer,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";

const institutions = [
  {
    name: "Sabarmati College of Nursing",
    courses: ["B.Sc Nursing (B.Sc N)", "M.Sc Nursing (M.Sc N)", "P.B.BSc Nursing"],
  },
  {
    name: "Sabarmati School of Nursing",
    courses: ["ANM", "GNM"],
  },
];

const courseSeats = {
  "B.Sc Nursing (B.Sc N)": 100,
  "M.Sc Nursing (M.Sc N)": 50,
  "P.B.BSc Nursing": 60,
  ANM: 60,
  GNM: 60,
};

const sessionOptions = ["Morning", "Afternoon", "Evening"];
const genderOptions = ["Female", "Male", "Other"];
const paymentMethods = ["Cash", "UPI", "Bank Transfer", "Card Payment"];
const statusOptions = ["Pending", "Confirmed", "Rejected"];

const academicYearOptions = Array.from({ length: 8 }, (_, index) => {
  const startYear = 2024 + index;
  return `${startYear}-${startYear + 1}`;
});

const initialForm = {
  fullName: "",
  mobileNumber: "",
  email: "",
  dob: "",
  gender: "",
  address: "",
  institution: institutions[0].name,
  academicYear: academicYearOptions[2],
  preferredCourse: institutions[0].courses[0],
  preferredSession: sessionOptions[0],
  bookingDate: new Date().toISOString().slice(0, 10),
  remarks: "",
  bookingAmount: "5000",
  paymentMethod: "UPI",
  transactionId: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function statusClass(status) {
  if (status === "Confirmed") return "bg-emerald-100 text-emerald-800";
  if (status === "Rejected") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-800";
}

function escapeExcel(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function cropImageToDataUrl(src, crop) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const source = crop || { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
      canvas.width = source.width;
      canvas.height = source.height;
      const context = canvas.getContext("2d");
      context.drawImage(
        image,
        source.x,
        source.y,
        source.width,
        source.height,
        0,
        0,
        source.width,
        source.height
      );
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = reject;
    image.src = src;
  });
}

function getReceiptProfile(institution = "") {
  const isSchool = institution.toLowerCase().includes("school");
  return {
    name: isSchool ? "Sabarmati School of Nursing" : "Sabarmati College of Nursing",
    prefix: isSchool ? "SSN" : "SCN",
    typeLabel: isSchool ? "School Booking Receipt" : "College Booking Receipt",
    affiliation: isSchool
      ? "Recognized by Indian Nursing Council & Odisha Nurses Registration Council"
      : "Recognized by Odisha Nurses Registration Council &",
    affiliationSecondLine: isSchool
      ? "Affiliated to Odisha Nurses and Midwives Examination Board"
      : "Affiliated to Odisha University of Health Sciences, Bhubaneswar",
    logoPath: isSchool ? "/school-receipt-logo.png" : "/college-receipt-logo.png",
    logoCrop: null,
    logoBox: isSchool
      ? { x: 15, y: 9, width: 43, height: 43 }
      : { x: 13, y: 9, width: 48, height: 38 },
    email: "Sabarmaticollegeofnursing@gmail.com",
    phone: "9437184334 / 9337232175",
    address: "Mahanadi Vihar, Cuttack, Odisha - 753004",
  };
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

async function printReceipt(booking) {
  const isSchool = booking.institution?.toLowerCase().includes("school");
  const prefix = isSchool ? "SSN" : "SCN";
  const academicYear = booking.academicYear?.slice(2) || "24-25";
  const bookingId = String(booking.id || "").replaceAll("-", "");

  // The shared receipt generator creates one portrait A4 page and invokes the
  // browser print dialog once. This replaces jsPDF autoPrint plus print(),
  // which could create a second blank receipt.
  await printMoneyReceipt({
    student: {
      studentName: booking.fullName,
      registrationNo: booking.id,
      admissionNumber: booking.id,
      institution: booking.institution,
      institutionName: booking.institution,
      course: booking.preferredCourse,
      academicYear: booking.academicYear,
    },
    payment: {
      amount: booking.bookingAmount,
      method: booking.paymentMethod || "Payment",
      status: booking.status || "Confirmed",
      receiptNumber: `${prefix}/ON/${academicYear}/${bookingId}`,
      paymentDate: booking.bookingDate || booking.createdAt || new Date(),
      transactionId: booking.transactionId || "-",
      purpose: `${isSchool ? "School Booking Receipt" : "College Booking Receipt"} - Advance Payment (Admission)`,
      particular: `${isSchool ? "School Booking Receipt" : "College Booking Receipt"} - Seat Booking / Admission Fees`,
      footerNote: "Booking payment is not refundable.",
    },
  });
}

/*
  Legacy landscape receipt code retained below temporarily while the shared
  portrait receipt is used for printing. It is intentionally disabled.
*/
async function _unusedLegacyPrintReceipt(booking) {
  const profile = getReceiptProfile(booking.institution);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const navy = [6, 38, 95];
  const lightBorder = [170, 184, 204];
  let logoDataUrl = "";
  try {
    logoDataUrl = await cropImageToDataUrl(profile.logoPath, profile.logoCrop);
  } catch {
    logoDataUrl = "";
  }
  const receiptDate = formatDate(booking.bookingDate || booking.createdAt);
  const receiptNumber = `${profile.prefix}/ON/${booking.academicYear?.slice(2) || "24-25"}/${booking.id.replaceAll("-", "")}`;
  const transactionDate = booking.createdAt
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.createdAt))
    : receiptDate;
  const amount = formatReceiptAmount(booking.bookingAmount);
  const amountWords = amountToWords(booking.bookingAmount);
  const particular = `${profile.typeLabel} - Seat Booking / Admission Fees`;

  doc.setFillColor(...navy);
  doc.rect(0, 0, 297, 5, "F");
  doc.rect(0, 195, 297, 15, "F");

  doc.setDrawColor(...navy);
  doc.setLineWidth(0.7);
  doc.rect(4, 4, 289, 202);

  doc.setDrawColor(...lightBorder);
  doc.setLineWidth(0.2);

  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  doc.text(profile.name.toUpperCase(), 145, 19, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(profile.affiliation, 145, 29, { align: "center" });
  doc.text(profile.affiliationSecondLine, 145, 36, { align: "center" });
  doc.setFontSize(10);
  doc.text(profile.address, 145, 47, { align: "center" });
  doc.text(`${profile.phone}   |   ${profile.email}`, 145, 56, { align: "center" });

  doc.setDrawColor(...navy);
  doc.setLineWidth(0.6);
  if (logoDataUrl) {
    doc.addImage(
      logoDataUrl,
      "PNG",
      profile.logoBox.x,
      profile.logoBox.y,
      profile.logoBox.width,
      profile.logoBox.height
    );
  } else {
    doc.circle(37, 30, 17);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(profile.prefix, 37, 32, { align: "center" });
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text(profile.name.toUpperCase(), 37, 54, { align: "center", maxWidth: 58 });

  doc.setFillColor(...navy);
  doc.roundedRect(228, 11, 58, 22, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("MONEY RECEIPT", 257, 22, { align: "center" });
  doc.setFontSize(9);
  doc.text(`(${booking.paymentMethod || "Payment"})`, 257, 29, { align: "center" });

  doc.setTextColor(20, 31, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const receiptInfo = [
    ["Receipt No.", receiptNumber],
    ["Receipt Date", receiptDate],
    ["Payment Ref. No.", booking.transactionId || "-"],
    ["Transaction Date", transactionDate],
  ];
  receiptInfo.forEach(([label, value], index) => {
    const y = 45 + index * 11;
    doc.text(label, 226, y);
    doc.text(":", 252, y);
    doc.setFontSize(7.2);
    doc.text(doc.splitTextToSize(String(value), 29), 257, y);
    doc.setFontSize(9);
  });
  doc.line(221, 38, 221, 82);

  doc.setFillColor(...navy);
  doc.roundedRect(103, 64, 76, 9, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("RECEIVED WITH THANKS", 141, 70, { align: "center" });

  doc.setTextColor(20, 31, 48);
  doc.setFontSize(10);
  const studentRows = [
    ["Received From", booking.fullName],
    ["Application / Roll No.", booking.id],
    ["Institution", profile.name],
    ["Course", booking.preferredCourse],
    ["Year", booking.academicYear],
    ["Purpose", `${profile.typeLabel} - Advance Payment (Admission)`],
  ];
  studentRows.forEach(([label, value], index) => {
    const y = 83 + index * 8;
    doc.setFont("helvetica", "bold");
    doc.text(label, 15, y);
    doc.text(":", 66, y);
    doc.setFont("helvetica", index === 0 || index === 3 ? "bold" : "normal");
    doc.text(String(value || "-"), 74, y);
    doc.setDrawColor(...lightBorder);
    doc.line(14, y + 3, 199, y + 3);
  });

  doc.setFillColor(...navy);
  doc.rect(14, 135, 269, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PARTICULARS", 18, 141);
  doc.text("AMOUNT (Rs.)", 238, 141, { align: "center" });

  doc.setTextColor(20, 31, 48);
  doc.setDrawColor(...lightBorder);
  doc.rect(14, 135, 269, 31);
  doc.line(193, 135, 193, 158);
  doc.line(14, 151, 283, 151);
  doc.line(14, 158, 283, 158);
  doc.setFont("helvetica", "normal");
  doc.text(particular, 18, 149);
  doc.text(amount, 238, 149, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text("Total Amount", 18, 156);
  doc.text(`Rs. ${amount}`, 238, 156, { align: "center" });
  doc.text(`(Rupees ${amountWords} Only)`, 18, 164);

  doc.roundedRect(14, 170, 91, 22, 2, 2);
  doc.setFillColor(...navy);
  doc.roundedRect(18, 173, 45, 7, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("PAYMENT DETAILS", 40.5, 178, { align: "center" });
  doc.setTextColor(20, 31, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Payment Mode : ${booking.paymentMethod || "-"}`, 18, 185);
  doc.text(`Payment Status : ${booking.status || "-"}`, 18, 190);
  doc.text(`Transaction ID : ${booking.transactionId || "-"}`, 62, 190);

  doc.roundedRect(119, 170, 59, 22, 2, 2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text("SCAN TO VERIFY", 148.5, 177, { align: "center" });
  doc.setFontSize(18);
  doc.text("QR", 148.5, 187, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("(Verification code on official copy)", 148.5, 191, { align: "center" });

  doc.roundedRect(194, 170, 89, 22, 2, 2);
  doc.setFillColor(...navy);
  doc.roundedRect(212, 173, 53, 7, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("AUTHORIZED SIGNATURE", 238.5, 178, { align: "center" });
  doc.setTextColor(20, 31, 48);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(16);
  doc.text("Authorized", 238.5, 187, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Authorized Signatory, ${profile.name}`, 238.5, 191, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Note: This is a computer generated receipt and does not require any physical signature.", 14, 203);
  doc.text("Note: Booking payment is not refundable in this receipt.", 14, 208);
  doc.text(`For any queries, please contact us at ${profile.phone} or ${profile.email}`, 173, 203);

  // Open the completed receipt in the browser print flow instead of downloading it.
  doc.autoPrint();
  const receiptUrl = doc.output("bloburl");
  const printWindow = window.open(receiptUrl, "_blank", "noopener,noreferrer");

  if (printWindow) {
    printWindow.addEventListener(
      "load",
      () => {
        printWindow.focus();
        printWindow.print();
      },
      { once: true }
    );
  }
}

function downloadBookingsExcel(bookings) {
  const headers = [
    "Confirmation No",
    "Full Name",
    "Mobile Number",
    "Email",
    "Date of Birth",
    "Gender",
    "Address",
    "Institution",
    "Academic Year",
    "Preferred Course",
    "Preferred Session",
    "Booking Date",
    "Amount",
    "Payment Method",
    "Transaction ID",
    "Status",
    "SMS",
    "Email Confirmation",
    "Remarks",
  ];

  const rows = bookings.map((booking) => [
    booking.id,
    booking.fullName,
    booking.mobileNumber,
    booking.email,
    booking.dob,
    booking.gender,
    booking.address,
    booking.institution,
    booking.academicYear,
    booking.preferredCourse,
    booking.preferredSession,
    booking.bookingDate,
    booking.bookingAmount,
    booking.paymentMethod,
    booking.transactionId,
    booking.status,
    booking.smsConfirmation,
    booking.emailConfirmation,
    booking.remarks,
  ]);

  const tableRows = [headers, ...rows]
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeExcel(cell)}</td>`).join("")}</tr>`
    )
    .join("");
  const workbook = `<html><head><meta charset="utf-8" /></head><body><table>${tableRows}</table></body></html>`;
  downloadBlob(
    `student-bookings-${new Date().toISOString().slice(0, 10)}.xls`,
    workbook,
    "application/vnd.ms-excel;charset=utf-8;"
  );
}

function downloadReportPdf(bookings, summary, courseReport) {
  const doc = new jsPDF();
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Student Booking Report", 14, 18);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  let y = 45;
  [
    ["Total Bookings", summary.total],
    ["Pending Bookings", summary.pending],
    ["Confirmed Bookings", summary.confirmed],
    ["Revenue", formatCurrency(summary.revenue)],
  ].forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 68, y);
    y += 8;
  });

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Course-wise Bookings", 14, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  courseReport.forEach((item) => {
    doc.text(`${item.course}: ${item.total} booking(s), ${formatCurrency(item.revenue)}`, 14, y);
    y += 7;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Recent Student Booking History", 14, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  bookings.slice(0, 12).forEach((booking) => {
    const text = `${booking.id} | ${booking.fullName} | ${booking.preferredCourse} | ${booking.status}`;
    doc.text(doc.splitTextToSize(text, 180), 14, y);
    y += 8;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save(`student-booking-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function StudentBooking() {
  const [bookings, setBookings] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [successBooking, setSuccessBooking] = useState(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStudentBookings() {
      try {
        setBookingError("");
        const savedBookings = await apiRequest("/api/student-bookings");
        if (isMounted) {
          setBookings(Array.isArray(savedBookings) ? savedBookings : []);
        }
      } catch (error) {
        if (isMounted) {
          setBookingError(error.message || "Unable to load student bookings.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingBookings(false);
        }
      }
    }

    loadStudentBookings();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedInstitution = institutions.find((item) => item.name === formData.institution);
  const availableCourses = selectedInstitution?.courses || [];

  const bookedSeatCount = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.preferredCourse === formData.preferredCourse &&
          booking.status !== "Rejected"
      ).length,
    [bookings, formData.preferredCourse]
  );
  const totalSeats = courseSeats[formData.preferredCourse] || 0;
  const availableSeats = Math.max(totalSeats - bookedSeatCount, 0);

  const summary = useMemo(
    () => ({
      total: bookings.length,
      pending: bookings.filter((booking) => booking.status === "Pending").length,
      confirmed: bookings.filter((booking) => booking.status === "Confirmed").length,
      revenue: bookings
        .filter((booking) => booking.status !== "Rejected")
        .reduce((sum, booking) => sum + Number(booking.bookingAmount || 0), 0),
    }),
    [bookings]
  );

  const courseReport = useMemo(
    () =>
      Object.keys(courseSeats).map((course) => {
        const courseBookings = bookings.filter((booking) => booking.preferredCourse === course);
        return {
          course,
          total: courseBookings.length,
          pending: courseBookings.filter((booking) => booking.status === "Pending").length,
          confirmed: courseBookings.filter((booking) => booking.status === "Confirmed").length,
          revenue: courseBookings
            .filter((booking) => booking.status !== "Rejected")
            .reduce((sum, booking) => sum + Number(booking.bookingAmount || 0), 0),
        };
      }),
    [bookings]
  );

  const filteredBookings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return bookings
      .filter((booking) => {
        const matchesStatus = statusFilter === "All" || booking.status === statusFilter;
        const matchesSearch = query
          ? [
              booking.id,
              booking.fullName,
              booking.mobileNumber,
              booking.email,
              booking.preferredCourse,
              booking.institution,
              booking.transactionId,
            ]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(query))
          : true;
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [bookings, searchTerm, statusFilter]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => {
      const next = { ...current, [name]: value };
      if (name === "institution") {
        const nextInstitution = institutions.find((item) => item.name === value);
        next.preferredCourse = nextInstitution?.courses[0] || "";
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSavingBooking(true);
      setBookingError("");
      const response = await apiRequest("/api/student-bookings", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          bookingAmount: Number(formData.bookingAmount || 0),
        }),
      });
      const savedBooking = response.booking;
      setBookings((current) => [savedBooking, ...current]);
      setSuccessBooking(savedBooking);
      setFormData(initialForm);
    } catch (error) {
      setBookingError(error.message || "Unable to save student booking.");
    } finally {
      setIsSavingBooking(false);
    }
  };

  const updateBookingStatus = async (id, status) => {
    try {
      setBookingError("");
      const response = await apiRequest(`/api/student-bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setBookings((current) =>
        current.map((booking) => (booking.id === id ? response.booking : booking))
      );
    } catch (error) {
      setBookingError(error.message || "Unable to update student booking status.");
    }
    };

  return (
    <section className="flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-4 lg:p-6">
      <div className="w-full space-y-6">
        <div className="overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="bg-blue-900 px-5 py-7 text-white sm:px-7 lg:px-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                  <ShieldCheck size={15} />
                  Official Seat Booking Desk
                </p>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Student Booking Management
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-blue-100 sm:text-base">
                  Manage online seat booking, confirmation tracking, payment receipts,
                  student booking history, and course-wise reports.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => downloadBookingsExcel(filteredBookings)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-blue-900 transition hover:bg-blue-50"
                >
                  <FileSpreadsheet size={16} />
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={() => downloadReportPdf(filteredBookings, summary, courseReport)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <FileDown size={16} />
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5 lg:p-6">
            {[
              { label: "Total Bookings", value: summary.total, icon: UsersRound },
              { label: "Course-wise Reports", value: courseReport.filter((item) => item.total > 0).length, icon: FileSpreadsheet },
              { label: "Pending Bookings", value: summary.pending, icon: Clock3 },
              { label: "Confirmed Bookings", value: summary.confirmed, icon: CheckCircle2 },
              { label: "Booking Revenue", value: formatCurrency(summary.revenue), icon: BadgeIndianRupee },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{item.value}</p>
                    </div>
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                      <Icon size={20} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {bookingError && (
          <div className="rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {bookingError}
          </div>
        )}

        {successBooking && (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
                  Booking Confirmation Generated
                </p>
                <h2 className="mt-2 text-xl font-black">
                  {successBooking.id} - {successBooking.fullName}
                </h2>
                <p className="mt-1 text-sm">
                  SMS and email confirmation marked as sent. Receipt is ready to print.
                </p>
              </div>
              <button
                type="button"
                onClick={() => printReceipt(successBooking)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                <Printer size={16} />
                Print Receipt
              </button>
            </div>
          </div>
        )}

        <div className="grid w-full gap-6 xl:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.07)] lg:p-6"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <UserRound size={22} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                  Online Seat Booking
                </p>
                <h2 className="text-xl font-bold text-slate-900">Student booking form</h2>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Seat Availability
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formData.preferredCourse}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-blue-900">{availableSeats}</p>
                  <p className="text-xs font-semibold text-slate-500">of {totalSeats} seats</p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                  Student Information
                </h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Full Name</span>
                    <input name="fullName" value={formData.fullName} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" required />
                  </label>
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><Phone size={15} />Mobile Number</span>
                    <input name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} inputMode="tel" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" required />
                  </label>
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><Mail size={15} />Email Address</span>
                    <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" required />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Date of Birth</span>
                    <input name="dob" type="date" value={formData.dob} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" required />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Gender</span>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" required>
                      <option value="">Select gender</option>
                      {genderOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Address</span>
                    <textarea name="address" value={formData.address} onChange={handleChange} rows="3" className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" required />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                  Course Selection
                </h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Institution</span>
                    <select name="institution" value={formData.institution} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100">
                      {institutions.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Preferred Course</span>
                    <select name="preferredCourse" value={formData.preferredCourse} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100">
                      {availableCourses.map((course) => <option key={course} value={course}>{course}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                  Booking Details
                </h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Academic Year</span>
                    <select name="academicYear" value={formData.academicYear} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100">
                      {academicYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Preferred Session</span>
                    <select name="preferredSession" value={formData.preferredSession} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100">
                      {sessionOptions.map((session) => <option key={session} value={session}>{session}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays size={15} />Booking Date</span>
                    <input name="bookingDate" type="date" value={formData.bookingDate} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" required />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Remarks / Comments</span>
                    <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="3" className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                  Payment Details
                </h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Booking Amount</span>
                    <input name="bookingAmount" type="number" min="0" value={formData.bookingAmount} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" required />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Payment Method</span>
                    <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100">
                      {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Transaction ID</span>
                    <input name="transactionId" value={formData.transactionId} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="Auto-generated if left blank" />
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingBooking}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              <ShieldCheck size={16} />
              {isSavingBooking ? "Saving Booking..." : "Generate Booking Confirmation"}
            </button>
          </form>

          <div className="min-w-0 space-y-6">
            <div className="rounded-[28px] border border-blue-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
              <div className="border-b border-blue-100 p-5 lg:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                      Admin Booking Records
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">All student bookings</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Showing {filteredBookings.length} of {bookings.length} records in table format.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(360px,1fr)_170px] xl:min-w-[620px]">
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <Search size={17} className="text-slate-400" />
                      <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search booking, student, course" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
                    </label>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none">
                      <option value="All">All Status</option>
                      {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[1320px] table-fixed text-sm">
                  <thead className="bg-blue-50 text-left text-xs uppercase tracking-[0.16em] text-blue-800">
                    <tr>
                      <th className="w-[150px] px-5 py-4">Confirmation</th>
                      <th className="w-[230px] px-5 py-4">Student Information</th>
                      <th className="w-[250px] px-5 py-4">Course Selection</th>
                      <th className="w-[230px] px-5 py-4">Booking Details</th>
                      <th className="w-[160px] px-5 py-4">Payment</th>
                      <th className="w-[170px] px-5 py-4">Confirmation</th>
                      <th className="w-[130px] px-5 py-4">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingBookings ? (
                      <tr>
                        <td colSpan="7" className="px-5 py-14 text-center text-slate-500">
                          Loading booking data from MongoDB...
                        </td>
                      </tr>
                    ) : filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-5 py-14 text-center text-slate-500">
                          No booking data found.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((booking) => (
                        <tr key={booking.id} className="align-top transition hover:bg-blue-50/40">
                          <td className="px-5 py-4">
                            <p className="break-words font-black text-blue-800">{booking.id}</p>
                            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(booking.status)}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="break-words font-bold text-slate-900">{booking.fullName}</p>
                            <p className="mt-1 break-words text-xs text-slate-500">{booking.mobileNumber}</p>
                            <p className="mt-1 break-words text-xs text-slate-500">{booking.email}</p>
                            <p className="mt-1 text-xs text-slate-500">{booking.gender} | DOB {formatDate(booking.dob)}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="break-words font-semibold text-slate-900">{booking.institution}</p>
                            <p className="mt-1 break-words text-xs text-slate-500">{booking.preferredCourse}</p>
                            <p className="mt-1 text-xs text-slate-500">{booking.academicYear}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">{formatDate(booking.bookingDate)}</p>
                            <p className="mt-1 text-xs text-slate-500">Session: {booking.preferredSession}</p>
                            <p className="mt-1 break-words text-xs leading-5 text-slate-500">{booking.remarks || "-"}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-900">{formatCurrency(booking.bookingAmount)}</p>
                            <p className="mt-1 text-xs text-slate-500">{booking.paymentMethod}</p>
                            <p className="mt-1 break-words text-xs text-slate-500">{booking.transactionId}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-emerald-700">SMS: {booking.smsConfirmation}</p>
                            <p className="mt-1 text-xs font-semibold text-emerald-700">Email: {booking.emailConfirmation}</p>
                            <button type="button" onClick={() => printReceipt(booking)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-50">
                              <Printer size={14} />
                              Print Receipt
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-2">
                              <button type="button" onClick={() => updateBookingStatus(booking.id, "Confirmed")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700">
                                <CheckCircle2 size={14} />
                                Approve
                              </button>
                              <button type="button" onClick={() => updateBookingStatus(booking.id, "Rejected")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700">
                                <XCircle size={14} />
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.07)] lg:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <FileSpreadsheet size={22} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                    Course-wise Booking Reports
                  </p>
                  <h2 className="text-xl font-bold text-slate-900">Seat booking summary</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {courseReport.map((item) => (
                  <div key={item.course} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-slate-900">{item.course}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.confirmed} confirmed, {item.pending} pending
                        </p>
                      </div>
                      <p className="text-2xl font-black text-blue-800">{item.total}</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-blue-700"
                        style={{ width: `${Math.min((item.total / (courseSeats[item.course] || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-600">
                      Revenue: {formatCurrency(item.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
