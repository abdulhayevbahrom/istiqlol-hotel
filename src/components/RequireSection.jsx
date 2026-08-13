import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { hasSectionAccess } from "../utils/sectionAccess";

function RequireSection({ section, children }) {
  const user = useSelector((state) => state.auth.user);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return children;
  if (hasSectionAccess(user.sections || [], section)) return children;

  return <Navigate to="/forbidden" replace />;
}

export default RequireSection;
