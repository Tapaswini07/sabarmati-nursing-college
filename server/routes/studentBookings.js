import express from "express";
import StudentBooking from "../models/StudentBooking.js";
import BookingCounter from "../models/BookingCounter.js";

const router = express.Router();
const ALLOWED_STATUSES = new Set(["Pending", "Confirmed", "Rejected"]);

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildTransactionId(paymentMethod = "UPI") {
  return `${String(paymentMethod).toUpperCase().replaceAll(" ", "-")}-${Date.now()}`;
}

async function createBookingId() {
  const year = new Date().getFullYear();
  const prefix = `SB-${year}-`;
  const counterId = `student-booking-${year}`;
  const [latestBooking] = await StudentBooking.aggregate([
    { $match: { id: new RegExp(`^${prefix}\\d+$`) } },
    {
      $project: {
        sequence: {
          $convert: {
            input: {
              $substrCP: [
                "$id",
                prefix.length,
                { $subtract: [{ $strLenCP: "$id" }, prefix.length] },
              ],
            },
            to: "int",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    { $group: { _id: null, sequence: { $max: "$sequence" } } },
  ]);

  try {
    await BookingCounter.updateOne(
      { _id: counterId },
      { $max: { sequence: Number(latestBooking?.sequence || 0) } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  const counter = await BookingCounter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { sequence: 1 } },
    { returnDocument: "after" }
  ).lean();

  return `${prefix}${String(counter.sequence).padStart(3, "0")}`;
}

function bookingPayload(body, id) {
  return {
    id,
    fullName: String(body.fullName || "").trim(),
    mobileNumber: String(body.mobileNumber || "").trim(),
    email: String(body.email || "").trim(),
    dob: String(body.dob || "").trim(),
    gender: String(body.gender || "").trim(),
    address: String(body.address || "").trim(),
    institution: String(body.institution || "").trim(),
    academicYear: String(body.academicYear || "").trim(),
    preferredCourse: String(body.preferredCourse || "").trim(),
    preferredSession: String(body.preferredSession || "").trim(),
    bookingDate: String(body.bookingDate || new Date().toISOString().slice(0, 10)).trim(),
    remarks: String(body.remarks || "").trim(),
    bookingAmount: Math.max(toNumber(body.bookingAmount), 0),
    paymentMethod: String(body.paymentMethod || "UPI").trim(),
    transactionId: String(body.transactionId || "").trim() || buildTransactionId(body.paymentMethod),
    status: "Pending",
    smsConfirmation: "Sent",
    emailConfirmation: "Sent",
  };
}

function validateRequired(payload) {
  const requiredFields = [
    "fullName",
    "mobileNumber",
    "email",
    "dob",
    "gender",
    "address",
    "institution",
    "academicYear",
    "preferredCourse",
    "preferredSession",
    "bookingDate",
    "transactionId",
  ];

  return requiredFields.filter((field) => !payload[field]);
}

router.get("/", async (_req, res) => {
  try {
    const bookings = await StudentBooking.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json(bookings);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching student bookings", error: error.message });
  }
});

router.post("/", async (req, res) => {
  const maxCreateAttempts = 5;

  for (let attempt = 1; attempt <= maxCreateAttempts; attempt += 1) {
    try {
      const payload = bookingPayload(req.body, await createBookingId());
      const missingFields = validateRequired(payload);

      if (missingFields.length) {
        return res.status(400).json({
          message: `Missing required booking field(s): ${missingFields.join(", ")}`,
        });
      }

      const booking = await StudentBooking.create(payload);
      return res.status(201).json({
        message: "Student booking saved successfully",
        booking: booking.toObject(),
      });
    } catch (error) {
      const duplicateConfirmationNumber =
        error.code === 11000 &&
        (error.keyPattern?.id || error.keyValue?.id);

      if (duplicateConfirmationNumber && attempt < maxCreateAttempts) {
        continue;
      }

      if (duplicateConfirmationNumber) {
        return res.status(409).json({
          message: "Unable to generate a unique booking confirmation number. Please try again.",
        });
      }

      if (error.code === 11000) {
        const duplicateField =
          Object.keys(error.keyPattern || {})[0] ||
          Object.keys(error.keyValue || {})[0] ||
          "booking data";
        return res.status(409).json({
          message: `A booking already exists with the same ${duplicateField}.`,
        });
      }

      return res.status(500).json({
        message: "Error saving student booking",
        error: error.message,
      });
    }
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const status = String(req.body.status || "").trim();
    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({ message: "Status must be Pending, Confirmed, or Rejected" });
    }

    const booking = await StudentBooking.findOneAndUpdate(
      { id: req.params.id },
      { status },
      { new: true, runValidators: true }
    ).lean();

    if (!booking) {
      return res.status(404).json({ message: "Student booking not found" });
    }

    return res.status(200).json({
      message: "Student booking status updated successfully",
      booking,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error updating student booking", error: error.message });
  }
});

export default router;
