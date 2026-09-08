import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { syncStudentBookingIndexes } from "../utils/syncStudentBookingIndexes.js";

async function run() {
  await connectDatabase();
  await syncStudentBookingIndexes();
}

run()
  .catch((error) => {
    console.error("Student booking index synchronization failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
