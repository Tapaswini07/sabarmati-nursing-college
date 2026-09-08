/**
 * seedAdmin.js
 * Run once to create or reset the super admin account.
 *
 * Usage:
 *   node seedAdmin.js
 *
 * Required env:
 *   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.0vigp2h.mongodb.net/edufirmNoval
 *
 * Optional env:
 *   ADMIN_EMAIL=admin@hospital.com
 *   ADMIN_PASSWORD=YourStrongPassword123!
 *   ADMIN_NAME=Super Admin
 *   ADMIN_USER_ID=SUPER001
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { getMongoUri } from "./config/database.js";
import User from "./models/User.js";

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@hospital.com";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "admin@1234";
const ADMIN_NAME = process.env.ADMIN_NAME || "Super Admin";
const ADMIN_USER_ID = (process.env.ADMIN_USER_ID || "SUPER001").toUpperCase();

async function seed() {
  await mongoose.connect(getMongoUri());
  console.log("Connected to MongoDB");

  const hashed = await bcrypt.hash(ADMIN_PASS, 10);

  const result = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL.toLowerCase() },
    {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase(),
      userId: ADMIN_USER_ID,
      password: hashed,
      role: "super_admin",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Admin upserted: ${result.email} (role: ${result.role})`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
