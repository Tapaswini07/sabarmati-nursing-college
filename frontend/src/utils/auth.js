import { getDefaultRouteForRole } from "./permissions";

export function getStoredUser() {
  const rawUser = localStorage.getItem("user");
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
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
