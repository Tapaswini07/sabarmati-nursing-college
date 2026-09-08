import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ROLES } from "../constants/roles.js";

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

// Verifies JWT — attach decoded payload to req.user
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;   // { id, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Allow only specific roles — use AFTER verifyToken
// Usage: router.get("/admin-only", verifyToken, requireRole("admin"), handler)
export const requireRole = (...roles) => (req, res, next) => {
  const resolvedRole = normalizeRole(req.currentUser?.role || req.user?.role);
  const allowedRoles = roles.map(normalizeRole);

  if (!allowedRoles.includes(resolvedRole))
    return res.status(403).json({ message: "Access denied: insufficient role" });
  next();
};

export const attachCurrentUser = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user?.id).select("-password -passwordResetToken");
    if (!currentUser) {
      return res.status(401).json({ message: "User session is no longer valid" });
    }

    req.currentUser = currentUser;
    next();
  } catch {
    return res.status(500).json({ message: "Unable to load current user" });
  }
};

export const requireAdminOrSuperAdmin = (req, res, next) => {
  const resolvedRole = normalizeRole(req.currentUser?.role || req.user?.role);

  if (![ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(resolvedRole)) {
    return res.status(403).json({ message: "Access denied: insufficient role" });
  }

  if (resolvedRole === ROLES.ADMIN && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return res.status(403).json({ message: "Only Super Admin can modify dashboard data" });
  }

  next();
};
