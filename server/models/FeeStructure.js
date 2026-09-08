import mongoose from "mongoose";

const feeComponentSchema = new mongoose.Schema(
  {
    componentId: { type: String, trim: true, required: true },
    title: { type: String, trim: true, required: true },
    category: { type: String, trim: true, default: "Fee" },
    amount: { type: Number, default: 0, min: 0 },
    type: { type: String, trim: true, default: "Debit" },
    dueDate: { type: String, trim: true, default: "" },
    required: { type: Boolean, default: true },
    note: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const yearFeeSchema = new mongoose.Schema(
  {
    studyYear: { type: Number, required: true, min: 1, max: 4 },
    yearLabel: { type: String, trim: true, required: true },
    academicYear: { type: String, trim: true, default: "" },
    components: { type: [feeComponentSchema], default: [] },
    totalFee: { type: Number, default: 0, min: 0 },
    scholarship: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    fine: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const revisionSchema = new mongoose.Schema(
  {
    revisionId: { type: String, trim: true, required: true },
    action: { type: String, trim: true, required: true },
    changedAt: { type: String, trim: true, required: true },
    changedBy: { type: String, trim: true, default: "Super Admin" },
    note: { type: String, trim: true, default: "" },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const feeStructureSchema = new mongoose.Schema(
  {
    institution: { type: String, trim: true, required: true, index: true },
    course: { type: String, trim: true, required: true, index: true },
    admissionBatch: { type: String, trim: true, required: true, index: true },
    academicYear: { type: String, trim: true, default: "", index: true },
    durationYears: { type: Number, required: true, min: 1, max: 4 },
    active: { type: Boolean, default: true, index: true },
    status: { type: String, trim: true, default: "Active", index: true },
    yearFees: { type: [yearFeeSchema], default: [] },
    revisionHistory: { type: [revisionSchema], default: [] },
    createdBy: { type: String, trim: true, default: "Super Admin" },
    updatedBy: { type: String, trim: true, default: "Super Admin" },
  },
  { timestamps: true, collection: "feeStructures" }
);

feeStructureSchema.index(
  { institution: 1, course: 1, admissionBatch: 1 },
  { unique: true }
);

export default mongoose.model("FeeStructure", feeStructureSchema);
