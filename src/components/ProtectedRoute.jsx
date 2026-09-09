import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV_CONFIG } from "../utils/navConfig";

export default function ProtectedRoute({ roleKey, children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role_name !== roleKey) {
    const ownBase = NAV_CONFIG[user.role_name]?.basePath || "/login";
    return <Navigate to={ownBase} replace />;
  }

  return children;
}
