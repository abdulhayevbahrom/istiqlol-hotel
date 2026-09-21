import { useSelector } from "react-redux";

export default function OwnerOnly({ children }) {
  const role = useSelector((state) => state.auth.user?.role);
  return role === "owner" ? children : null;
}
