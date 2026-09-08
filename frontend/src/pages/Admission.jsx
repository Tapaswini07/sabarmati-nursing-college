import { ArrowRight, FilePlus2, FileSpreadsheet, GraduationCap, UserRoundPlus, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

function StudentAdmissionGateway() {
  return (
    <section className="flex-1 bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f7_100%)] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
            <div className="rounded-[28px] bg-slate-900 p-6 text-white sm:p-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-slate-100">
                <FilePlus2 size={14} />
                Admission Desk
              </span>
              <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
                Choose admission type
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
                Select the required admission workflow to continue with the official
                student or teacher entry process.
              </p>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                    Student Workflow
                  </p>
                  <p className="mt-2 text-sm text-slate-100">
                    Open the course selection page and continue with student admission.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                    Teacher Workflow
                  </p>
                  <p className="mt-2 text-sm text-slate-100">
                    Open the teacher form page and submit educator details.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 self-stretch md:grid-cols-2">
              <Link
                to="/student-admission"
                className="group flex h-full flex-col justify-between rounded-[28px] border border-sky-200 bg-[linear-gradient(180deg,#f0f9ff_0%,#ffffff_100%)] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div>
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <UsersRound size={24} />
                  </span>
                  <h2 className="mt-5 text-2xl font-bold text-slate-900">
                    Student Admission
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Go to the next page and view all available course types before
                    continuing to the student admission form.
                  </p>
                </div>

                <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
                  Open Courses
                  <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </div>
              </Link>

              <Link
                to="/teacher-admission"
                className="group flex h-full flex-col justify-between rounded-[28px] border border-fuchsia-200 bg-[linear-gradient(180deg,#fdf4ff_0%,#ffffff_100%)] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div>
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-700">
                    <UserRoundPlus size={24} />
                  </span>
                  <h2 className="mt-5 text-2xl font-bold text-slate-900">
                    Teacher Admission
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Go directly to the teacher form page and submit teacher admission
                    details.
                  </p>
                </div>

                <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-700">
                  Open Teacher Form
                  <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </div>
              </Link>
            </div>

            <Link
              to="/dashboard/academichub/admission/records"
              className="group rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg lg:col-span-2"
            >
              <div className="flex h-full flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <FileSpreadsheet size={24} />
                  </span>
                  <h2 className="mt-5 text-2xl font-bold text-slate-900">
                    Admission Admin Dashboard
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                    Review submitted admission records, monitor pending and approved
                    applications, and open the Excel download workflow linked to
                    Google Sheets.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  Open Records
                  <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StudentAdmissionGateway;
