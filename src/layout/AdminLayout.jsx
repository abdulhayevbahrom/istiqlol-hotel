import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import AdminHeader from "../components/AdminHeader";
import { useGetSettingsQuery } from "../store/employeeApi";

function AdminLayout() {
  const { data: settingsData } = useGetSettingsQuery();
  const hotelName = settingsData?.innerData?.hotelName || "Mehmonxona nomi";

  useEffect(() => {
    document.title = hotelName;
    localStorage.setItem("hotelName", hotelName);
  }, [hotelName]);

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-main">
        <AdminHeader />
        <section className="admin-content">
          <Outlet />
        </section>
      </div>
    </div>
  );
}

export default AdminLayout;
