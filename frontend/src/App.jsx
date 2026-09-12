import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

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

import {
  getStoredUser,
  isAuthenticated,
} from "./utils/auth";

import {
  canAccessRoute,
  getDefaultRouteForRole,
  getVisibleMenuData,
  normalizeRole,
} from "./utils/permissions";


// ======================================================
// LIVE MODULE PATHS
// ======================================================

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

  "/dashboard/finance/registration-fees",

  "/dashboard/admin/registration",
]);


// ======================================================
// PROTECTED ROUTE
// ======================================================

function ProtectedRoute({
  children,
  allowedRoles,
  requiredPath,
}) {
  const user = getStoredUser();

  const role = normalizeRole(user?.role);


  // User is not logged in.
  if (!isAuthenticated() || !user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  // Role restriction.
  if (
    allowedRoles?.length &&
    !allowedRoles.includes(role)
  ) {
    return (
      <Navigate
        to={getDefaultRouteForRole(role)}
        replace
      />
    );
  }


  // Permission restriction.
  if (
    requiredPath &&
    !canAccessRoute(role, requiredPath)
  ) {
    return (
      <Navigate
        to={getDefaultRouteForRole(role)}
        replace
      />
    );
  }


  return children;
}


// ======================================================
// PUBLIC ONLY ROUTE
// ======================================================

function PublicOnlyRoute({ children }) {
  const user = getStoredUser();

  const role = normalizeRole(user?.role);


  if (isAuthenticated() && user) {
    return (
      <Navigate
        to={getDefaultRouteForRole(role)}
        replace
      />
    );
  }


  return children;
}


// ======================================================
// HOME REDIRECT
// ======================================================

function HomeRedirect() {
  const user = getStoredUser();

  const role = normalizeRole(user?.role);


  if (isAuthenticated() && user) {
    return (
      <Navigate
        to={getDefaultRouteForRole(role)}
        replace
      />
    );
  }


  return (
    <Navigate
      to="/login"
      replace
    />
  );
}


// ======================================================
// APP
// ======================================================

function App() {

  const user = getStoredUser();

  const normalizedRole =
    normalizeRole(user?.role);


  const visibleMenuData =
    getVisibleMenuData(
      normalizedRole || "student"
    );


  const placeholderModules =
    Object.entries(
      visibleMenuData
    ).flatMap(
      ([categoryName, category]) =>
        category.items

          .filter(
            (item) =>
              !liveModulePaths.has(
                item.path
              )
          )

          .map(
            (item) => ({
              ...item,
              categoryName,
            })
          )
    );


  return (

    <BrowserRouter>

      <Routes>


        {/* ==================================================
            HOME
        ================================================== */}

        <Route
          path="/"
          element={<HomeRedirect />}
        />


        {/* ==================================================
            DASHBOARD LAYOUT
        ================================================== */}

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >


          {/* ==================================================
              MAIN DASHBOARD
          ================================================== */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "super_admin",
                  "admin",
                  "finance_admin",
                ]}
                requiredPath="/dashboard"
              >
                <Dashboard />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              STUDENT DASHBOARD
          ================================================== */}

          <Route
            path="/dashboard/student/home"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                requiredPath="/dashboard/student/home"
              >
                <StudentDashboard />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/student/admission-details"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                requiredPath="/dashboard/student/admission-details"
              >
                <StudentAdmissionDetails />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              ACADEMIC HUB
          ================================================== */}

          <Route
            path="/dashboard/academichub/admission"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/academichub/admission"
              >
                <StudentAdmissionForm />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/academichub/admission/form"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "super_admin",
                  "admin",
                  "finance_admin",
                ]}
                requiredPath="/dashboard/academichub/admission/form"
              >
                <StudentAdmissionFormPage />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/academichub/admission/records"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/academichub/admission/records"
              >
                <Students />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/academichub/attedence"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/academichub/attedence"
              >
                <AttendanceSystem />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/academichub/exam"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/academichub/exam"
              >
                <ExamDashboard />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/academichub/leave"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/academichub/leave"
              >
                <Leavemanagement />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              STUDENT BOOKING
              Finance Admin CAN EDIT
              Admin CAN ONLY VIEW
          ================================================== */}

          <Route
            path="/dashboard/academichub/noc"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/academichub/noc"
              >
                <StudentBooking />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              FINANCE
          ================================================== */}

          <Route
            path="/dashboard/finance/bank-book"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/finance/bank-book"
              >
                <Staff />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/finance/journal"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/finance/journal"
              >
                <Department />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/finance/contra"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/finance/contra"
              >
                <Fee />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/finance/balance-sheet"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/finance/balance-sheet"
              >
                <Reports />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/finance/profit-loss"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/finance/profit-loss"
              >
                <Account />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/finance/admission-fees"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/finance/admission-fees"
              >
                <Admissionfees />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/finance/form-fill-up-fees"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/finance/form-fill-up-fees"
              >
                <FormFillUpFees />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/finance/registration-fees"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/finance/registration-fees"
              >
                <RegistrationFees />
              </ProtectedRoute>
            }
          />


          <Route
            path="/dashboard/finance/fine-collection"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/finance/fine-collection"
              >
                <FineCollection />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              ADMIN MANAGEMENT
              Finance Admin NOT ALLOWED
          ================================================== */}

          <Route
            path="/dashboard/admin/registration"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "super_admin",
                  "admin",
                ]}
                requiredPath="/dashboard/admin/registration"
              >
                <Register />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              PLACEHOLDER MODULES
          ================================================== */}

          {placeholderModules.map(
            (module) => (

              <Route
                key={module.path}
                path={module.path}
                element={
                  <ModulePlaceholderPage
                    categoryName={
                      module.categoryName
                    }
                    moduleName={
                      module.name
                    }
                    Icon={
                      module.icon
                    }
                  />
                }
              />

            )
          )}


          {/* ==================================================
              STUDENTS
          ================================================== */}

          <Route
            path="/students"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "super_admin",
                  "admin",
                  "finance_admin",
                ]}
                requiredPath="/students"
              >
                <Students />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              TEACHERS
          ================================================== */}

          <Route
            path="/teachers"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "super_admin",
                  "admin",
                  "finance_admin",
                ]}
                requiredPath="/teachers"
              >
                <Teacher />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              ATTENDANCE SHORTCUT
          ================================================== */}

          <Route
            path="/attendance"
            element={
              <ProtectedRoute
                requiredPath="/dashboard/academichub/attedence"
              >
                <AttendanceSystem />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              FEES
          ================================================== */}

          <Route
            path="/Fee"
            element={
              <Navigate
                to="/fees"
                replace
              />
            }
          />


          <Route
            path="/fees"
            element={
              <ProtectedRoute
                requiredPath="/fees"
              >
                <Fee />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              SETTINGS
          ================================================== */}

          <Route
            path="/settings"
            element={
              <ProtectedRoute
                requiredPath="/settings"
              >
                <ModulePlaceholderPage
                  categoryName="General"
                  moduleName="Settings"
                />
              </ProtectedRoute>
            }
          />

        </Route>


        {/* ==================================================
            ADMISSION
        ================================================== */}

        <Route
          path="/student-admission"
          element={
            <ProtectedRoute
              allowedRoles={[
                "super_admin",
                "admin",
                "finance_admin",
              ]}
            >
              <StudentPage />
            </ProtectedRoute>
          }
        />


        <Route
          path="/teacher-admission"
          element={
            <ProtectedRoute
              allowedRoles={[
                "super_admin",
                "admin",
                "finance_admin",
              ]}
            >
              <TeacherPage />
            </ProtectedRoute>
          }
        />


        {/* ==================================================
            LOGIN
        ================================================== */}

        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />


        {/* ==================================================
            REGISTER
        ================================================== */}

        <Route
          path="/register"
          element={
            <ProtectedRoute
              allowedRoles={[
                "super_admin",
              ]}
            >
              <Register />
            </ProtectedRoute>
          }
        />


        {/* ==================================================
            OLD ROUTES
        ================================================== */}

        <Route
          path="/dashboard/login"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />


        <Route
          path="/dashboard/register"
          element={
            <Navigate
              to="/dashboard/admin/registration"
              replace
            />
          }
        />


        {/* ==================================================
            RESPONSIVE SHOWCASE
        ================================================== */}

        <Route
          path="/responsive-layout"
          element={
            <ResponsiveShowcase />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}


export default App;