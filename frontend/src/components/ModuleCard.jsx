import { ArrowRight, Eye, Pencil } from "lucide-react";
import { NavLink } from "react-router-dom";
import { canEditModule } from "../utils/permissions";

const ModuleCard = ({ item, index, theme, role }) => {
  if (!item || !item.path) {
    return null;
  }

  const Icon = item.icon;
  const canEdit = canEditModule(role, item.path);

  const iconClass = item.iconBg || theme.iconWrap;

  const backgroundClass = item.bg || "";

  const cardTitleClass = theme.text || "text-slate-900";

  return (
    <NavLink
      to={item.path}
      key={item.path}
      className={
        "group relative overflow-hidden rounded-[1.75rem] " +
        "border " +
        theme.cardBorder +
        " bg-white/85 p-5 shadow-sm transition-all duration-300 " +
        "hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)]"
      }
      style={{
        animationDelay: index * 90 + "ms",
      }}
    >

      {/* Background */}
      <div
        className={
          "pointer-events-none absolute inset-0 " +
          "bg-gradient-to-br " +
          backgroundClass +
          " opacity-65 transition duration-300 " +
          "group-hover:opacity-90"
        }
      />

      {/* Card content */}
      <div className="relative flex min-h-[120px] items-center justify-between gap-4">

        <div className="flex items-center gap-4">

          {Icon && (
            <div
              className={
                "rounded-2xl " +
                iconClass +
                " p-3 text-white shadow-lg transition duration-300 " +
                "group-hover:scale-105"
              }
            >
              <Icon size={20} />
            </div>
          )}

          <div>
            <p
              className={
                "text-xs font-semibold uppercase tracking-[0.22em] " +
                theme.accentText
              }
            >
              Module
            </p>

            <span
              className={
                cardTitleClass +
                " mt-2 block text-base font-bold md:text-[1.05rem]"
              }
            >
              {item.name}
            </span>
          </div>

        </div>

        {/* Permission indicator */}
        <div className="flex flex-col items-end gap-3">

          <span className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
            {canEdit ? (
              <Pencil size={12} />
            ) : (
              <Eye size={12} />
            )}

            {canEdit ? "Edit" : "View"}
          </span>

          <ArrowRight
            size={20}
            className={
              theme.arrow +
              " transition duration-300 group-hover:translate-x-1.5"
            }
          />

        </div>
      </div>

    </NavLink>
  );
};

export default ModuleCard;
