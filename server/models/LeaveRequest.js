import mongoose from "mongoose";

const leaveActivitySchema = new mongoose.Schema(
  {
    message: { type: String, trim: true, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeName: { type: String, trim: true, required: true },
    employeeId: { type: String, trim: true, required: true },
    department: { type: String, trim: true, required: true },
    leaveType: { type: String, trim: true, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 1 },
    reason: { type: String, trim: true, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    documentName: { type: String, trim: true, default: "" },
    documentPath: { type: String, trim: true, default: "" },
    documentMimeType: { type: String, trim: true, default: "" },
    reviewedBy: { type: String, trim: true, default: "" },
    reviewNote: { type: String, trim: true, default: "" },
    reviewedAt: { type: Date, default: null },
    activities: { type: [leaveActivitySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("LeaveRequest", leaveRequestSchema);
