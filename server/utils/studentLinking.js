import mongoose from "mongoose";
import Student from "../models/student.js";

function trimValue(value = "") {
  return String(value || "").trim();
}

function escapeRegex(value = "") {
  return trimValue(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compact(values = []) {
  return [...new Set(values.map(trimValue).filter(Boolean))];
}

async function findUniqueNameMatch(name) {
  const normalizedName = trimValue(name);
  if (!normalizedName) {
    return null;
  }

  const exactName = new RegExp(`^${escapeRegex(normalizedName)}$`, "i");
  const matches = await Student.find({
    $or: [{ studentName: exactName }, { fullName: exactName }],
  }).limit(2);

  return matches.length === 1 ? matches[0] : null;
}

export async function resolveLinkedStudent({ studentId, registrationNo, email, userId, name } = {}) {
  if (studentId) {
    if (mongoose.isValidObjectId(studentId)) {
      const student = await Student.findById(studentId);
      if (student) {
        return student;
      }
    }
  }

  const identifierValues = compact([
    registrationNo,
    userId,
    trimValue(registrationNo).toUpperCase(),
    trimValue(userId).toUpperCase(),
  ]);

  if (identifierValues.length > 0) {
    const student = await Student.findOne({
      $or: [
        { registrationNo: { $in: identifierValues } },
        { admissionNumber: { $in: identifierValues } },
        { applicationId: { $in: identifierValues } },
      ],
    });

    if (student) {
      return student;
    }
  }

  const normalizedEmail = trimValue(email);
  if (normalizedEmail) {
    const student = await Student.findOne({
      email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
    });

    if (student) {
      return student;
    }
  }

  return findUniqueNameMatch(name);
}

export async function loadLinkedStudentForUser(user, options = {}) {
  const { persistRepair = true } = options;
  if (!user) {
    return null;
  }

  const linkedStudent = await resolveLinkedStudent({
    studentId: user.linkedStudentId,
    email: user.email,
    userId: user.userId,
    name: user.name,
  });

  if (
    linkedStudent &&
    persistRepair &&
    (!user.linkedStudentId || String(user.linkedStudentId) !== String(linkedStudent._id))
  ) {
    user.linkedStudentId = linkedStudent._id;
    await user.save();
  }

  return linkedStudent;
}
