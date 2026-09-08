import { ArrowRight, Eye, Pencil } from "lucide-react";
import { NavLink } from "react-router-dom";
import { canEditModule, getVisibleMenuData } from "../utils/permissions";

const categoryThemes = {
  "Academic Hub": {
    panel: "from-blue-50 via-white to-cyan-50 border-blue-100",
    tabGlow: "shadow-blue-200/70",
    cardBorder: "border-blue-200/70",
    iconWrap: "bg-blue-600 text-white",
    accentText: "text-blue-700",
    arrow: "text-blue-600",
  },
  "Finance & Account": {
    panel: "from-emerald-50 via-white to-green-50 border-emerald-100",
    tabGlow: "shadow-emerald-200/70",
    cardBorder: "border-emerald-200/70",
    iconWrap: "bg-emerald-600 text-white",
    accentText: "text-emerald-700",
    arrow: "text-emerald-600",
  },
  "Operation & Admin": {
    panel: "from-amber-50 via-white to-yellow-50 border-amber-100",
    tabGlow: "shadow-amber-200/70",
    cardBorder: "border-amber-200/70",
    iconWrap: "bg-amber-500 text-white",
    accentText: "text-amber-700",
    arrow: "text-amber-600",
  },
  "Control System": {
    panel: "from-violet-50 via-white to-purple-50 border-violet-100",
    tabGlow: "shadow-violet-200/70",
    cardBorder: "border-violet-200/70",
    iconWrap: "bg-violet-600 text-white",
    accentText: "text-violet-700",
    arrow: "text-violet-600",
  },
};

const CategoryNavbar = ({ activeMenu, onMenuChange, role }) => {
  const visibleMenuData = getVisibleMenuData(role);
  const categoryNames = Object.keys(visibleMenuData);
  const resolvedActiveMenu = visibleMenuData[activeMenu] ? activeMenu : categoryNames[0];
  const activeCategory = visibleMenuData[resolvedActiveMenu];
  const activeTheme = categoryThemes[resolvedActiveMenu] ?? categoryThemes["Academic Hub"];

  if (!activeCategory) {
    return null;
  }

  return (
    <div className="mt-6 w-full px-2 md:mt-8 md:px-4">
      <div className="flex gap-3 overflow-x-auto border-b border-slate-200 pb-4 scrollbar-hide md:gap-4 md:pb-5">
        {categoryNames.map((menu) => {
          const color = visibleMenuData[menu].color;
          const theme = categoryThemes[menu] ?? categoryThemes["Academic Hub"];
          const isActive = resolvedActiveMenu === menu;

          return (
            <button
              key={menu}
              type="button"
              onClick={() => onMenuChange(menu)}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 md:px-7 md:py-3 md:text-base ${
                isActive
                  ? `${color.active} ${theme.tabGlow} scale-105 shadow-xl`
                  : `${color.light} ${color.hover} border border-white/70 shadow-sm hover:-translate-y-0.5 hover:shadow-md`
              }`}
            >
              {menu}
            </button>
          );
        })}
      </div>

      <div className={`mt-6 rounded-[2rem] border bg-gradient-to-br p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-8 ${activeTheme.panel}`}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${activeTheme.accentText}`}>
              Department Modules
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">{resolvedActiveMenu}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Modules are filtered by your role. Admin can edit admission and attendance, while students can view only their allowed pages.
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Available</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{activeCategory.items.length} Modules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {activeCategory.items.map((item, index) => {
            const color = activeCategory.color;
            const Icon = item.icon;
            const canEdit = canEditModule(role, item.path);

            return (
              <NavLink
                to={item.path}
                key={item.path}
                className={`group relative overflow-hidden rounded-[1.75rem] border ${activeTheme.cardBorder} bg-white/85 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)]`}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.bg} opacity-65 transition duration-300 group-hover:opacity-90`} />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.55),_transparent_28%)]" />

                <div className="relative flex min-h-[120px] items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {Icon && (
                      <div className={`rounded-2xl ${item.iconBg || activeTheme.iconWrap} p-3 shadow-lg shadow-slate-200/60 transition duration-300 group-hover:scale-105 text-white`}>
                        <Icon size={20} />
                      </div>
                    )}

                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${activeTheme.accentText}`}>Module</p>
                      <span className={`${color.text} mt-2 block text-base font-bold text-slate-900 md:text-[1.05rem]`}>{item.name}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                      {canEdit ? <Pencil size={12} /> : <Eye size={12} />}
                      {canEdit ? "Edit" : "View"}
                    </span>
                    <ArrowRight size={20} className={`${activeTheme.arrow} transition duration-300 group-hover:translate-x-1.5`} />
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryNavbar;
