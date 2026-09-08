import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BellRing,
  BriefcaseBusiness,
  CircleGauge,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import CategoryNavbar from "../components/CategoryNavbar";
import { getStoredUser } from "../utils/auth";
import { getRoleLabel, getVisibleMenuData } from "../utils/permissions";
import campusBackground from "../assets/campus-background.jpeg";

const roleDescriptions = {
  super_admin: "Full ERP access across student management, attendance, admissions, accounts, payroll, reports, hostel, dashboard, and settings.",
  admin: "Admin can edit admission and attendance modules, create student accounts, and view all remaining modules in read-only mode.",
  student: "Student can view attendance, admission details, fee receipts, notifications, and personal profile with no edit access.",
};

const roleHighlights = {
  super_admin: [
    "User Management",
    "Admin Registration Panel",
    "Financial Analytics",
    "Reports & Notifications",
    "Institution Overview",
  ],
  admin: [
    "Student Management",
    "Attendance Dashboard",
    "Admission Dashboard",
    "Student Reports",
    "View-only ERP Modules",
  ],
  student: [
    "Personal Profile",
    "Attendance Status",
    "Admission Information",
    "Fee Details",
    "Notifications",
  ],
};

const Dashboard = () => {
  const user = getStoredUser();
  const role = user?.role || "student";
  const visibleMenuData = getVisibleMenuData(role);
  const initialMenu = Object.keys(visibleMenuData)[0];
  const [activeMenu, setActiveMenu] = useState(initialMenu);

  const resolvedMenuData = getVisibleMenuData(role);
  const resolvedActiveMenu = resolvedMenuData[activeMenu] ? activeMenu : Object.keys(resolvedMenuData)[0];
  const activeCategory = resolvedMenuData[resolvedActiveMenu];

  const summary = useMemo(() => {
    const totalModules = Object.values(resolvedMenuData).reduce((sum, category) => sum + category.items.length, 0);
    const categoryCount = Object.keys(resolvedMenuData).length;

    return {
      totalModules,
      categoryCount,
      roleLabel: getRoleLabel(role),
    };
  }, [resolvedMenuData, role]);

  return (
    <section className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.10),_transparent_28%),linear-gradient(180deg,#f3f7fb_0%,#eef4f8_52%,#f8fafc_100%)] p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="responsive-container rounded-3xl border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)] md:rounded-[32px]">
        <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 md:rounded-[32px] md:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.10),_transparent_22%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.10),_transparent_26%)]" />

          <div className="relative">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div
                className="rounded-[28px] bg-cover bg-center p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] md:p-8"
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(22, 50, 86, 0.82) 48%, rgba(15, 118, 110, 0.74) 100%), url(${campusBackground})`,
                }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                    <Sparkles size={14} />
                    Official Dashboard
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
                    <ShieldCheck size={14} />
                    {summary.roleLabel}
                  </span>
                </div>

                <h1 className="safe-break mt-5 max-w-3xl text-2xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                  Welcome to {summary.roleLabel} Dashboard
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
                  {roleDescriptions[role]}
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">Role</p>
                    <p className="mt-2 text-3xl font-bold text-white">{summary.roleLabel}</p>
                    <p className="mt-2 text-sm text-slate-300">Current access level</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">Categories</p>
                    <p className="mt-2 text-3xl font-bold text-white">{summary.categoryCount}</p>
                    <p className="mt-2 text-sm text-slate-300">Visible dashboard sections</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">Modules</p>
                    <p className="mt-2 text-3xl font-bold text-white">{summary.totalModules}</p>
                    <p className="mt-2 text-sm text-slate-300">Accessible modules</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                        Role Overview
                      </p>
                      <h2 className="mt-3 text-2xl font-bold text-slate-900">{summary.roleLabel}</h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Signed in as {user?.name || "ERP User"} with role-specific workflow visibility and module permissions.
                      </p>
                    </div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <BriefcaseBusiness size={22} />
                    </span>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_100%)] p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                    Current Focus
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-3xl font-black text-slate-900">{activeCategory?.items.length || 0}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Modules available in {resolvedActiveMenu}.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1.5 text-sm font-semibold text-sky-700">
                      Explore
                      <ArrowUpRight size={16} />
                    </span>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                    Dashboard Highlights
                  </p>
                  <div className="mt-4 grid gap-3">
                    {roleHighlights[role].map((item, index) => {
                      const icons = [UsersRound, BellRing, FileSpreadsheet, CircleGauge, ShieldCheck];
                      const Icon = icons[index % icons.length];
                      return (
                        <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white/90">
                          <Icon size={16} />
                          {item}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {role !== "student" && (
              <div className="mt-8 rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
                <CategoryNavbar activeMenu={resolvedActiveMenu} onMenuChange={setActiveMenu} role={role} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
