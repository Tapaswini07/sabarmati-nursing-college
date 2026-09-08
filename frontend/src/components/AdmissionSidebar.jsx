import { useState } from "react";
import {
  BookOpen,
  CreditCard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import Logo from "../assets/Logo.png";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Users },
  { to: "/students", label: "Admissions", icon: Users },
  { to: "/teachers", label: "Teachers", icon: BookOpen },
  { to: "/dashboard/academichub/attedence", label: "Attendance", icon: BookOpen },
  { to: "/fees", label: "Fee", icon: CreditCard },
];

function AdmissionSidebar() {
  const [open, setOpen] = useState(false);

  const closeSidebar = () => setOpen(false);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition ${
      isActive
        ? "bg-white/16 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        : "text-slate-200 hover:bg-white/8 hover:text-white"
    }`;

  return (
    <>
      <div className="flex items-center justify-between bg-[#131c31] px-4 py-4 text-white shadow-md lg:hidden">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8 p-2">
            <img
              src={Logo}
              alt="Sabaramati Hospital College of Nursing"
              className="h-9 w-9 rounded-full object-cover"
            />
          </span>
          <div>
            <p className="text-base font-bold leading-5 text-white">
              Sabaramati Hospital
            </p>
            <p className="text-sm text-slate-300">College of Nursing</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl p-2 transition hover:bg-white/10"
          aria-label="Open admission sidebar"
        >
          <Menu size={22} />
        </button>
      </div>

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[300px] flex-col bg-[linear-gradient(180deg,#11192d_0%,#1b263b_100%)] px-5 py-6 text-white shadow-2xl transition-transform duration-300 lg:sticky lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-3 flex justify-end lg:hidden">
          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-xl p-2 transition hover:bg-white/10"
            aria-label="Close admission sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-white/10 p-2.5">
                <img
                  src={Logo}
                  alt="Sabaramati Hospital College of Nursing"
                  className="h-11 w-11 rounded-full object-cover"
                />
              </span>
              <div>
                <p className="text-[1.05rem] font-extrabold leading-6 text-white">
                  Sabaramati Hospital
                </p>
                <p className="mt-1 text-base text-slate-300">
                  College of Nursing
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-10 space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={linkClass}
                  onClick={closeSidebar}
                >
                  <Icon size={20} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="my-8 border-t border-white/10" />

          <NavLink to="/settings" className={linkClass} onClick={closeSidebar}>
            <Settings size={20} />
            Settings
          </NavLink>
        </div>

        <NavLink
          to="/logout"
          onClick={closeSidebar}
          className="mt-6 flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
        >
          <LogOut size={20} />
          Logout
        </NavLink>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-slate-950/55 lg:hidden"
          onClick={closeSidebar}
        />
      )}
    </>
  );
}

export default AdmissionSidebar;
