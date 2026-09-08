 import { useEffect, useMemo, useState } from "react";
import { ChevronRight, GraduationCap, IdCard, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../config/api";
import { getStoredUser } from "../utils/auth";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value || "-"}</p>
    </div>
  );
}

export default function StudentAdmissionDetails() {
  const user = getStoredUser();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const response = await apiRequest("/api/students/me/profile");

        if (!active) {
          return;
        }

        setStudent(response?.student || null);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError.message || "Unable to load admission details.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const summaryItems = useMemo(
    () => [
      { label: "Registration No", value: student?.registrationNo || "-" },
      { label: "Admission No", value: student?.admissionNumber || "-" },
      { label: "Course", value: student?.course || "-" },
      { label: "Year", value: student?.year || "-" },
    ],
    [student]
  );

  return (
    <section className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.10),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eff6ff_50%,#f8fafc_100%)] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#0f766e_100%)] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
            <ShieldCheck size={14} />
            Admission Profile
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
            Student Admission Details
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
            View your verified admission record, academic details, and personal information in one place.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate("/dashboard/student/home")}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-sky-900 shadow-[0_12px_24px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-sky-50"
            >
              Back to dashboard
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : loading ? (   
          <div className="grid gap-6">
            <div className="h-40 animate-pulse rounded-[30px] bg-white" />
            <div className="h-72 animate-pulse rounded-[30px] bg-white" />
          </div>
        ) : !student ? (
          <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
            Admission details are not available for this student account yet.
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryItems.map((item) => (
                <div key={item.label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                  <p className="mt-3 text-2xl font-black text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <IdCard size={24} />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Admission Identity</h2>
                    <p className="text-sm text-slate-500">Official academic record linked to your student login</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <InfoCard label="Student Name" value={student?.studentName || student?.fullName || user?.name} />
                  <InfoCard label="Application ID" value={student?.applicationId} />
                  <InfoCard label="Status" value={student?.status} />
                  <InfoCard label="Admission Date" value={formatDate(student?.admissionDate)} />
                  <InfoCard label="Department" value={student?.department} />
                  <InfoCard label="Source" value={student?.source} />
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <GraduationCap size={24} />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Academic Details</h2>
                    <p className="text-sm text-slate-500">Course, year, category, and study information</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <InfoCard label="Course" value={student?.course} />
                  {student?.mScSpecialization && (
                    <InfoCard label="M.Sc (N) Specialization" value={student.mScSpecialization} />
                  )}
                  <InfoCard label="Year" value={student?.year} />
                  <InfoCard label="Caste Category" value={student?.casteCategory} />
                  <InfoCard label="Sync Status" value={student?.syncStatus} />
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Mail size={24} />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Contact Details</h2>
                    <p className="text-sm text-slate-500">Personal communication details on file</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  <InfoCard label="Email" value={student?.email || user?.email} />
                  <InfoCard label="Phone" value={student?.phone} />
                  <InfoCard label="Date of Birth" value={formatDate(student?.dob)} />
                  <InfoCard label="Gender" value={student?.gender} />
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <MapPin size={24} />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Address & Documents</h2>
                    <p className="text-sm text-slate-500">Stored address and uploaded record status</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  <InfoCard label="Address" value={student?.address} />
                  <InfoCard
                    label="Supporting Documents"
                    value={student?.supportingDocuments?.length ? `${student.supportingDocuments.length} uploaded` : "No documents listed"}
                  />
                  <InfoCard
                    label="Caste Certificate"
                    value={student?.casteCertificateFilename || (student?.casteCertificateUrl ? "Available" : "Not available")}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
