import { normalizeRole } from "./permissions";

export function getStoredUser() {
  const rawUser = localStorage.getItem("user");
  if (!rawUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(rawUser);
    if (!parsedUser || typeof parsedUser !== "object") {
      return null;
    }

    return {
      ...parsedUser,
      role: normalizeRole(parsedUser.role),
    };
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem("token");
}

export function isAuthenticated() {
  return Boolean(getToken() && getStoredUser());
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
