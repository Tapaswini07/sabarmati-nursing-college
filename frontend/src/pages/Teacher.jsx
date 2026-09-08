import { useEffect, useState } from "react";
import { apiRequest } from "../config/api";

const emptyForm = {
  teacherName: "",
  employeeId: "",
  department: "",
  subject: "",
};

const Teacher = () => {
  const [teachers, setTeachers] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadTeachers = async () => {
      try {
        const data = await apiRequest("/api/teachers");
        if (!ignore) {
          setTeachers(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadTeachers();

    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest("/api/teachers", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      setTeachers((prev) => [data.teacher, ...prev]);
      setFormData(emptyForm);
      setMessage("Teacher created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex-1 bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">Add Teacher</h1>
          <p className="mt-1 text-sm text-gray-500">
            Created teachers will appear in the teacher attendance dropdown.
          </p>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Teacher Name
              </label>
              <input
                name="teacherName"
                value={formData.teacherName}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter teacher name"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Employee ID
              </label>
              <input
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter employee ID"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Department
                </label>
                <input
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter department"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter subject"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create Teacher"}
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-800">Teacher Dashboard</h2>
            <p className="mt-1 text-sm text-gray-500">
              {teachers.length} teacher{teachers.length === 1 ? "" : "s"} stored in database.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-3">Teacher Name</th>
                  <th className="px-6 py-3">Employee ID</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Subject</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                      Loading teachers...
                    </td>
                  </tr>
                ) : teachers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                      No teachers created yet.
                    </td>
                  </tr>
                ) : (
                  teachers.map((teacher) => (
                    <tr key={teacher._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {teacher.teacherName || teacher.fullName || teacher.name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {teacher.employeeId || teacher.staffId}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{teacher.department}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {teacher.subject || teacher.subjectExpertise || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Teacher;
