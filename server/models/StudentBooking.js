import mongoose from "mongoose";

const STATUS_VALUES = ["Pending", "Confirmed", "Rejected"];
const CONFIRMATION_VALUES = ["Queued", "Sent", "Failed"];

const studentBookingSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true, required: true, unique: true },
    fullName: { type: String, trim: true, default: "" },
    mobileNumber: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    dob: { type: String, trim: true, default: "" },
    gender: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    institution: { type: String, trim: true, default: "" },
    academicYear: { type: String, trim: true, default: "" },
    preferredCourse: { type: String, trim: true, default: "" },
    preferredSession: { type: String, trim: true, default: "" },
    bookingDate: { type: String, trim: true, default: "" },
    remarks: { type: String, trim: true, default: "" },
    bookingAmount: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, trim: true, default: "UPI" },
    transactionId: { type: String, trim: true, default: "" },
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
