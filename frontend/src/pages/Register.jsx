import { useEffect, useMemo, useState } from "react";
import { Pencil, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { apiRequest } from "../config/api";
import { getStoredUser } from "../utils/auth";
import { getCreatableRoles, getRoleLabel } from "../utils/permissions";

const emptyForm = {
  name: "",
  email: "",
  userId: "",
  studentId: "",
  registrationNo: "",
  password: "",
  confirmPassword: "",
  role: "",
};

export default function Register() {
  const currentUser = getStoredUser();
  const creatableRoles = getCreatableRoles(currentUser?.role);
  const managedRole = creatableRoles[0] || "";
  const [formData, setFormData] = useState({ ...emptyForm, role: managedRole });
  const [records, setRecords] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);

  const pageCopy = useMemo(() => {
    if (currentUser?.role === "super_admin") {
      return {
        title: "Super Admin Control Center",
        subtitle: "Create, edit, and delete admin accounts. Super admin has full ERP access and complete institutional control.",
        badge: "Full Access",
      };
    }

    return {
      title: "Admin Student Management",
      subtitle: "Create student login accounts and manage admission and attendance workflows with editing access limited to academic operations.",
      badge: "Academic Operations",
    };
  }, [currentUser?.role]);

  const resetForm = () => {
    setFormData({ ...emptyForm, role: managedRole });
    setEditingId("");
  };

  const loadUsers = async () => {
    setTableLoading(true);
    try {
      const response = await apiRequest(`/users${managedRole ? `?role=${managedRole}` : ""}`);
      setRecords(response.users || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load managed accounts.");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [managedRole]);

  useEffect(() => {
    const loadStudents = async () => {
      if (managedRole !== "student") {
        setStudentOptions([]);
        return;
      }

      setStudentLoading(true);
      try {
        const response = await apiRequest("/api/students");
        setStudentOptions(Array.isArray(response) ? response : []);
      } catch (requestError) {
        setError(requestError.message || "Unable to load students.");
      } finally {
        setStudentLoading(false);
      }
    };

    loadStudents();
  }, [managedRole]);

  const handleChange = (event) => {
    const { name, value } = event.target;

     if (name === "studentId") {
      const selectedStudent = studentOptions.find((student) => (student._id || student.id) === value);
      if (!selectedStudent) {
        setFormData((prev) => ({
          ...prev,
          studentId: "",
          registrationNo: "",
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        studentId: selectedStudent._id || selectedStudent.id || "",
        registrationNo: selectedStudent.registrationNo || "",
        name: selectedStudent.studentName || selectedStudent.fullName || prev.name,
        email: selectedStudent.email || prev.email,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    if (editingId) {
      if (!formData.name || !formData.email) {
        setError("Name and email are required.");
        return;
      }
    } else {
      if (!formData.name || !formData.email || !formData.userId || !formData.role) {
        setError("Name, email, user ID, and role are required.");
        return;
      }

      if (!formData.password) {
        setError("Password is required.");
        return;
      }

      if (formData.role === "student" && !formData.studentId) {
        setError("Please select an existing student record for student accounts.");
        return;
      }
    }

    if ((formData.password || formData.confirmPassword) && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const response = await apiRequest(`/users/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            ...(formData.userId ? { userId: formData.userId } : {}),
            ...(formData.password ? { password: formData.password } : {}),
          }),
        });
        setStatus(response.message);
      } else {
        const response = await apiRequest("/register", {
          method: "POST",
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            userId: formData.userId,
            password: formData.password,
            role: formData.role,
            ...(formData.role === "student"
              ? {
                  studentId: formData.studentId,
                  registrationNo: formData.registrationNo.trim(),
                }
              : {}),
          }),
        });
        setStatus(response.message);
      }

      resetForm();
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message || "Unable to save account.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    setError("");
    setStatus("");
    setEditingId(record._id || record.id);
    setFormData({
      name: record.name || "",
      email: record.email || "",
      userId: record.userId || "",
      studentId: record.linkedStudentId || "",
      registrationNo: record.registrationNo || "",
      password: "",
      confirmPassword: "",
      role: record.role || managedRole,
    });
  };

  const handleDelete = async (record) => {
    const shouldDelete = window.confirm(`Delete ${record.name} (${getRoleLabel(record.role)})?`);
    if (!shouldDelete) {
      return;
    }

    setError("");
    setStatus("");

    try {
      const response = await apiRequest(`/users/${record._id || record.id}`, {
        method: "DELETE",
      });
      setStatus(response.message);
      if (editingId === (record._id || record.id)) {
        resetForm();
      }
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete account.");
    }
  };

  const cards = [
    { label: "Current Role", value: getRoleLabel(currentUser?.role), icon: Shield },
    { label: "Managed Accounts", value: records.length, icon: Users },
    { label: "Can Create", value: creatableRoles.map(getRoleLabel).join(", ") || "None", icon: UserPlus },
  ];

  return (
    <section className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_26%),linear-gradient(180deg,#eef7ff_0%,#f8fafc_50%,#eefbf7_100%)] p-4 md:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1680px] space-y-6">
        <div className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#0f766e_100%)] p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.25)] md:p-8 lg:p-10">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
            {pageCopy.badge}
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{pageCopy.title}</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-100 sm:text-base">{pageCopy.subtitle}</p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                      <Icon size={20} />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-200">{card.label}</p>
                      <p className="mt-1 text-lg font-bold text-white">{card.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 2xl:grid-cols-[minmax(420px,0.78fr)_minmax(0,1.22fr)]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm md:p-8 2xl:min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
              {editingId ? "Edit Account" : "Create Account"}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">
              {editingId ? "Update existing access" : `Create a new ${getRoleLabel(managedRole).toLowerCase()} account`}
            </h2>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {status && (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {status}
              </div>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">User ID</label>
                <input
                  type="text"
                  name="userId"
                  value={formData.userId}
                  onChange={handleChange}
                  disabled={Boolean(editingId)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-600 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={Boolean(editingId)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-600 disabled:bg-slate-100"
                >
                  {creatableRoles.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>

              {!editingId && formData.role === "student" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Student Record</label>
                  <select
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="">
                      {studentLoading ? "Loading students..." : "Select an existing student"}
                    </option>
                    {studentOptions.map((student) => (
                      <option key={student._id || student.id} value={student._id || student.id}>
                        {(student.studentName || student.fullName || "Student")} - {student.registrationNo}
                      </option>
                    ))}
                  </select>
                  {formData.registrationNo && (
                    <p className="mt-2 text-xs text-slate-500">
                      Linked registration number: {formData.registrationNo}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    Choose the existing admission/student record to link this login account.
                  </p>
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {editingId ? "New Password (optional)" : "Password"}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-teal-700 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Saving..." : editingId ? "Update Account" : "Create Account"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm 2xl:min-w-0">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-bold text-slate-900">
                {currentUser?.role === "super_admin" ? "Admin Accounts" : "Student Accounts"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {currentUser?.role === "super_admin"
                  ? "Create, edit, and delete admin accounts from one place."
                  : "Manage the student accounts created under your admin access."}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[820px] table-fixed text-sm 2xl:min-w-full">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[38%]" />
                  <col className="w-[14%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-16 text-center text-slate-500">
                        Loading accounts...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-16 text-center text-slate-500">
                        No managed accounts found yet.
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record._id || record.id} className="transition hover:bg-slate-50">
                        <td className="px-6 py-5 font-semibold text-slate-900">
                          <span className="block whitespace-normal break-words leading-6">{record.name}</span>
                        </td>
                        <td className="px-6 py-5 text-slate-600">
                          <span className="block truncate">{record.email}</span>
                        </td>
                        <td className="px-6 py-5 text-slate-600">{getRoleLabel(record.role)}</td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(record)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(record)}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 font-semibold text-red-700 transition hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
