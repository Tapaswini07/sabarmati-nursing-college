import { getVisibleMenuData } from "../utils/permissions";
import {
  categoryThemes,
  DEFAULT_CATEGORY,
  DEFAULT_COLOR,
} from "../utils/themeConfig";
import CategoryTabs from "./CategoryTabs";
import CategoryPanelHeader from "./CategoryPanelHeader";
import ModuleCard from "./ModuleCard";

const CategoryNavbar = ({ activeMenu, onMenuChange, role }) => {
  const visibleMenuData = getVisibleMenuData(role);
  const categoryNames = Object.keys(visibleMenuData);

  const resolvedActiveMenu = visibleMenuData[activeMenu]
    ? activeMenu
    : categoryNames[0];

  const activeCategory = visibleMenuData[resolvedActiveMenu];

  const activeTheme =
    categoryThemes[resolvedActiveMenu] ||
    categoryThemes[DEFAULT_CATEGORY];

  if (!activeCategory) {
    return null;
  }

  const activeItems = Array.isArray(activeCategory.items)
    ? activeCategory.items
    : [];

  const activeColor = activeCategory.color || DEFAULT_COLOR;

  // Merge category color into the theme so subcomponents can use one object.
  const mergedTheme = { ...activeTheme, text: activeColor.text };

  return (
    <div className="mt-6 w-full px-2 md:mt-8 md:px-4">

      {/* Category tabs */}
      <CategoryTabs
        categoryNames={categoryNames}
        visibleMenuData={visibleMenuData}
        resolvedActiveMenu={resolvedActiveMenu}
        onMenuChange={onMenuChange}
      />

      {/* Active category */}
      <div
        className={
          "mt-6 rounded-[2rem] border bg-gradient-to-br p-5 " +
          "shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-8 " +
          activeTheme.panel
        }
      >

        {/* Header */}
        <CategoryPanelHeader
          title={resolvedActiveMenu}
          accentText={activeTheme.accentText}
          itemCount={activeItems.length}
        />

        {/* Module cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {activeItems.map((item, index) => (
            <ModuleCard
              key={(item && item.path) || index}
              item={item}
              index={index}
              theme={mergedTheme}
              role={role}
            />
          ))}
        </div>

      </div>
    </div>
  );
};

export default CategoryNavbar;

