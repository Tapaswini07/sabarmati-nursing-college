import mongoose from "mongoose";

const financeDataMigrationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model("FinanceDataMigration", financeDataMigrationSchema);
