import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { SupplierFormPage } from "./pages/SupplierFormPage";
import { SupplierDetailPage } from "./pages/SupplierDetailPage";
import { PurchaseFormPage } from "./pages/PurchaseFormPage";
import { PaymentFormPage } from "./pages/PaymentFormPage";
import { SettingsPage } from "./pages/SettingsPage";
import { canWriteFinance, canWriteSuppliers } from "./lib/permissions";
import { useTranslation } from "react-i18next";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) return <p className="p-8">{t("common.loading")}</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleGate({
  allow,
  children,
}: {
  allow: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  if (!allow) return <p className="p-6 text-sm text-red-600">{t("errors.forbidden")}</p>;
  return <>{children}</>;
}

export function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route
          path="/suppliers/new"
          element={
            <RoleGate allow={canWriteSuppliers(user?.role)}>
              <SupplierFormPage mode="create" />
            </RoleGate>
          }
        />
        <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
        <Route
          path="/suppliers/:id/edit"
          element={
            <RoleGate allow={canWriteSuppliers(user?.role)}>
              <SupplierFormPage mode="edit" />
            </RoleGate>
          }
        />
        <Route
          path="/purchases/new"
          element={
            <RoleGate allow={canWriteFinance(user?.role)}>
              <PurchaseFormPage />
            </RoleGate>
          }
        />
        <Route
          path="/payments/new"
          element={
            <RoleGate allow={canWriteFinance(user?.role)}>
              <PaymentFormPage />
            </RoleGate>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
