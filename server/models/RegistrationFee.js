import mongoose from "mongoose";

const registrationFeeSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, trim: true, index: true },
    studentName: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    academicYear: { type: String, trim: true, default: "", index: true },
    semester: { type: String, trim: true, default: "", index: true },
    registrationFee: { type: Number, required: true, min: 0 },
    baseRegistrationFee: { type: Number, default: 0, min: 0 },
    otherFees: { type: Number, default: 0, min: 0 },
    studentAdjustment: { type: Number, default: 0 },
    adjustmentReason: { type: String, trim: true, default: "" },
    totalPayable: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    pendingAmount: { type: Number, default: 0, min: 0 },
    lastDate: { type: String, required: true, trim: true },
    paymentMethod: { type: String, trim: true, default: "" },
    paymentStatus: { type: String, enum: ["Paid", "Unpaid", "Partial"], default: "Unpaid" },
    paymentDate: { type: String, trim: true, default: "" },
    receiptNumber: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    lateFee: { type: Number, default: 0, min: 0 },
    lateFeeApplied: { type: Boolean, default: false },
    installments: {
      type: [{
        installmentNumber: Number,
        amount: Number,
        dueDate: String,
        paidDate: String,
        status: { type: String, enum: ["Pending", "Paid", "Overdue"], default: "Pending" },
        receiptNumber: String
      }],
      default: []
    },
    paymentHistory: {
      type: [{
        date: String,
        amount: Number,
        method: String,
        receiptNumber: String,
        notes: String,
        installmentNumber: Number,
        course: String,
        semester: String,
        registrationFee: Number,
        otherFees: Number,
        studentAdjustment: Number,
        totalPayable: Number,
        totalPaidAmount: Number
      }],
      default: []
    },
    reminders: {
      emailSent: { type: Boolean, default: false },
      emailSentDate: { type: String, default: "" },
      smsSent: { type: Boolean, default: false },
      smsSentDate: { type: String, default: "" }
    }
  },
  { timestamps: true, collection: "registrationFees" }
);

export default mongoose.model("RegistrationFee", registrationFeeSchema);
