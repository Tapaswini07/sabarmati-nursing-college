import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentPage from "./pages/StudentPage";
import TeacherPage from "./pages/TeacherPage";
import Dashboard from "./pages/Dashboard";
import StudentAdmissionForm from "./pages/Admission";
import StudentAdmissionFormPage from "./pages/StudentAdmissionFormPage";
import AttendanceSystem from "./pages/Attedence";
import ExamDashboard from "./pages/Exam";
import Students from "./pages/Students";
import Teacher from "./pages/Teacher";
import ResponsiveShowcase from "./pages/ResponsiveShowcase";
import ModulePlaceholderPage from "./pages/ModulePlaceholder";
import Fee from "./pages/Fee";
import Leavemanagement from "./pages/Leavemanagement";
import Reports from "./pages/Reports";
import Staff from "./pages/Staff";
import Account from "./pages/Account";
import Department from "./pages/Department";
import Admissionfees from "./pages/Admissionfess";
import StudentDashboard from "./pages/StudentDashboard";
import StudentAdmissionDetails from "./pages/StudentAdmissionDetails";
import StudentBooking from "./pages/StudentBooking";
import FineCollection from "./pages/FineCollection";
import FormFillUpFees from "./pages/FormFillUpFees";
import RegistrationFees from "./pages/RegistrationFees";
import { getStoredUser, isAuthenticated } from "./utils/auth";
import {
  canAccessRoute,
  getDefaultRouteForRole,
  getVisibleMenuData,
  normalizeRole,
} from "./utils/permissions";

const liveModulePaths = new Set([
  "/dashboard/academichub/admission",
  "/dashboard/academichub/attedence",
  "/dashboard/academichub/exam",
  "/dashboard/academichub/leave",
  "/dashboard/academichub/noc",
  "/dashboard/finance/bank-book",
  "/dashboard/finance/journal",
  "/dashboard/finance/contra",
  "/dashboard/finance/balance-sheet",
  "/dashboard/finance/profit-loss",
  "/dashboard/finance/admission-fees",
  "/dashboard/finance/form-fill-up-fees",
  "/dashboard/finance/fine-collection",
  "/dashboard/admin/registration",
  "/dashboard/finance/registration-fees",
]);

function ProtectedRoute({ children, allowedRoles, requiredPath }) {
  const user = getStoredUser();
  const role = normalizeRole(user?.role);

  if (!isAuthenticated() || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  if (requiredPath && !canAccessRoute(role, requiredPath)) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const user = getStoredUser();
  const role = normalizeRole(user?.role);

  if (isAuthenticated() && user) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  return children;
}

function HomeRedirect() {
  const user = getStoredUser();
  const role = normalizeRole(user?.role);

  if (isAuthenticated() && user) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  const user = getStoredUser();
  const visibleMenuData = getVisibleMenuData(normalizeRole(user?.role) || "student");
  const placeholderModules = Object.entries(visibleMenuData).flatMap(
    ([categoryName, category]) =>
      category.items
        .filter((item) => !liveModulePaths.has(item.path))
        .map((item) => ({
          ...item,
          categoryName,
        }))
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "finance_admin"]} requiredPath="/dashboard">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/student/home"
            element={
              <ProtectedRoute allowedRoles={["student"]} requiredPath="/dashboard/student/home">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/student/admission-details"
            element={
              <ProtectedRoute allowedRoles={["student"]} requiredPath="/dashboard/student/admission-details">
                <StudentAdmissionDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/academichub/admission"
            element={
              <ProtectedRoute requiredPath="/dashboard/academichub/admission">
                <StudentAdmissionForm />
              </ProtectedRoute>
            }
          />
<Route
          path="/dashboard/academichub/admission/form"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin", "finance_admin"]} requiredPath="/dashboard/academichub/admission/form">
              <StudentAdmissionFormPage />
            </ProtectedRoute>
          }
        />
          <Route
            path="/dashboard/academichub/admission/records"
            element={
              <ProtectedRoute requiredPath="/dashboard/academichub/admission/records">
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/academichub/attedence"
            element={
              <ProtectedRoute requiredPath="/dashboard/academichub/attedence">
                <AttendanceSystem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/academichub/exam"
            element={
              <ProtectedRoute requiredPath="/dashboard/academichub/exam">
                <ExamDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/academichub/leave"
            element={
              <ProtectedRoute requiredPath="/dashboard/academichub/leave">
                <Leavemanagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/academichub/noc"
            element={
              <ProtectedRoute requiredPath="/dashboard/academichub/noc">
                <StudentBooking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/finance/bank-book"
            element={
              <ProtectedRoute requiredPath="/dashboard/finance/bank-book">
                <Staff />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/finance/journal"
            element={
              <ProtectedRoute requiredPath="/dashboard/finance/journal">
                <Department />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/finance/contra"
            element={
              <ProtectedRoute requiredPath="/dashboard/finance/contra">
                <Fee />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/finance/balance-sheet"
            element={
              <ProtectedRoute requiredPath="/dashboard/finance/balance-sheet">
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/finance/profit-loss"
            element={
              <ProtectedRoute requiredPath="/dashboard/finance/profit-loss">
                <Account />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/finance/admission-fees"
            element={
              <ProtectedRoute requiredPath="/dashboard/finance/admission-fees">
                <Admissionfees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/finance/form-fill-up-fees"
            element={
              <ProtectedRoute requiredPath="/dashboard/finance/form-fill-up-fees">
                <FormFillUpFees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/finance/registration-fees"
            element={
              <ProtectedRoute requiredPath="/dashboard/finance/registration-fees">
                <RegistrationFees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/finance/fine-collection"
            element={
              <ProtectedRoute requiredPath="/dashboard/finance/fine-collection">
                <FineCollection />
              </ProtectedRoute>
            }
          />
<Route
          path="/dashboard/admin/registration"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin", "finance_admin"]} requiredPath="/dashboard/admin/registration">
              <Register />
            </ProtectedRoute>
          }
        />
          {placeholderModules.map((module) => (
            <Route
              key={module.path}
              path={module.path}
              element={
                <ModulePlaceholderPage
                  categoryName={module.categoryName}
                  moduleName={module.name}
                  Icon={module.icon}
                />
              }
            />
          ))}
          <Route
            path="/students"
            element={
              <ProtectedRoute allowedRoles={["super_admin", "admin"]} requiredPath="/students">
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teachers"
            element={
              <ProtectedRoute allowedRoles={["super_admin", "admin"]} requiredPath="/teachers">
                <Teacher />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute requiredPath="/dashboard/academichub/attedence">
                <AttendanceSystem />
              </ProtectedRoute>
            }
          />
          <Route path="/Fee" element={<Navigate to="/fees" replace />} />
          <Route
            path="/fees"
            element={
              <ProtectedRoute requiredPath="/fees">
                <Fee />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredPath="/settings">
                <ModulePlaceholderPage categoryName="General" moduleName="Settings" />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="/student-admission"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
              <StudentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher-admission"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
              <TeacherPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
              <Register />
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard/login" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard/register" element={<Navigate to="/dashboard/admin/registration" replace />} />
        <Route path="/responsive-layout" element={<ResponsiveShowcase />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
