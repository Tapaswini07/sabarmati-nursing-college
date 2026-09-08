import { useState } from "react";
import { CheckCircle2, FileText, Send, UserRound, Mail, BriefcaseBusiness } from "lucide-react";
import AdmissionSidebar from "../components/AdmissionSidebar";

const initialTeacherForm = {
  fullName: "",
  email: "",
  subjectExpertise: "",
  experience: "",
  resume: null,
};

function TeacherPage() {
  const [formData, setFormData] = useState(initialTeacherForm);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value, files } = event.target;
    setSubmitted(false);
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setSubmitted(false);

    await new Promise((resolve) => setTimeout(resolve, 900));

    setLoading(false);
    setSubmitted(true);
    setFormData(initialTeacherForm);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 lg:flex">
      <AdmissionSidebar />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-700">
              Teacher Admission
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Teacher admission form
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Complete the required teacher details below for official registration.
              Fill the form carefully and submit the application for review.
            </p>
          </div>

          <div className="grid gap-6 px-5 py-5 lg:grid-cols-[320px_minmax(0,1fr)] sm:px-6 lg:px-8 lg:py-8">
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 inline-flex rounded-2xl bg-slate-200 p-3 text-slate-700">
                  <FileText size={22} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Required Details</h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <li>Full name and official email address</li>
                  <li>Subject expertise and teaching experience</li>
                  <li>Resume for verification and review</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Instructions</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Please enter correct professional details. Incomplete or incorrect
                  information may delay teacher admission approval.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-6 border-b border-slate-200 pb-4">
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Teacher Details
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Fill all required fields and upload the resume before submitting.
                </p>
              </div>

              {submitted && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5" size={18} />
                  <span>Your application has been submitted successfully.</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="grid gap-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Full Name</span>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="teacher-field pl-11"
                        placeholder="Enter full name"
                        required
                      />
                    </div>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Email</span>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="teacher-field pl-11"
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Subject Expertise</span>
                    <div className="relative">
                      <BriefcaseBusiness className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        name="subjectExpertise"
                        value={formData.subjectExpertise}
                        onChange={handleChange}
                        className="teacher-field pl-11"
                        placeholder="Enter subject expertise"
                        required
                      />
                    </div>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Experience (years)</span>
                    <input
                      type="number"
                      min="0"
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      className="teacher-field"
                      placeholder="Enter experience"
                      required
                    />
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Upload Resume</span>
                  <input
                    type="file"
                    name="resume"
                    onChange={handleChange}
                    className="teacher-field file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                    accept=".pdf,.doc,.docx"
                    required
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Submit Application
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default TeacherPage;
