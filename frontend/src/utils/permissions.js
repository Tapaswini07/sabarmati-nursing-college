import menuData from "../data/menuData";

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  finance_admin: "Finance Admin",
  student: "Student",
};

export const ROLE_HOME_ROUTES = {
  super_admin: "/dashboard",
  admin: "/dashboard",
  finance_admin: "/dashboard",
  student: "/dashboard/student/home",
};

export function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

const MODULE_RULES = {
  // Dashboard
  "/dashboard": ["super_admin", "admin", "finance_admin"],

  // Admin management
  // Only Super Admin and Admin can access this route.
  "/dashboard/admin/registration": ["super_admin", "admin"],

  // =========================
  // ACADEMIC HUB
  // =========================

  "/dashboard/academichub/admission": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/dashboard/academichub/admission/form": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/dashboard/academichub/admission/records": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/dashboard/academichub/attedence": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/dashboard/academichub/exam": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/dashboard/academichub/leave": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  // Student Booking / NOC
  // Everyone who can access Academic Hub can SEE it.
  "/dashboard/academichub/noc": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  // =========================
  // FINANCE
  // =========================

  "/dashboard/finance/bank-book": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/dashboard/finance/journal": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/dashboard/finance/contra": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/dashboard/finance/balance-sheet": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/dashboard/finance/profit-loss": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/dashboard/finance/admission-fees": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/dashboard/finance/form-fill-up-fees": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/dashboard/finance/fine-collection": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/dashboard/finance/registration-fees": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  // =========================
  // OTHER MODULES
  // =========================

  "/students": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/teachers": [
    "super_admin",
    "admin",
    "finance_admin",
  ],

  "/fees": [
    "super_admin",
    "admin",
    "finance_admin",
    "student",
  ],

  "/settings": [
    "super_admin",
    "admin",
  ],

  // =========================
  // STUDENT
  // =========================

  "/dashboard/student/home": [
    "student",
  ],

  "/dashboard/student/admission-details": [
    "student",
  ],
};


// ======================================================
// EDIT PERMISSIONS
// ======================================================

const EDIT_RULES = {
  // =========================
  // ACADEMIC HUB
  // =========================

  // Only Super Admin + Admin can edit Academic Hub
  "/dashboard/academichub/admission": [
    "super_admin",
    "admin",
  ],

  "/dashboard/academichub/admission/form": [
    "super_admin",
    "admin",
  ],

  "/dashboard/academichub/admission/records": [
    "super_admin",
    "admin",
  ],

  "/dashboard/academichub/attedence": [
    "super_admin",
    "admin",
  ],

  "/dashboard/academichub/exam": [
    "super_admin",
    "admin",
  ],

  "/dashboard/academichub/leave": [
    "super_admin",
    "admin",
  ],

  // Student Booking:
  // Super Admin + Finance Admin can edit.
  // Admin = view only.
  "/dashboard/academichub/noc": [
    "super_admin",
    "finance_admin",
  ],


  // =========================
  // FINANCE
  // =========================

  // Super Admin + Finance Admin can edit.
  // Admin = view only.

  "/dashboard/finance/bank-book": [
    "super_admin",
    "finance_admin",
  ],

  "/dashboard/finance/journal": [
    "super_admin",
    "finance_admin",
  ],

  "/dashboard/finance/contra": [
    "super_admin",
    "finance_admin",
  ],

  "/dashboard/finance/balance-sheet": [
    "super_admin",
    "finance_admin",
  ],

  "/dashboard/finance/profit-loss": [
    "super_admin",
    "finance_admin",
  ],

  "/dashboard/finance/admission-fees": [
    "super_admin",
    "finance_admin",
  ],

  "/dashboard/finance/form-fill-up-fees": [
    "super_admin",
    "finance_admin",
  ],

  "/dashboard/finance/fine-collection": [
    "super_admin",
    "finance_admin",
  ],

  "/dashboard/finance/registration-fees": [
    "super_admin",
    "finance_admin",
  ],
};


// ======================================================
// ROLE HELPERS
// ======================================================

export function getRoleLabel(role) {
  const normalizedRole = normalizeRole(role);

  return ROLE_LABELS[normalizedRole] || "User";
}


export function getDefaultRouteForRole(role) {
  const normalizedRole = normalizeRole(role);

  return ROLE_HOME_ROUTES[normalizedRole] || "/login";
}


// ======================================================
// ROUTE ACCESS
// ======================================================

export function canAccessRoute(role, path) {
  const normalizedRole = normalizeRole(role);

  const allowedRoles = MODULE_RULES[path];

  // Unknown routes are allowed only for Super Admin.
  if (!allowedRoles) {
    return normalizedRole === "super_admin";
  }

  return allowedRoles.includes(normalizedRole);
}


// ======================================================
// EDIT ACCESS
// ======================================================

export function canEditModule(role, path) {
  const normalizedRole = normalizeRole(role);

  // Super Admin can edit everything.
  if (normalizedRole === "super_admin") {
    return true;
  }

  const allowedRoles = EDIT_RULES[path] || [];

  return allowedRoles.includes(normalizedRole);
}


// ======================================================
// USER MANAGEMENT
// ======================================================

export function canManageUsers(role) {
  const normalizedRole = normalizeRole(role);

  // Only Super Admin can create/manage admins.
  return normalizedRole === "super_admin";
}


export function getCreatableRoles(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "super_admin") {
    return [
      "admin",
      "finance_admin",
    ];
  }

  return [];
}


// ======================================================
// MENU
// ======================================================

export function getVisibleMenuData(role) {
  const normalizedRole = normalizeRole(role);

  const safeMenuData =
    menuData && typeof menuData === "object"
      ? menuData
      : {};

  return Object.fromEntries(
    Object.entries(safeMenuData)
      .map(([categoryName, category]) => {
        const safeItems = Array.isArray(category?.items)
          ? category.items
          : [];

        const items = safeItems.filter(
          (item) =>
            item?.path &&
            canAccessRoute(normalizedRole, item.path)
        );

        return [
          categoryName,
          {
            ...category,
            items,
          },
        ];
      })
      .filter(
        ([, category]) =>
          Array.isArray(category.items) &&
          category.items.length > 0
      )
  );
}