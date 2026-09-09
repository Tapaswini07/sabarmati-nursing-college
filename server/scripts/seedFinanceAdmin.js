/**
 * Creates or resets a Finance Admin account.
 *
 * Usage:
 *   node scripts/seedFinanceAdmin.js finance@example.com YourStrongPassword "Finance Admin" FINANCE001
 *
 * Environment variables can also be used: FINANCE_ADMIN_EMAIL, FINANCE_ADMIN_PASSWORD,
 * FINANCE_ADMIN_NAME, and FINANCE_ADMIN_USER_ID.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { connectDatabase } from "../config/database.js";
import User from "../models/User.js";

dotenv.config();

const [emailArgument, passwordArgument, nameArgument, userIdArgument] = process.argv.slice(2);
const email = String(emailArgument || process.env.FINANCE_ADMIN_EMAIL || "").trim().toLowerCase();
const password = passwordArgument || process.env.FINANCE_ADMIN_PASSWORD || "";
const name = String(nameArgument || process.env.FINANCE_ADMIN_NAME || "Finance Admin").trim();
const userId = String(userIdArgument || process.env.FINANCE_ADMIN_USER_ID || "FINANCE001").trim().toUpperCase();

if (!email || !password) {
  throw new Error("FINANCE_ADMIN_EMAIL and FINANCE_ADMIN_PASSWORD are required");
}

if (password.length < 8) {
  throw new Error("FINANCE_ADMIN_PASSWORD must be at least 8 characters long");
}

async function seedFinanceAdmin() {
  await connectDatabase();
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.findOneAndUpdate(
    { email },
    {
      name,
      email,
      userId,
      password: hashedPassword,
      role: "finance_admin",
      linkedStudentId: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Finance Admin ready: ${user.email} (User ID: ${user.userId})`);
  await mongoose.disconnect();
}

seedFinanceAdmin().catch(async (error) => {
  await mongoose.disconnect();
  console.error(`Finance Admin seed failed: ${error.message}`);
  process.exit(1);
});
