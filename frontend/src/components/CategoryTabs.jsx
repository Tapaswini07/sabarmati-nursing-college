import { categoryThemes, DEFAULT_CATEGORY, DEFAULT_COLOR } from "../utils/themeConfig";

const CategoryTabs = ({ categoryNames, visibleMenuData, resolvedActiveMenu, onMenuChange }) => {
  return (
    <div className="flex gap-3 overflow-x-auto border-b border-slate-200 pb-4 md:gap-4 md:pb-5">
      {categoryNames.map((menu) => {
        const category = visibleMenuData[menu];

        if (!category || !Array.isArray(category.items)) {
          return null;
        }

        const color = category.color || DEFAULT_COLOR;
        const theme =
          categoryThemes[menu] ||
          categoryThemes[DEFAULT_CATEGORY];

        const isActive = resolvedActiveMenu === menu;

        let tabClassName =
          "whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 md:px-7 md:py-3 md:text-base ";

        if (isActive) {
          tabClassName +=
            color.active +
            " " +
            theme.tabGlow +
            " scale-105 shadow-xl";
        } else {
          tabClassName +=
            color.light +
            " " +
            color.hover +
            " border border-white/70 shadow-sm hover:-translate-y-0.5 hover:shadow-md";
        }

        return (
          <button
            key={menu}
            type="button"
            onClick={() => onMenuChange(menu)}
            className={tabClassName}
          >
            {menu}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
