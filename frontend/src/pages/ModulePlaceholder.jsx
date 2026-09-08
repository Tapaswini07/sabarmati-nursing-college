import { ArrowLeft, ArrowRight } from "lucide-react";
import { NavLink } from "react-router-dom";

const ModulePlaceholderPage = ({ categoryName, moduleName, Icon }) => {
  return (
    <section className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-lg">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-10 text-white md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-200">
                {categoryName}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                {moduleName}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-200 md:text-base">
                This module has been linked into the dashboard and is ready for
                its full feature build. For now, this placeholder keeps every
                dashboard card navigable.
              </p>
            </div>

            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/15 bg-white/10 shadow-lg">
              {Icon ? <Icon size={30} /> : <ArrowRight size={30} />}
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 md:grid-cols-3 md:px-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">Status</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              Coming soon
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">Category</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {categoryName}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">Module</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {moduleName}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="text-sm text-slate-500">
            Return to the dashboard to open another module or continue browsing
            categories.
          </p>

          <NavLink
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </NavLink>
        </div>
      </div>
    </section>
  );
};

export default ModulePlaceholderPage;
