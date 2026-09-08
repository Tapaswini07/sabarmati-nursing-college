import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import Student from "../models/student.js";
import { persistStudentFees } from "../utils/feeStore.js";

async function migrateStudentFees() {
  await connectDatabase();
  const students = await Student.find();

  for (const student of students) {
    await persistStudentFees(student);
  }

  console.log(`Migrated ${students.length} student fee record(s) to edufirmNoval.fees.`);
}

migrateStudentFees()
  .catch((error) => {
    console.error("Fee migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
