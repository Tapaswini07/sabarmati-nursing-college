import mongoose from "mongoose";

const fineSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, trim: true, index: true },
    studentName: { type: String, required: true, trim: true },
    institution: { type: String, trim: true, default: "", index: true },
    course: { type: String, required: true, trim: true },
    fineType: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "Library",
        "Late Fee",
        "Hostel",
        "Transport",
        "Examination",
        "Discipline",
        "Uniform",
        "Document",
        "Miscellaneous",
      ],
      index: true,
    },
    fineAmount: { type: Number, required: true, min: 0 },
    fineDate: { type: String, required: true, trim: true },
    dueDate: { type: String, required: true, trim: true },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Unpaid", "Partial"],
      default: "Unpaid",
      index: true,
    },
    paidAmount: { type: Number, default: 0, min: 0 },
    pendingAmount: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, trim: true, default: "" },
    paidDate: { type: String, trim: true, default: "" },
    // Keep each payment separately so daily collection reports stay correct
    // when a fine is paid in installments.
    paymentHistory: {
      type: [{
        date: { type: String, trim: true },
        amount: { type: Number, min: 0 },
        method: { type: String, trim: true },
      }],
      default: [],
    },
    receiptNumber: { type: String, trim: true, default: "" },
    remarks: { type: String, trim: true, default: "" },
  },
  { timestamps: true, collection: "fines" }
);

export default mongoose.model("Fine", fineSchema);
