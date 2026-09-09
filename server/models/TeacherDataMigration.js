import mongoose from "mongoose";

const teacherDataMigrationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model("TeacherDataMigration", teacherDataMigrationSchema);
