import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { navItems } from "../constants/navItems";
import { hasSectionAccess } from "../utils/sectionAccess";

function HomeRedirect() {
  const user = useSelector((state) => state.auth.user);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/dashboard" replace />;

  const firstAllowed = navItems.find((item) =>
    hasSectionAccess(user.sections || [], item.section),
  );

  if (!firstAllowed) return <Navigate to="/forbidden" replace />;
  return <Navigate to={firstAllowed.to} replace />;
}

export default HomeRedirect;
