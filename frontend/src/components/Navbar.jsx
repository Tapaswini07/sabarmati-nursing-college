import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { GraduationCap, Menu, X } from "lucide-react";
import logoImage from "../assets/Logo.png";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/student-admission", label: "Student Admission" },
  { to: "/teacher-admission", label: "Teacher Admission" },
];

function Navbar({ officialBranding = false }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-slate-950/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className={`text-white ${officialBranding ? "w-full max-w-[320px] md:w-auto" : ""}`}
        >
          {officialBranding ? (
            <span className="flex items-center gap-4 rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.22)] transition hover:bg-white/[0.08]">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-white/10 p-2">
                <img
                  src={logoImage}
                  alt="Sabaramati Hospital and College of Nursing"
                  className="h-11 w-11 rounded-full object-cover"
                />
              </span>
              <span className="flex flex-col">
                <span className="text-[1.05rem] font-extrabold leading-6 text-white sm:text-[1.15rem]">
                  Sabaramati Hospital
                </span>
                <span className="mt-1 text-sm text-slate-300 sm:text-base">
                  College of Nursing
                </span>
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-900/30">
                <GraduationCap size={22} />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">EduFlow</span>
                <span className="text-lg font-bold text-white">Campus Workspace</span>
              </span>
            </span>
          )}
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
          aria-label="Toggle navigation"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-slate-950/95 px-4 py-4 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-cyan-500 text-slate-950"
                      : "text-slate-100 hover:bg-white/10"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
