import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    course: { type: String, trim: true, default: "" },
    academicYear: { type: String, trim: true, default: "" },
    date: { type: String, required: true },          // "YYYY-MM-DD"
    status: {
      type: String,
      enum: ["Present", "Absent", "Half-day"],
      required: true,
    },
    checkIn: { type: String, default: "" },           // "HH:MM"
    checkOut: { type: String, default: "" },
  },
  { timestamps: true }
);

// Prevent duplicate entry for same student on same date
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
