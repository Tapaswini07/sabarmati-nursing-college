import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
  teacherName: { type: String, trim: true, required: true },
  employeeId: { type: String, trim: true, required: true, unique: true },
  staffId: { type: String, trim: true },
  department: { type: String, trim: true, required: true },
  subject: { type: String, trim: true },
  subjectExpertise: { type: String, trim: true },
  fullName: String,
  name: String,
  phone: String,
  email: String,
  gender: String,
  address: String,
  joiningDate: String,
  qualification: String,
}, { timestamps: true });

export default mongoose.model("Teacher", teacherSchema);
