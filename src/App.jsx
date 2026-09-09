import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import { NAV_CONFIG } from "./utils/navConfig";

import Login from "./pages/Login";

import AdminDashboard from "./pages/admin/Dashboard";
import Markets from "./pages/admin/Markets";

import MarketAdminDashboard from "./pages/marketadmin/Dashboard";

import ShopkeeperDashboard from "./pages/shopkeeper/Dashboard";
import Billing from "./pages/shopkeeper/Billing";

import GatekeeperDashboard from "./pages/gatekeeper/Dashboard";
import GateOperations from "./pages/gatekeeper/GateOperations";

import UsersPage from "./pages/shared/UsersPage";
import ShopsPage from "./pages/shared/ShopsPage";
import CommoditiesPage from "./pages/shared/CommoditiesPage";
import FarmersPage from "./pages/shared/FarmersPage";
import VehicleLogPage from "./pages/shared/VehicleLogPage";
import ReportsPage from "./pages/shared/ReportsPage";
import SettingsPage from "./pages/shared/SettingsPage";

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const base = NAV_CONFIG[user.role_name]?.basePath || "/login";
  return <Navigate to={base} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />

          {/* ---- Admin ---- */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roleKey="ADMIN">
                <AppLayout roleKey="ADMIN" />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersPage isAdmin />} />
            <Route path="markets" element={<Markets />} />
            <Route path="shops" element={<ShopsPage isAdmin />} />
            <Route path="commodities" element={<CommoditiesPage isAdmin />} />
            <Route path="farmers" element={<FarmersPage canDelete isAdmin />} />
            <Route path="vehicles" element={<VehicleLogPage />} />
            <Route path="reports" element={<ReportsPage showSales showGateActivity />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* ---- Market Admin ---- */}
          <Route
            path="/market-admin"
            element={
              <ProtectedRoute roleKey="MARKET_ADMIN">
                <AppLayout roleKey="MARKET_ADMIN" />
              </ProtectedRoute>
            }
          >
            <Route index element={<MarketAdminDashboard />} />
            <Route path="users" element={<UsersPage isAdmin={false} />} />
            <Route path="shops" element={<ShopsPage isAdmin={false} />} />
            <Route path="commodities" element={<CommoditiesPage isAdmin={false} />} />
            <Route path="farmers" element={<FarmersPage canDelete />} />
            <Route path="vehicles" element={<VehicleLogPage />} />
            <Route path="reports" element={<ReportsPage showSales showGateActivity />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* ---- Shop Keeper ---- */}
          <Route
            path="/shopkeeper"
            element={
              <ProtectedRoute roleKey="SHOPKEEPER">
                <AppLayout roleKey="SHOPKEEPER" />
              </ProtectedRoute>
            }
          >
            <Route index element={<ShopkeeperDashboard />} />
            <Route path="billing" element={<Billing />} />
            <Route path="farmers" element={<FarmersPage canDelete={false} />} />
            <Route path="commodities" element={<CommoditiesPage readOnly />} />
            <Route path="reports" element={<ReportsPage showSales showGateActivity={false} />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* ---- Gate Keeper ---- */}
          <Route
            path="/gatekeeper"
            element={
              <ProtectedRoute roleKey="GATEKEEPER">
                <AppLayout roleKey="GATEKEEPER" />
              </ProtectedRoute>
            }
          >
            <Route index element={<GatekeeperDashboard />} />
            <Route path="vehicles" element={<GateOperations />} />
            <Route path="reports" element={<ReportsPage showSales={false} showGateActivity />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
