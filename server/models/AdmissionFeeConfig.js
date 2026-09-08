import mongoose from "mongoose";

const admissionFeeConfigSchema = new mongoose.Schema(
  {
    studentId: { type: String, trim: true, default: "" },
    studentName: { type: String, trim: true, default: "" },
    studentEmail: { type: String, trim: true, default: "" },
    registrationNo: { type: String, trim: true, default: "" },
    course: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    configKey: { type: String, trim: true },
    studentKey: { type: String, trim: true },
    createdBy: { type: String, trim: true, default: "" },
    updatedBy: { type: String, trim: true, default: "" },
  },
  { timestamps: true, collection: "admissionFeeConfigs" }
);

admissionFeeConfigSchema.pre("validate", function buildAdmissionFeeKeys() {
  const course = this.course || "";
  const academicYear = this.academicYear || "";

  if (this.studentId) {
    this.studentKey = `${this.studentId}|${academicYear}|${course}`;
    this.configKey = undefined;
  } else {
    this.configKey = `${academicYear}|${course}`;
    this.studentKey = undefined;
  }
});

admissionFeeConfigSchema.index({ configKey: 1 }, { unique: true, sparse: true });
admissionFeeConfigSchema.index({ studentKey: 1 }, { unique: true, sparse: true });
admissionFeeConfigSchema.index({ course: 1, academicYear: 1, studentName: 1 });

export default mongoose.model("AdmissionFeeConfig", admissionFeeConfigSchema);
