import StudentBooking from "../models/StudentBooking.js";

export async function syncStudentBookingIndexes() {
  const result = await StudentBooking.syncIndexes();
  const removedIndexes = Array.isArray(result) ? result : [];

  if (removedIndexes.length) {
    console.log(`Student booking indexes synced; removed: ${removedIndexes.join(", ")}`);
  } else {
    console.log("Student booking indexes synced");
  }
}
