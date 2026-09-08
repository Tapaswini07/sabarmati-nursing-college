import mongoose from "mongoose";

const auditEntrySchema = new mongoose.Schema(
  {
    action: { type: String, trim: true, default: "" },
    actor: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    timestamp: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const departmentBudgetSchema = new mongoose.Schema(
  {
    budgetId: { type: String, trim: true, required: true },
    department: { type: String, trim: true, required: true },
    institutionGroup: { type: String, trim: true, default: "" },
    semester: { type: String, trim: true, default: "Annual" },
    financialYear: { type: String, trim: true, default: "" },
    academicYear: { type: String, trim: true, default: "" },
    yearlyBudget: { type: Number, default: 0, min: 0 },
    semesterBudget: { type: Number, default: 0, min: 0 },
    approvedBudget: { type: Number, default: 0, min: 0 },
    utilizedBudget: { type: Number, default: 0, min: 0 },
    pendingBudget: { type: Number, default: 0, min: 0 },
    carryForwardAmount: { type: Number, default: 0, min: 0 },
    remainingBudget: { type: Number, default: 0, min: 0 },
    utilizationPercentage: { type: Number, default: 0, min: 0 },
    status: { type: String, trim: true, default: "Approved" },
    approvedBy: { type: String, trim: true, default: "" },
    remarks: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    expenseId: { type: String, trim: true, required: true },
    department: { type: String, trim: true, required: true },
    category: { type: String, trim: true, required: true },
    tag: { type: String, trim: true, required: true },
    semester: { type: String, trim: true, default: "Annual" },
    amount: { type: Number, default: 0, min: 0 },
    requestedBy: { type: String, trim: true, default: "" },
    requestedAt: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "Pending" },
    currentStage: { type: String, trim: true, default: "Pending HOD" },
    balanceNote: { type: String, trim: true, default: "" },
    remarks: { type: String, trim: true, default: "" },
    auditTrail: { type: [auditEntrySchema], default: [] },
  },
  { _id: false }
);

const hostelLedgerSchema = new mongoose.Schema(
  {
    ledgerId: { type: String, trim: true, required: true },
    studentName: { type: String, trim: true, required: true },
    registrationNo: { type: String, trim: true, required: true },
    roomNo: { type: String, trim: true, default: "" },
    amount: { type: Number, default: 0, min: 0 },
    paymentDate: { type: String, trim: true, default: "" },
    paymentMode: { type: String, trim: true, default: "UPI" },
    receiptNumber: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "Collected" },
  },
  { _id: false }
);

const alertSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    level: { type: String, trim: true, default: "info" },
    createdAtLabel: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const departmentFinanceSchema = new mongoose.Schema(
  {
    moduleKey: { type: String, trim: true, required: true, unique: true },
    institutionUnits: {
      type: [
        new mongoose.Schema(
          {
            title: { type: String, trim: true, default: "" },
            items: { type: [String], default: [] },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    departmentBudgets: { type: [departmentBudgetSchema], default: [] },
    expenses: { type: [expenseSchema], default: [] },
    hostelLedgers: { type: [hostelLedgerSchema], default: [] },
    alerts: { type: [alertSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("DepartmentFinance", departmentFinanceSchema);
