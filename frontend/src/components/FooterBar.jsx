import { GraduationCap, Mail, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";

const FooterBar = () => {
  return (
    <footer className="border-t border-slate-200 bg-gray-50 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <GraduationCap size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Sabaramati Hospital & College of Nursing
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Official academic administration dashboard for admissions, finance,
              attendance, and institutional operations.
            </p>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              Mahanadi Vihar, Cuttack, Odisha - 753004
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:justify-end">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 sm:text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
              <ShieldCheck size={14} />
              Secure Admin Access
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
              <Mail size={14} />
              admin@sabaramati.edu
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <NavLink
              to="/dashboard"
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:text-sm"
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/dashboard/login"
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:text-sm"
            >
              Admin Login
            </NavLink>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-7xl flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} <b>A unit of Sabaramati Educational Charitable Trust</b>. All rights reserved</p>
        <p>Powered by-<b>Naval Solution</b></p>
      </div>
    </footer>
  );
};

export default FooterBar;
