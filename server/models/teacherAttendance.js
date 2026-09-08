import mongoose from "mongoose";

const teacherAttendanceSchema = new mongoose.Schema(
  {
    teacherId: { type: String, required: true, trim: true },
    teacherName: { type: String, required: true, trim: true },
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

// Prevent duplicate entry for same teacher on same date
teacherAttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });

export default mongoose.model("TeacherAttendance", teacherAttendanceSchema);
