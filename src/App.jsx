import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import { SettingsProvider } from './auth/SettingsContext';
import PROVIDER from './data-provider';
import SetupGate from './components/SetupGate';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Users = lazy(() => import('./pages/Users'));
const Roles = lazy(() => import('./pages/Roles'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Register = lazy(() => import('./pages/Register'));
const SetupWizard = lazy(() => import('./pages/SetupWizard'));
const BootstrapAdmin = lazy(() => import('./pages/BootstrapAdmin'));

const PageLoader = () => (
  <div className="spinner-center min-h-400">
    <div className="spinner spinner-lg" />
  </div>
);

function AppInit({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hasEnv = !!(import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY);
    if (hasEnv) {
      PROVIDER.init().finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  if (!ready) return <PageLoader />;
  return children;
}

export default function App() {
  return (
    <SettingsProvider>
      <AppInit>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/admin/setup-wizard" element={<SetupWizard />} />
            <Route path="/admin/bootstrap-admin" element={<BootstrapAdmin />} />
            <Route element={<SetupGate><AuthLayout /></SetupGate>}>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/register" element={<Register />} />
            </Route>
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/users" element={<Users />} />
              <Route path="/roles" element={<Roles />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AppInit>
    </SettingsProvider>
  );
}