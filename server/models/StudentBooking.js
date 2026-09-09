import mongoose from "mongoose";

const STATUS_VALUES = ["Pending", "Confirmed", "Rejected"];
const CONFIRMATION_VALUES = ["Queued", "Sent", "Failed"];

const studentBookingSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true, required: true, unique: true },
    fullName: { type: String, trim: true, required: true },
    mobileNumber: { type: String, trim: true, required: true },
    email: { type: String, trim: true, required: true },
    dob: { type: String, trim: true, required: true },
    gender: { type: String, trim: true, required: true },
    address: { type: String, trim: true, required: true },
    institution: { type: String, trim: true, required: true },
    academicYear: { type: String, trim: true, required: true },
    preferredCourse: { type: String, trim: true, required: true },
    preferredSession: { type: String, trim: true, required: true },
    bookingDate: { type: String, trim: true, required: true },
    remarks: { type: String, trim: true, default: "" },
    bookingAmount: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, trim: true, default: "UPI" },
    transactionId: { type: String, trim: true, required: true },
    status: { type: String, enum: STATUS_VALUES, default: "Pending" },
    disabled: { type: Boolean, default: false },
    smsConfirmation: { type: String, enum: CONFIRMATION_VALUES, default: "Sent" },
    emailConfirmation: { type: String, enum: CONFIRMATION_VALUES, default: "Sent" },
  },
  {
    collection: "studentbookings",
    id: false,
    timestamps: true,
  }
);

export default mongoose.model("StudentBooking", studentBookingSchema);
