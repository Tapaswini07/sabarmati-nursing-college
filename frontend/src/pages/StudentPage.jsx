import { ArrowRight, BookOpenCheck, FileSpreadsheet, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import AdmissionSidebar from "../components/AdmissionSidebar";

const courseGroups = [
  {
    heading: "Sabarmati College of Nursing",
    courses: [
      { title: "B.Sc. Nursing", shortLabel: "B.Sc N" },
      { title: "P.B.B.Sc. Nursing", shortLabel: "P.B.B.Sc N" },
      { title: "M.Sc. Nursing", shortLabel: "M.Sc N" },
    ],
  },
  {
    heading: "Sabarmati School of Nursing",
    courses: [
      { title: "ANM", shortLabel: "ANM" },
      { title: "GNM", shortLabel: "GNM" },
    ],
  },
];

function StudentPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_45%,#e5e7eb_100%)] text-slate-900 lg:flex">
      <AdmissionSidebar />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#0f3d73_55%,#1d4ed8_100%)] px-5 py-7 text-white sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                  Student Admission Portal
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  Select the course for admission
                </h1>
                <p className="mt-3 text-sm leading-7 text-slate-200 sm:text-base">
                  Choose an official course below and use the continue button to open
                  the professional admission form with that course preselected.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/dashboard/academichub/admission"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Back to Admission Type
                </Link>
                <Link
                  to="/dashboard/academichub/admission/records"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  <FileSpreadsheet size={16} />
                  Admin Dashboard
                </Link>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-6 lg:px-8 lg:py-8">
            <div className="mb-6 rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <GraduationCap size={22} />
                </span>
                <div>
                  <p className="text-base font-bold text-slate-900">Official Course List</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    This page is part of the admission management workflow. Course
                    selection leads directly into the online form and the records
                    are then available in the admin dashboard and Excel export.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {courseGroups.map((group, groupIndex) => (
                <section key={group.heading}>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                      <GraduationCap size={20} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                        {groupIndex === 0 ? "College Programs" : "School Programs"}
                      </p>
                      <h2 className="text-2xl font-black text-slate-900">{group.heading}</h2>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {group.courses.map((course) => (
                      <article
                        key={course.title}
                        className="group relative overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d4ed8_0%,#60a5fa_100%)] opacity-0 transition group-hover:opacity-100" />

                        <div>
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-blue-100 group-hover:text-blue-700">
                            <BookOpenCheck size={22} />
                          </span>
                          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                            {course.shortLabel}
                          </p>
                          <h3 className="mt-2 text-xl font-bold text-slate-900">{course.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Continue with this course and open the official admission
                            form for candidate registration.
                          </p>
                        </div>

                        <Link
                          to={`/dashboard/academichub/admission/form?course=${encodeURIComponent(course.title)}`}
                          className="mt-6 inline-flex items-center justify-between rounded-2xl bg-[linear-gradient(135deg,#1d4ed8_0%,#0f172a_100%)] px-4 py-3 text-sm font-semibold text-white transition hover:shadow-lg"
                        >
                          Continue
                          <ArrowRight size={16} />
                        </Link>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default StudentPage;
