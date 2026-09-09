import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    userId: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "admin", "finance_admin", "student"],
      default: "student",
    },
    linkedStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    passwordResetToken: { type: String, default: "" },
    passwordResetExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
