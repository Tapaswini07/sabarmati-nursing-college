import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { attachCurrentUser, verifyToken } from "../middleware/AuthMiddleware.js";
import { ROLE_LABELS, ROLES } from "../constants/roles.js";
import { resolveLinkedStudent } from "../utils/studentLinking.js";

const router = express.Router();

function normalizeIdentifier(value = "") {
  return String(value).trim();
}

function upperIdentifier(value = "") {
  return normalizeIdentifier(value).toUpperCase();
}

function buildUserResponse(user) {
  return {
    id: user._id,
    name: user.name || "",
    email: user.email,
    userId: user.userId || "",
    role: user.role,
    roleLabel: ROLE_LABELS[user.role] || user.role,
    linkedStudentId: user.linkedStudentId || null,
  };
}

function canCurrentUserManageRole(currentRole, targetRole) {
  if (currentRole === ROLES.SUPER_ADMIN) {
    return [ROLES.ADMIN, ROLES.STUDENT].includes(targetRole);
  }

  if (currentRole === ROLES.ADMIN) {
    return targetRole === ROLES.STUDENT;
  }

  return false;
}

router.post("/login", async (req, res) => {
  const identifier = normalizeIdentifier(req.body.identifier || req.body.email || req.body.userId);
  const password = req.body.password;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Email/User ID and password are required" });
  }

  try {
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { userId: upperIdentifier(identifier) }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/me", verifyToken, attachCurrentUser, async (req, res) => {
  return res.status(200).json({ user: buildUserResponse(req.currentUser) });
});

