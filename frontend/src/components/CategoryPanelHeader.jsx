const CategoryPanelHeader = ({ title, accentText, itemCount }) => {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p
          className={
            "text-xs font-semibold uppercase tracking-[0.24em] " +
            accentText
          }
        >
          Department Modules
        </p>

        <h3 className="mt-2 text-2xl font-bold text-slate-900">{title}</h3>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Modules are filtered by your role. Admin can edit
          academic modules, while Finance Admin can edit
          financial modules.
        </p>
      </div>

      {/* Module count */}
      <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Available
        </p>

        <p className="mt-1 text-lg font-bold text-slate-900">
          {itemCount} Modules
        </p>
      </div>
    </div>
  );
};

export default CategoryPanelHeader;
