import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import BookingCounter from "../models/BookingCounter.js";
import StudentBooking from "../models/StudentBooking.js";

async function syncBookingCounter() {
  await connectDatabase();

  const year = new Date().getFullYear();
  const prefix = `SB-${year}-`;
  const bookings = await StudentBooking.find({
    id: new RegExp(`^${prefix}\\d+$`),
  })
    .select({ id: 1 })
    .lean();
  const highestSequence = bookings.reduce(
    (highest, booking) =>
      Math.max(highest, Number(String(booking.id).slice(prefix.length)) || 0),
    0
  );

  await BookingCounter.updateOne(
    { _id: `student-booking-${year}` },
    { $max: { sequence: highestSequence } },
    { upsert: true }
  );

  console.log(`Booking counter synchronized at ${highestSequence} for ${year}.`);
}

syncBookingCounter()
  .catch((error) => {
    console.error("Booking counter synchronization failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
