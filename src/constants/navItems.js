export const navItems = [
  { to: "/dashboard", label: "Dashboard", section: "dashboard" },
  { to: "/employees", label: "Hodimlar", section: "employees" },
  { to: "/rooms", label: "Xonalar", section: "rooms" },
  { to: "/occupancy", label: "Shaxmatka", section: "guests" },
  { to: "/guest-checkin", label: "Yangi mehmon", section: "guests" },
  { to: "/guests-active", label: "Active mijozlar", section: "guests-active" },
  {
    to: "/guests-history",
    label: "Mijozlar tarixi",
    section: "guests-history",
  },
  { to: "/guests-debtors", label: "Qarzdorlar", section: "guests-debtors" },
  { to: "/attendance", label: "Davomat", section: "attendance" },
  { to: "/services", label: "Xizmatlar", section: "services" },
  { to: "/hall-bookings", label: "Zal ijarasi", section: "hall-bookings" },
  { to: "/expenses", label: "Xarajatlar", section: "expenses" },
  // { to: "/finance", label: "Moliya", section: "finance" },
  { to: "/reports", label: "Hisobotlar", section: "reports" },
  { to: "/settings", label: "Sozlamalar", section: "settings" },
];

export const allSections = navItems.map((item) => item.section);
