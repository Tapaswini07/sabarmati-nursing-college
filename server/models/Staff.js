import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    staffType: {
      type: String,
      trim: true,
      enum: ["College Staff", "School Staff"],
      default: "College Staff",
    },
    qualification: { type: String, trim: true, default: "" },
    experience: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    joiningDate: { type: String, trim: true, default: "" },
    staffStatus: { type: String, trim: true, default: "" },
    photoName: { type: String, trim: true, default: "" },
    photoDataUrl: { type: String, trim: true, default: "" },
    documents: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, trim: true, default: "" },
            type: { type: String, trim: true, default: "" },
            sizeLabel: { type: String, trim: true, default: "" },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    staffId: { type: String, trim: true, required: true, unique: true },
    employeeId: { type: String, trim: true, default: "" },
    name: { type: String, trim: true, required: true },
    designation: { type: String, trim: true, required: true },
    department: { type: String, trim: true, required: true },
    paymentMode: { type: String, trim: true, default: "Bank Transfer" },
    status: { type: String, trim: true, default: "Pending" },
    approvedBy: { type: String, trim: true, default: "" },
    approvalDate: { type: String, trim: true, default: "" },
    approvalNote: { type: String, trim: true, default: "" },
    grossSalary: { type: Number, default: 0, min: 0 },
    allowances: { type: Number, default: 0, min: 0 },
    overtime: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    advance: { type: Number, default: 0, min: 0 },
    pf: { type: Number, default: 0, min: 0 },
    esi: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    netSalary: { type: Number, default: 0, min: 0 },
    salaryMonth: { type: String, trim: true, default: "" },
    paidDate: { type: String, trim: true, default: "" },
    bank: { type: String, trim: true, default: "" },
    accountNo: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Staff", staffSchema);
