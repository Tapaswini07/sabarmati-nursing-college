import Attendance from "../models/attendance.js";
import TeacherAttendance from "../models/teacherAttendance.js";

export async function syncAttendanceIndexes() {
  try {
    const indexes = await Attendance.collection.indexes();
    const hasLegacyRefIndex = indexes.some((index) => index.name === "refId_1_date_1");

    if (hasLegacyRefIndex) {
      await Attendance.collection.dropIndex("refId_1_date_1");
      console.log("Dropped legacy attendance index refId_1_date_1");
    }

    await Attendance.syncIndexes();
    await TeacherAttendance.syncIndexes();
    console.log("Attendance indexes synced");
    console.log("Teacher attendance indexes synced");
  } catch (error) {
    console.error("Failed to sync attendance indexes:", error.message);
    throw error;
  }
}
