import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { navItems } from "../constants/navItems";
import {
  FiBarChart2,
  FiBookOpen,
  FiClipboard,
  FiFileText,
  FiDollarSign,
  FiMenu,
  FiHome,
  FiLayers,
  FiPackage,
  FiCalendar,
  FiSettings,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { RiHotelLine } from "react-icons/ri";
import { useState } from "react";
import "./sidebar.css";
import { hasFullAccess, hasSectionAccess } from "../utils/sectionAccess";
import { useGetSettingsQuery } from "../store/employeeApi";

const iconByPath = {
  "/dashboard": FiBarChart2,
  "/employees": FiUsers,
  "/rooms": FiHome,
  "/occupancy": FiCalendar,
  "/guest-checkin": FiUserCheck,
  "/guests-active": FiLayers,
  "/groups": FiUsers,
  "/guests-history": FiBookOpen,
  "/receipts": FiFileText,
  "/guests-debtors": FiDollarSign,
  "/attendance": FiCalendar,
  "/services": FiPackage,
  "/hall-bookings": FiBookOpen,
  "/expenses": FiDollarSign,
  "/finance": FiDollarSign,
  "/reports": FiClipboard,
  "/client-sales-report": FiBarChart2,
  "/settings": FiSettings,
};

function AdminSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const user = useSelector((state) => state.auth.user);

  const { data: settingsData } = useGetSettingsQuery();
  const hotelName =
    settingsData?.innerData?.hotelName ||
    localStorage.getItem("hotelName") ||
    "Mehmonxona nomi";

  const allowedItems =
    hasFullAccess(user?.role)
      ? navItems
      : navItems.filter((item) =>
          hasSectionAccess(user?.sections || [], item.section),
        );
  const mobilePrimaryItems = allowedItems.slice(0, 4);

  return (
    <aside className="sidebar">
      <div className="brand">
        {/* <RiHotelLine />  */}
        {hotelName}
      </div>

      <nav className="side-nav">
        {allowedItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "side-link side-link-active" : "side-link"
            }
          >
            <span className="side-link-inner">
              {(() => {
                const Icon = iconByPath[item.to] || FiLayers;
                return (
                  <span className="side-icon">
                    <Icon size={16} />
                  </span>
                );
              })()}
              <span>{item.label}</span>
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="mobile-bottom-nav">
        {mobilePrimaryItems.map((item) => (
          <NavLink
            key={`mobile-${item.to}`}
            to={item.to}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              isActive ? "side-link side-link-active" : "side-link"
            }
          >
            <span className="side-link-inner">
              {(() => {
                const Icon = iconByPath[item.to] || FiLayers;
                return (
                  <span className="side-icon">
                    <Icon size={16} />
                  </span>
                );
              })()}
              <span>{item.label}</span>
            </span>
          </NavLink>
        ))}

        <button
          type="button"
          className="mobile-more-btn"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Menyu"
        >
          <span className="side-icon">
            <FiMenu size={18} />
          </span>
          <span>Menyu</span>
        </button>
      </div>

      <div
        className={`mobile-drawer-backdrop ${isMobileMenuOpen ? "open" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <div className={`mobile-drawer ${isMobileMenuOpen ? "open" : ""}`}>
        <div className="mobile-drawer-head">
          <strong>Bo'limlar</strong>
          <button
            type="button"
            className="mobile-drawer-close"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Yopish"
          >
            <FiX size={18} />
          </button>
        </div>
        <nav className="mobile-drawer-nav">
          {allowedItems.map((item) => (
            <NavLink
              key={`drawer-${item.to}`}
              to={item.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                isActive
                  ? "mobile-menu-link mobile-menu-link-active"
                  : "mobile-menu-link"
              }
            >
              {(() => {
                const Icon = iconByPath[item.to] || FiLayers;
                return (
                  <span className="side-icon">
                    <Icon size={16} />
                  </span>
                );
              })()}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export default AdminSidebar;
