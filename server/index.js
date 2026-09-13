import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import attendanceRoutes from "./routes/attendanceroutes.js";
import admissionRoutes from "./routes/admission.js";
import admissionFeeConfigRoutes from "./routes/admissionFeeConfig.js";
import studentRoutes from "./routes/students.js";
import teacherRoutes from "./routes/teachers.js";
import teacherAttendanceRoutes from "./routes/teacherAttendanceRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import staffRoutes from "./routes/staff.js";
import departmentFinanceRoutes from "./routes/departmentFinance.js";
import studentBookingRoutes from "./routes/studentBookings.js";
import fineRoutes from "./routes/fines.js";
import {
  connectDatabase,
  getDatabaseStatus,
  requireDatabaseConnection,
} from "./config/database.js";
import { syncAttendanceIndexes } from "./utils/syncAttendanceIndexes.js";
import { syncStudentBookingIndexes } from "./utils/syncStudentBookingIndexes.js";

const app = express();
const configuredOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...configuredOrigins,
  "https://sabarmati-nursing-college-859o.vercel.app",
  "https://sabarmati-nursing-college-859o-j6jodx5l0-sabarmati-project.vercel.app",
  "https://sabarmati-nursing-college-859o-j6jodx5l0-sabarmati-project-git-main-sabarmati-project.vercel.app",
];

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, origin || true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"],
}));
app.options("*", cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static("uploads"));

app.get("/", (_, res) => res.json({ status: "Attendance API running" }));
app.get("/health/database", (_, res) => {
  res.json({
    status: "ok",
    mongodb: getDatabaseStatus(),
  });
});

app.use(requireDatabaseConnection);

app.use("/", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/teacher-attendance", teacherAttendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/department-finance", departmentFinanceRoutes);
app.use("/api/student-bookings", studentBookingRoutes);
app.use("/api/fines", fineRoutes);
app.use("/api", admissionRoutes);
app.use("/api/admission-fee-config", admissionFeeConfigRoutes);

const port = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDatabase();
    await syncAttendanceIndexes();
    await syncStudentBookingIndexes();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error("Server startup failed. MongoDB connection is required:", err);
    process.exit(1);
  }
}

startServer();
