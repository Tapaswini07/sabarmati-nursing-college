import Fee from "../models/Fee.js";

const FEE_FIELDS = [
  "feePlan", "baseFee", "totalFee", "totalDiscount", "totalFine",
  "totalExtraCharges", "outstandingAmount", "outstandingStatus", "paidAmount",
  "pendingAmount", "lastPaymentDate", "nextDueDate", "scholarshipAmount",
  "scholarshipStatus", "feeStructure", "extraCharges", "examFees", "discounts",
  "fineRules", "paymentHistory", "refunds", "ledgerEntries", "institution",
  "admissionBatch", "currentStudyYear", "feeStructureKey", "activeFeeStructure",
  "feeRevisionHistory",
];

export function applyStoredFees(student, feeRecord) {
  if (!student || !feeRecord) return student;
  for (const field of FEE_FIELDS) {
    if (feeRecord[field] !== undefined) student[field] = feeRecord[field];
  }
  return student;
}

export function buildFeeDocument(student) {
  const feeData = {
    studentRef: student._id,
    registrationNo: student.registrationNo,
    studentName: student.studentName || student.fullName || "",
    institution: student.institution || "",
    course: student.course || "",
    admissionBatch: student.admissionBatch || "",
    currentStudyYear: student.currentStudyYear || 1,
    feeStructureKey: student.feeStructureKey || "",
    activeFeeStructure: student.activeFeeStructure !== false,
    academicYear: student.year || "",
  };
  for (const field of FEE_FIELDS) feeData[field] = student[field];
  return feeData;
}

export async function persistStudentFees(student) {
  if (!student?._id || !student?.registrationNo) return null;
  return Fee.findOneAndUpdate(
    { studentRef: student._id },
    { $set: buildFeeDocument(student) },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

export async function loadStoredFees(student) {
  if (!student?._id) return null;
  return Fee.findOne({ studentRef: student._id });
}
