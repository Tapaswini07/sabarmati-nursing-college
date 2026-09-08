import mongoose from "mongoose";

const formFillUpFeeSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, trim: true, index: true },
    studentName: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true, index: true },
    course: { type: String, required: true, trim: true, index: true },
    semester: { type: String, trim: true, default: "", index: true },
    academicYear: { type: String, trim: true, default: "", index: true },
    
    // Form Fill-up Fee specific fields
    formFillUpFee: { type: Number, default: 0, min: 0 },
    examFee: { type: Number, default: 0, min: 0 },
    otherFees: { type: Number, default: 0, min: 0 },
    studentAdjustment: { type: Number, default: 0 },
    adjustmentReason: { type: String, trim: true, default: "" },
    totalPayable: { type: Number, default: 0, min: 0 },
    
    // Payment fields
    paidAmount: { type: Number, default: 0, min: 0 },
    pendingAmount: { type: Number, default: 0, min: 0 },
    lastDate: { type: String, trim: true, default: "" },
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
        formFillUpFee: Number,
        examFee: Number,
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
    },
    createdBy: { type: String, trim: true, default: "" },
    updatedBy: { type: String, trim: true, default: "" },
  },
  { timestamps: true, collection: "formFillUpFees" }
);

formFillUpFeeSchema.index({ course: 1, academicYear: 1, semester: 1 });
formFillUpFeeSchema.index({ studentId: 1, course: 1, semester: 1, academicYear: 1 }, { unique: true });

export default mongoose.model("FormFillUpFee", formFillUpFeeSchema);
