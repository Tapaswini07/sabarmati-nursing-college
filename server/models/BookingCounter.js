import mongoose from "mongoose";

const bookingCounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    sequence: { type: Number, default: 0, min: 0 },
  },
  {
    collection: "bookingcounters",
    timestamps: true,
  }
);

export default mongoose.model("BookingCounter", bookingCounterSchema);
