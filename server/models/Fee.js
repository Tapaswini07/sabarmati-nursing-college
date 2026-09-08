import mongoose from "mongoose";

const feeSchema = new mongoose.Schema(
  {
    studentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
      index: true,
    },
    registrationNo: { type: String, required: true, trim: true, unique: true, index: true },
    studentName: { type: String, trim: true, default: "" },
    institution: { type: String, trim: true, default: "", index: true },
    course: { type: String, trim: true, default: "", index: true },
    admissionBatch: { type: String, trim: true, default: "", index: true },
    currentStudyYear: { type: Number, default: 1, min: 1, max: 4 },
    feeStructureKey: { type: String, trim: true, default: "" },
    activeFeeStructure: { type: Boolean, default: true },
    academicYear: { type: String, trim: true, default: "", index: true },
    feePlan: { type: String, trim: true, default: "Yearly" },
    baseFee: { type: Number, default: 0, min: 0 },
    totalFee: { type: Number, default: 0, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    totalFine: { type: Number, default: 0, min: 0 },
    totalExtraCharges: { type: Number, default: 0, min: 0 },
    outstandingAmount: { type: Number, default: 0, min: 0 },
    outstandingStatus: { type: String, trim: true, default: "Pending" },
    paidAmount: { type: Number, default: 0, min: 0 },
    pendingAmount: { type: Number, default: 0, min: 0 },
    lastPaymentDate: { type: String, trim: true, default: "" },
    nextDueDate: { type: String, trim: true, default: "" },
    scholarshipAmount: { type: Number, default: 0, min: 0 },
    scholarshipStatus: { type: String, trim: true, default: "Not Applied" },
    feeStructure: { type: [mongoose.Schema.Types.Mixed], default: [] },
    extraCharges: { type: [mongoose.Schema.Types.Mixed], default: [] },
    examFees: { type: [mongoose.Schema.Types.Mixed], default: [] },
    discounts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    fineRules: { type: [mongoose.Schema.Types.Mixed], default: [] },
    paymentHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
    refunds: { type: [mongoose.Schema.Types.Mixed], default: [] },
    ledgerEntries: { type: [mongoose.Schema.Types.Mixed], default: [] },
    feeRevisionHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, collection: "fees" }
);

export default mongoose.model("Fee", feeSchema);
