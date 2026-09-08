import { BadgeCheck, Eye, Pencil, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import { getStoredUser } from "../utils/auth";
import { canEditModule, canManageUsers, getRoleLabel } from "../utils/permissions";

const Topbar = () => {
  const user = getStoredUser();
  const role = user?.role;

  return (
    <div className="mt-3 w-full px-3 sm:px-4 md:mt-4 md:px-6">
      <div className="responsive-container relative flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm sm:px-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5 sm:gap-3">
          <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 sm:w-auto sm:justify-start">
            <ShieldCheck size={16} />
            {getRoleLabel(role)}
          </span>

          <span className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
            <span className="text-slate-500">User</span>
            <span className="truncate font-semibold text-slate-900">{user?.name || "Unknown User"}</span>
          </span>

          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
            {role === "student" ? <Eye size={14} /> : <Pencil size={14} />}
            <span className="truncate">
              {role === "student" ? "View-only access" : canEditModule(role, "/dashboard/academichub/admission") ? "Edit-enabled access" : "Restricted access"}
            </span>
          </span>
        </div>

        {canManageUsers(role) && (
          <NavLink
            to="/dashboard/admin/registration"
            className={({ isActive }) =>
              `tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-center text-sm font-semibold transition sm:w-auto ${
                isActive
                  ? "bg-indigo-600 text-white shadow"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            <BadgeCheck size={16} />
            {role === "super_admin" ? "Admin Registration Panel" : "Student Registration Panel"}
          </NavLink>
        )}
      </div>
    </div>
  );
};

export default Topbar;