router.post("/register", verifyToken, attachCurrentUser, async (req, res) => {
  const { name, email, password, role, userId, studentId, registrationNo } = req.body;

  if (!name || !email || !password || !role || !userId) {
    return res.status(400).json({
      message: "Name, email, user ID, password, and role are required",
    });
  }

  if (![ROLES.ADMIN, ROLES.STUDENT].includes(role)) {
    return res.status(400).json({ message: "Only Admin and Student accounts can be created here" });
  }

  if (!canCurrentUserManageRole(req.currentUser.role, role)) {
    return res.status(403).json({
      message:
        role === ROLES.ADMIN
          ? "Only Super Admin can create Admin accounts"
          : "Only Super Admin or Admin can create Student accounts",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters long" });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUserId = upperIdentifier(userId);

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { userId: normalizedUserId }],
    });
    if (existingUser) {
      return res.status(400).json({ message: "Email or User ID already exists" });
    }

    let linkedStudent = null;
    if (role === ROLES.STUDENT) {
      linkedStudent = await resolveLinkedStudent({ studentId, registrationNo, email: normalizedEmail });
      if (!linkedStudent) {
        return res.status(400).json({
          message: "Student account must be linked to an existing admission/student record",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      userId: normalizedUserId,
      password: hashedPassword,
      role,
      linkedStudentId: linkedStudent?._id || null,
      createdBy: req.currentUser._id,
    });

    return res.status(201).json({
      message: `${ROLE_LABELS[role]} account created successfully`,
      user: buildUserResponse(newUser),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/users", verifyToken, attachCurrentUser, async (req, res) => {
  try {
    let filter = {};

    if (req.currentUser.role === ROLES.SUPER_ADMIN) {
      filter = { role: { $in: [ROLES.ADMIN, ROLES.STUDENT] } };
    } else if (req.currentUser.role === ROLES.ADMIN) {
      filter = { role: ROLES.STUDENT, createdBy: req.currentUser._id };
    } else {
      return res.status(403).json({ message: "You are not allowed to view managed users" });
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .select("-password -passwordResetToken -passwordResetExpiresAt");

    return res.status(200).json({
      users: users.map((item) => buildUserResponse(item)),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load managed users", error: error.message });
  }
});

router.patch("/users/:id", verifyToken, attachCurrentUser, async (req, res) => {
  if (req.currentUser.role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({ message: "Only Super Admin can edit managed accounts" });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (![ROLES.ADMIN, ROLES.STUDENT].includes(user.role)) {
      return res.status(403).json({ message: "Super Admin accounts cannot be edited here" });
    }

    const nextName = req.body.name?.trim();
    const nextEmail = req.body.email?.trim().toLowerCase();
    const nextUserId = req.body.userId?.trim().toUpperCase();
    const nextPassword = req.body.password;
    const nextRole = req.body.role?.trim();
    const nextStudentId = req.body.studentId?.trim();
    const nextRegistrationNo = req.body.registrationNo?.trim();

    if (nextRole && ![ROLES.ADMIN, ROLES.STUDENT].includes(nextRole)) {
      return res.status(400).json({ message: "Managed role must be Admin or Student" });
    }

    if (nextEmail && nextEmail !== user.email) {
      const existingEmail = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      user.email = nextEmail;
    }

    if (nextUserId && nextUserId !== user.userId) {
      const existingUserId = await User.findOne({ userId: nextUserId, _id: { $ne: user._id } });
      if (existingUserId) {
        return res.status(400).json({ message: "User ID already exists" });
      }
      user.userId = nextUserId;
    }

    if (nextName) {
      user.name = nextName;
    }

    if (nextRole) {
      user.role = nextRole;
    }

    if (
      user.role === ROLES.STUDENT &&
      (nextStudentId || nextRegistrationNo || nextEmail || nextUserId || nextName || nextRole === ROLES.STUDENT)
    ) {
      const linkedStudent = await resolveLinkedStudent({
        studentId: nextStudentId || user.linkedStudentId,
        registrationNo: nextRegistrationNo,
        email: nextEmail || user.email,
        userId: nextUserId || user.userId,
        name: nextName || user.name,
      });

      if (!linkedStudent) {
        return res.status(400).json({
          message: "Student account must be linked to an existing admission/student record",
        });
      }

      user.linkedStudentId = linkedStudent._id;
    } else if (user.role !== ROLES.STUDENT) {
      user.linkedStudentId = null;
    }

    if (nextPassword) {
      if (nextPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      user.password = await bcrypt.hash(nextPassword, 10);
    }

    await user.save();

    return res.status(200).json({
      message: `${ROLE_LABELS[user.role]} account updated successfully`,
      user: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update user", error: error.message });
  }
});

router.delete("/users/:id", verifyToken, attachCurrentUser, async (req, res) => {
  if (req.currentUser.role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({ message: "Only Super Admin can delete managed accounts" });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (![ROLES.ADMIN, ROLES.STUDENT].includes(user.role)) {
      return res.status(403).json({ message: "Super Admin accounts cannot be deleted here" });
    }

    await User.findByIdAndDelete(user._id);

    return res.status(200).json({ message: `${ROLE_LABELS[user.role]} account deleted successfully` });
  } catch (error) {
    return res.status(500).json({ message: "Unable to delete user", error: error.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  const identifier = normalizeIdentifier(req.body.identifier || req.body.email || req.body.userId);

  if (!identifier) {
    return res.status(400).json({ message: "Email or User ID is required" });
  }

  try {
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { userId: upperIdentifier(identifier) }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(16).toString("hex");
    user.passwordResetToken = await bcrypt.hash(resetToken, 10);
    user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    return res.status(200).json({
      message: "Password reset token generated. Use it within 15 minutes to set a new password.",
      resetToken,
      expiresAt: user.passwordResetExpiresAt,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to start password reset", error: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  const identifier = normalizeIdentifier(req.body.identifier || req.body.email || req.body.userId);
  const resetToken = normalizeIdentifier(req.body.resetToken);
  const newPassword = req.body.newPassword;

  if (!identifier || !resetToken || !newPassword) {
    return res.status(400).json({
      message: "Email/User ID, reset token, and new password are required",
    });
  }

  try {
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { userId: upperIdentifier(identifier) }],
    });

    if (!user || !user.passwordResetToken || !user.passwordResetExpiresAt) {
      return res.status(400).json({ message: "No active password reset request was found" });
    }

    if (new Date(user.passwordResetExpiresAt) < new Date()) {
      return res.status(400).json({ message: "Reset token has expired. Please request a new one." });
    }

    const validToken = await bcrypt.compare(resetToken, user.passwordResetToken);
    if (!validToken) {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = "";
    user.passwordResetExpiresAt = null;
    await user.save();

    return res.status(200).json({
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to reset password", error: error.message });
  }
});

export default router;
