import mongoose from "mongoose";

const registrationFeeConfigSchema = new mongoose.Schema(
  {
    course: { type: String, required: true, trim: true, index: true },
    semester: { type: String, required: true, trim: true, index: true },
    academicYear: { type: String, required: true, trim: true, index: true },
    registrationFee: { type: Number, required: true, min: 0 },
    otherFees: { type: Number, default: 0, min: 0 },
    lastDate: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "registrationFeeConfigs" }
);

registrationFeeConfigSchema.index(
  { course: 1, semester: 1, academicYear: 1 },
  { unique: true }
);

export default mongoose.model("RegistrationFeeConfig", registrationFeeConfigSchema);
