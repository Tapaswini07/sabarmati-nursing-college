import menuData from "../data/menuData";

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  finance_admin: "Finance Admin",
  student: "Student",
};

export const ROLE_HOME_ROUTES = {
  super_admin: "/dashboard",
  admin: "/dashboard/academichub/admission",
  finance_admin: "/dashboard/finance/contra",
  student: "/dashboard/student/home",
};

export function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

const MODULE_RULES = {
  "/dashboard": ["super_admin", "admin", "finance_admin"],
  "/dashboard/admin/registration": ["super_admin", "admin"],
  "/dashboard/academichub/admission": ["super_admin", "admin", "finance_admin"],
  "/dashboard/academichub/admission/form": ["super_admin", "admin", "finance_admin"],
  "/dashboard/academichub/admission/records": ["super_admin", "admin", "finance_admin"],
  "/dashboard/academichub/attedence": ["super_admin", "admin", "finance_admin"],
  "/dashboard/academichub/exam": ["super_admin", "admin", "finance_admin"],
  "/dashboard/academichub/leave": ["super_admin", "admin", "finance_admin"],
  "/dashboard/academichub/noc": ["super_admin", "admin", "finance_admin"],
  "/dashboard/finance/bank-book": ["super_admin", "admin", "finance_admin"],
  "/dashboard/finance/journal": ["super_admin", "admin", "finance_admin"],
  "/dashboard/finance/contra": ["super_admin", "admin", "finance_admin"],
  "/dashboard/finance/balance-sheet": ["super_admin", "admin", "finance_admin"],
  "/dashboard/finance/profit-loss": ["super_admin", "admin", "finance_admin"],
  "/dashboard/finance/admission-fees": ["super_admin", "admin", "finance_admin"],
  "/dashboard/finance/form-fill-up-fees": ["super_admin", "admin", "finance_admin"],
  "/dashboard/finance/fine-collection": ["super_admin", "admin", "finance_admin"],
  "/dashboard/finance/registration-fees": ["super_admin", "admin", "finance_admin"],
  "/students": ["super_admin", "admin"],
  "/teachers": ["super_admin", "admin"],
  "/fees": ["super_admin", "admin", "student"],
  "/settings": ["super_admin", "admin"],
  "/dashboard/student/home": ["student"],
  "/dashboard/student/admission-details": ["student"],
};

const EDIT_RULES = {
  "/dashboard/academichub/admission": ["super_admin", "admin"],
  "/dashboard/academichub/admission/form": ["super_admin", "admin"],
  "/dashboard/academichub/admission/records": ["super_admin", "admin"],
  "/dashboard/academichub/attedence": ["super_admin", "admin"],
  "/dashboard/academichub/exam": ["super_admin", "admin"],
  "/dashboard/academichub/leave": ["super_admin", "admin"],
  "/dashboard/finance/bank-book": ["super_admin", "finance_admin"],
  "/dashboard/finance/journal": ["super_admin", "finance_admin"],
  "/dashboard/finance/contra": ["super_admin", "finance_admin"],
  "/dashboard/finance/balance-sheet": ["super_admin", "finance_admin"],
  "/dashboard/finance/profit-loss": ["super_admin", "finance_admin"],
  "/dashboard/finance/admission-fees": ["super_admin", "finance_admin"],
  "/dashboard/finance/form-fill-up-fees": ["super_admin", "finance_admin"],
  "/dashboard/finance/fine-collection": ["super_admin", "finance_admin"],
  "/dashboard/finance/registration-fees": ["super_admin", "finance_admin"],
};

export function getRoleLabel(role) {
  return ROLE_LABELS[normalizeRole(role)] || "User";
}

export function getDefaultRouteForRole(role) {
  return ROLE_HOME_ROUTES[normalizeRole(role)] || "/login";
}

export function canAccessRoute(role, path) {
  return (MODULE_RULES[path] || ["super_admin"]).includes(normalizeRole(role));
}

export function canEditModule(role, path) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "super_admin") {
    return true;
  }

  return (EDIT_RULES[path] || []).includes(normalizedRole);
}

export function canManageUsers(role) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "super_admin";
}

export function getCreatableRoles(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "super_admin") {
    return ["admin", "finance_admin"];
  }

  return [];
}

export function getVisibleMenuData(role) {
  return Object.fromEntries(
    Object.entries(menuData)
      .map(([categoryName, category]) => {
        const items = category.items.filter((item) => canAccessRoute(role, item.path));
        return [categoryName, { ...category, items }];
      })
      .filter(([, category]) => category.items.length > 0)
  );
}
