import mongoose from "mongoose";

const staffDataMigrationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model("StaffDataMigration", staffDataMigrationSchema);
