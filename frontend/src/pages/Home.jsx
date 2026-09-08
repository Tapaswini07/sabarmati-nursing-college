import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Users, UserSquare2 } from "lucide-react";
import Navbar from "../components/Navbar";

function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="hero-grid" />
        </div>

        <section className="relative mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="page-enter space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200">
                <Sparkles size={16} />
                Smart admissions with modern UX
              </span>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-7xl">
                  Welcome to the next generation of academic admissions.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  Explore an animated, mobile-first admissions experience for students and teachers.
                  Clean navigation, engaging motion, and responsive layouts make every step feel smooth on any device.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/student-admission"
                  className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 py-4 text-base font-bold text-slate-950 shadow-2xl shadow-cyan-500/20 transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:bg-cyan-300 active:scale-[0.98]"
                >
                  <Users size={20} />
                  Student Admission
                  <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/teacher-admission"
                  className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-base font-bold text-white transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-fuchsia-400/40 hover:bg-fuchsia-400/10 active:scale-[0.98]"
                >
                  <UserSquare2 size={20} />
                  Teacher Admission
                  <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            <div className="page-enter-delayed">
              <div className="glass-panel overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-2xl shadow-slate-950/40">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6">
                    <div className="mb-5 inline-flex rounded-2xl bg-cyan-400/15 p-3 text-cyan-200">
                      <Users size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Student Path</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      Discover courses, compare programs, and start your admission flow with engaging cards and clear calls to action.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-fuchsia-400/20 bg-fuchsia-400/10 p-6">
                    <div className="mb-5 inline-flex rounded-2xl bg-fuchsia-400/15 p-3 text-fuchsia-200">
                      <UserSquare2 size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Teacher Path</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      Submit your experience, expertise, and resume through a polished animated form built for professional applications.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">Responsive Experience</p>
                      <h2 className="mt-2 text-2xl font-bold text-white">Optimized for every screen</h2>
                    </div>
                    <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                      Mobile • Tablet • Desktop
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    {[
                      { value: "100%", label: "Fluid Layouts" },
                      { value: "3", label: "Animated Pages" },
                      { value: "24/7", label: "Accessible Flow" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                        <p className="text-3xl font-black text-white">{item.value}</p>
                        <p className="mt-2 text-sm text-slate-300">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;
