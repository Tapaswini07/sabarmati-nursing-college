import { useMemo, useState } from "react";
import {
  BookOpen,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import Logo from "../assets/Logo.png";
import { clearAuth, getStoredUser } from "../utils/auth";
import { canAccessRoute, canManageUsers, getRoleLabel } from "../utils/permissions";

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = getStoredUser();
  const role = user?.role;

  const navItems = useMemo(
    () =>
      [
        { to: role === "student" ? "/dashboard/student/home" : "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
        { to: "/dashboard/academichub/admission", label: "Admissions", icon: Users },
        { to: "/dashboard/academichub/attedence", label: "Attendance", icon: BookOpen },
        { to: "/fees", label: "Fee Details", icon: CreditCard },
        ...(canManageUsers(role)
          ? [{ to: "/dashboard/admin/registration", label: role === "super_admin" ? "Admin Management" : "Student Management", icon: UserPlus }]
          : []),
      ].filter((item) => canAccessRoute(role, item.to)),
    [role]
  );

  const closeSidebar = () => setOpen(false);

  const handleLogout = () => {
    clearAuth();
    closeSidebar();
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-white/20 text-white shadow"
        : "text-gray-200 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <>
      <div className="flex items-center justify-between bg-indigo-900 px-4 py-3 text-white shadow-md md:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={Logo}
            alt="Sabaramati Hospital and College of Nursing"
            className="h-11 w-11 rounded-xl bg-white/10 object-contain p-1.5"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100 sm:text-sm">
              {getRoleLabel(role)}
            </p>
            <p className="truncate text-base font-bold text-white">ERP Dashboard</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap-target rounded-lg p-2 transition hover:bg-white/10"
          aria-label="Open sidebar"
        >
          <Menu size={22} />
        </button>
      </div>

      <div
        className={`fixed left-0 top-0 z-50 flex h-dvh min-h-dvh w-[min(18rem,calc(100vw-1rem))] shrink-0 flex-col justify-between overflow-y-auto bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] p-4 text-white shadow-xl backdrop-blur-lg transition-transform duration-300 md:sticky md:w-72 md:p-5 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="mb-2 flex justify-end md:hidden">
          <button
            type="button"
            onClick={closeSidebar}
            className="tap-target rounded-lg p-2 transition hover:bg-white/10 hover:text-red-300"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div>
          <div className="mb-6 mt-2 rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:mb-8">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={Logo}
                alt="Sabaramati Hospital and College of Nursing"
                className="h-14 w-14 rounded-[18px] bg-gradient-to-br from-white/15 to-white/5 object-contain p-2.5 shadow-lg"
              />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold leading-5 text-white">{user?.name || "ERP User"}</p>
                <p className="mt-1 text-xs text-slate-400">{getRoleLabel(role)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs leading-5 text-slate-300">
              {role === "super_admin" && "Full institutional access, user role control, departments, reports, analytics, and settings."}
              {role === "admin" && "View-only access to dashboard modules, including Finance. Editing is restricted to Super Admin."}
              {role === "student" && "View-only access for attendance, admission details, fee receipts, notifications, and personal profile."}
            </div>
          </div>

          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={linkClass} onClick={closeSidebar}>
                    <Icon size={18} /> {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>

          <div className="my-6 border-t border-white/10"></div>

          {canAccessRoute(role, "/settings") && (
            <NavLink to="/settings" className={linkClass} onClick={closeSidebar}>
              <Settings size={18} /> Settings
            </NavLink>
          )}

          {role === "super_admin" && (
            <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck size={16} />
                Super Admin Controls
              </div>
              <p className="mt-2 text-xs leading-5 text-emerald-50">
                User management, reports, notifications, institution overview, and full ERP module access.
              </p>
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={handleLogout}
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;
