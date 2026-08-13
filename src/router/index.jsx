import { Navigate, createBrowserRouter } from "react-router-dom";
import AdminLayout from "../layout/AdminLayout";
import DashboardPage from "../pages/DashboardPage";
import EmployeesPage from "../pages/EmployeesPage";
import RoomsPage from "../pages/RoomsPage";
import OccupancyPage from "../pages/OccupancyPage";
import GuestsPage from "../pages/GuestsPage";
import GuestCheckinPage from "../pages/GuestCheckinPage";
import FinancePage from "../pages/FinancePage";
import ReportsPage from "../pages/ReportsPage";
import AttendancePage from "../pages/AttendancePage";
import ExpensesPage from "../pages/ExpensesPage";
import ServicesPage from "../pages/ServicesPage";
import HallBookingsPage from "../pages/hall/HallBookingsPage";
import SettingsPage from "../pages/SettingsPage";
import NotFoundPage from "../pages/NotFoundPage";
import LoginPage from "../pages/LoginPage";
import ForbiddenPage from "../pages/ForbiddenPage";
import RequireAuth from "../components/RequireAuth";
import RequireSection from "../components/RequireSection";
import HomeRedirect from "../components/HomeRedirect";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/forbidden", element: <ForbiddenPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      {
        path: "dashboard",
        element: (
          <RequireSection section="dashboard">
            <DashboardPage />
          </RequireSection>
        ),
      },
      {
        path: "employees",
        element: (
          <RequireSection section="employees">
            <EmployeesPage />
          </RequireSection>
        ),
      },
      {
        path: "rooms",
        element: (
          <RequireSection section="rooms">
            <RoomsPage />
          </RequireSection>
        ),
      },
      {
        path: "occupancy",
        element: (
          <RequireSection section="guests">
            <OccupancyPage />
          </RequireSection>
        ),
      },
      {
        path: "guest-checkin",
        element: (
          <RequireSection section="guests">
            <GuestCheckinPage />
          </RequireSection>
        ),
      },
      {
        path: "guests",
        element: <Navigate to="/guests-active" replace />,
      },
      {
        path: "guests-active",
        element: (
          <RequireSection section="guests-active">
            <GuestsPage tab="active" />
          </RequireSection>
        ),
      },
      {
        path: "guests-history",
        element: (
          <RequireSection section="guests-history">
            <GuestsPage tab="history" />
          </RequireSection>
        ),
      },
      {
        path: "guests-debtors",
        element: (
          <RequireSection section="guests-debtors">
            <GuestsPage tab="debtors" />
          </RequireSection>
        ),
      },
      {
        path: "finance",
        element: (
          <RequireSection section="finance">
            <FinancePage />
          </RequireSection>
        ),
      },
      {
        path: "expenses",
        element: (
          <RequireSection section="expenses">
            <ExpensesPage />
          </RequireSection>
        ),
      },
      {
        path: "reports",
        element: (
          <RequireSection section="reports">
            <ReportsPage />
          </RequireSection>
        ),
      },
      {
        path: "attendance",
        element: (
          <RequireSection section="attendance">
            <AttendancePage />
          </RequireSection>
        ),
      },
      {
        path: "services",
        element: (
          <RequireSection section="services">
            <ServicesPage />
          </RequireSection>
        ),
      },
      {
        path: "hall-bookings",
        element: (
          <RequireSection section="hall-bookings">
            <HallBookingsPage />
          </RequireSection>
        ),
      },
      {
        path: "settings",
        element: (
          <RequireSection section="settings">
            <SettingsPage />
          </RequireSection>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
