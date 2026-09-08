import { Outlet } from "react-router-dom";
import FooterBar from "./FooterBar";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const DashboardLayout = () => {
  return (
    <div className="min-h-dvh overflow-x-clip bg-gray-50 text-gray-800 md:flex md:items-stretch">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 bg-white shadow-sm">
          <Topbar />
        </header>

        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
        <FooterBar />
      </main>
    </div>
  );
};

export default DashboardLayout;
