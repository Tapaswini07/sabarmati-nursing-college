import { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import Logo from "../assets/Logo.png";

import {
  clearAuth,
  getStoredUser,
} from "../utils/auth";

import {
  canAccessRoute,
  canManageUsers,
  getRoleLabel,
  normalizeRole,
} from "../utils/permissions";

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
  FileSignature,
} from "lucide-react";


const Sidebar = () => {
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();

  const user = getStoredUser();

  // Always normalize the role before using it.
  const role = normalizeRole(user?.role);


  // ======================================================
  // SIDEBAR NAVIGATION
  // ======================================================

  const navItems = useMemo(
    () =>
      [
        {
          to:
            role === "student"
              ? "/dashboard/student/home"
              : "/dashboard",

          label: "Dashboard",

          icon: LayoutDashboard,

          end: true,
        },

        {
          to: "/dashboard/academichub/admission",

          label: "Admissions",

          icon: Users,
        },

        {
          to: "/dashboard/academichub/attedence",

          label: "Attendance",

          icon: BookOpen,
        },

        {
          to: "/fees",

          label: "Fee Details",

          icon: CreditCard,
        },

        // Finance modules: full access for Finance Admin, view-only for Admin.
        ...(role === "finance_admin" || role === "admin"
          ? [
              {
                to: "/dashboard/finance/bank-book",

                label: "Bank Book",

                icon: CreditCard,
              },

              {
                to: "/dashboard/finance/journal",

                label: "Journal",

                icon: Users,
              },

              {
                to: "/dashboard/finance/contra",

                label: "Contra",

                icon: ShieldCheck,
              },

              {
                to: "/dashboard/finance/balance-sheet",

                label: "Balance Sheet",

                icon: CreditCard,
              },

              {
                to: "/dashboard/finance/profit-loss",

                label: "Profit & Loss",

                icon: CreditCard,
              }
            ]
          : []),

        // Student Booking (NOC): visible for Super Admin, Finance Admin, and Admin.
        ...(role === "super_admin" || role === "finance_admin" || role === "admin"
          ? [
              {
                to: "/dashboard/academichub/noc",

                label: "Student Booking",

                icon: FileSignature,
              },
            ]
          : []),

        // Admin Management is ONLY for Super Admin.
        ...(canManageUsers(role)
          ? [
              {
                to: "/dashboard/admin/registration",

                label:
                  role === "super_admin"
                    ? "Admin Management"
                    : "Student Management",

                icon: UserPlus,
              },
            ]
          : []),
      ].filter((item) => canAccessRoute(role, item.to)),

    [role]
  );


  // ======================================================
  // CLOSE SIDEBAR
  // ======================================================

  const closeSidebar = () => {
    setOpen(false);
  };


  // ======================================================
  // LOGOUT
  // ======================================================

  const handleLogout = () => {
    clearAuth();

    closeSidebar();

    navigate("/login");
  };


  // ======================================================
  // LINK STYLE
  // ======================================================

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-white/20 text-white shadow"
        : "text-gray-200 hover:bg-white/10 hover:text-white"
    }`;


  // ======================================================
  // ROLE DESCRIPTION
  // ======================================================

  const roleDescription = {
    super_admin:
      "Full institutional access, including Academic Hub, Finance, Student Booking, user management, reports, analytics, and settings.",

    admin:
      "Full Academic Hub access with view-only access to Finance and Student Booking. Financial editing is restricted.",

    finance_admin:
      "Full Finance and Student Booking access with view-only access to Academic Hub. Academic editing is restricted.",

    student:
      "View-only access for attendance, admission details, fee receipts, notifications, and personal profile.",
  };


  return (
    <>
      {/* ==================================================
          MOBILE TOP BAR
      ================================================== */}

      <div className="flex items-center justify-between bg-indigo-900 px-4 py-3 text-white shadow-md md:hidden">

        <div className="flex min-w-0 items-center gap-3">

          <img
            src={Logo}
            alt="Sabarmati Hospital and College of Nursing"
            className="h-11 w-11 rounded-xl bg-white/10 object-contain p-1.5"
          />

          <div className="min-w-0">

            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100 sm:text-sm">
              {getRoleLabel(role)}
            </p>

            <p className="truncate text-base font-bold text-white">
              ERP Dashboard
            </p>

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


      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <div
        className={`fixed left-0 top-0 z-50 flex h-dvh min-h-dvh w-[min(18rem,calc(100vw-1rem))] shrink-0 flex-col justify-between overflow-y-auto bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] p-4 text-white shadow-xl backdrop-blur-lg transition-transform duration-300 md:sticky md:w-72 md:p-5 ${
          open
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >

        {/* MOBILE CLOSE */}

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

          {/* ==================================================
              USER / ROLE CARD
          ================================================== */}

          <div className="mb-6 mt-2 rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:mb-8">

            <div className="flex min-w-0 items-center gap-3">

              <img
                src={Logo}
                alt="Sabarmati Hospital and College of Nursing"
                className="h-14 w-14 rounded-[18px] bg-gradient-to-br from-white/15 to-white/5 object-contain p-2.5 shadow-lg"
              />

              <div className="min-w-0">

                <p className="truncate text-[15px] font-extrabold leading-5 text-white">
                  {user?.name || "ERP User"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {getRoleLabel(role)}
                </p>

              </div>

            </div>


            {/* ROLE DESCRIPTION */}

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs leading-5 text-slate-300">

              {roleDescription[role] ||
                "ERP system access."}

            </div>

          </div>


          {/* ==================================================
              NAVIGATION
          ================================================== */}

          <ul className="space-y-2">

            {navItems.map((item) => {

              const Icon = item.icon;

              return (
                <li key={item.to}>

                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={linkClass}
                    onClick={closeSidebar}
                  >

                    <Icon size={18} />

                    {item.label}

                  </NavLink>

                </li>
              );
            })}

          </ul>


          <div className="my-6 border-t border-white/10"></div>


          {/* ==================================================
              SETTINGS
          ================================================== */}

          {canAccessRoute(
            role,
            "/settings"
          ) && (

            <NavLink
              to="/settings"
              className={linkClass}
              onClick={closeSidebar}
            >

              <Settings size={18} />

              Settings

            </NavLink>

          )}


          {/* ==================================================
              SUPER ADMIN INFORMATION
          ================================================== */}

          {role === "super_admin" && (

            <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-4 text-sm text-emerald-100">

              <div className="flex items-center gap-2 font-semibold">

                <ShieldCheck size={16} />

                Super Admin Controls

              </div>

              <p className="mt-2 text-xs leading-5 text-emerald-50">

                User management, reports,
                notifications, institution
                overview, and full ERP module
                access.

              </p>

            </div>

          )}


          {/* ==================================================
              FINANCE ADMIN INFORMATION
          ================================================== */}

          {role === "finance_admin" && (

            <div className="mt-4 rounded-2xl border border-blue-400/15 bg-blue-400/10 p-4 text-sm text-blue-100">

              <div className="flex items-center gap-2 font-semibold">

                <ShieldCheck size={16} />

                Finance Admin Controls

              </div>

              <p className="mt-2 text-xs leading-5 text-blue-50">

                Full Finance and Student
                Booking editing access.
                Academic modules are
                view-only.

              </p>

            </div>

          )}

        </div>


        {/* ==================================================
            LOGOUT
        ================================================== */}

        <div>

          <button
            type="button"
            onClick={handleLogout}
            className="tap-target flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
          >

            <LogOut size={18} />

            Logout

          </button>

        </div>

      </div>


      {/* ==================================================
          MOBILE OVERLAY
      ================================================== */}

      {open && (

        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              closeSidebar();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />

      )}

    </>
  );
};


export default Sidebar;