import { useState } from "react";
import Logo from "../assets/Logo.png";
import { apiRequest } from "../config/api";
import { getDefaultRouteForRole } from "../utils/permissions";

export default function Login() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = getDefaultRouteForRole(data.user.role);
    } catch (requestError) {
      setError(requestError.message || "Unable to connect. Check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#16244a] via-[#1b295a] to-[#243b7a] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-6xl bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col justify-center items-center text-center px-6 sm:px-10 py-12 bg-white/5">
          <img
            className="w-32 h-32 sm:w-40 sm:h-40 object-contain mb-6"
            src={Logo}
            alt="Hospital Logo"
          />
          <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold leading-snug max-w-xl">
            SABARAMATI HOSPITAL AND COLLEGE OF NURSING
          </h1>
          <p className="mt-5 text-sm sm:text-base text-white/90 bg-[#2ac454] px-5 py-3 rounded-full max-w-xl shadow-md">
            Super admin creates admin accounts, admins create student accounts, and students get role-based dashboard access.
          </p>
        </div>

        <div className="bg-white px-6 sm:px-10 md:px-14 py-10 sm:py-12 flex items-center justify-center">
          <div className="w-full max-w-md">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center">Login</h2>
            <p className="text-gray-500 text-center mt-2 mb-8">Sign in with your assigned role account</p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-700 outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type={show ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-700 outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
                />
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={show}
                    onChange={() => setShow(!show)}
                    className="accent-teal-700"
                  />
                  Show Password
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-700 hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-md transition duration-300"
              >
                {loading ? "Signing in..." : "SIGN IN"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
