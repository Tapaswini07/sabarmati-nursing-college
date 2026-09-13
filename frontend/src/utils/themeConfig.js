// Shared theme configuration for category navigation.
// Centralizes per-category styling and default color fallbacks so multiple
// components stay visually consistent.

export const categoryThemes = {
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

export const DEFAULT_CATEGORY = "Academic Hub";

export const DEFAULT_COLOR = {
  active: "bg-blue-600 text-white",
  light: "bg-blue-50",
  hover: "hover:bg-blue-100",
  text: "text-blue-700",
};
