import { Suspense, useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import AdminSetup from '../pages/AdminSetup';
import supabaseSync from '../services/supabaseSync';

const Loader = () => (
  <div className="auth-layout">
    <div className="spinner-center">
      <div className="spinner spinner-lg" />
    </div>
  </div>
);

export default function SetupGate({ children }) {
  const [decision, setDecision] = useState('checking');
  const location = useLocation();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!supabaseSync.isConfigured()) {
          if (active) setDecision('config');
          return;
        }
        const schemaOk = await supabaseSync.checkSchemaExists();
        if (!schemaOk) {
          if (active) setDecision('schema');
          return;
        }
        const adminExists = await supabaseSync.hasAdminUser();
        if (active) setDecision(adminExists ? 'ready' : 'noadmin');
      } catch {
        if (active) setDecision('schema');
      }
    })();
    return () => { active = false; };
  }, [location.pathname]);

  if (decision === 'checking') return <Loader />;

  if (decision === 'config' || decision === 'schema') {
    return (
      <Suspense fallback={<Loader />}>
        <AdminSetup />
      </Suspense>
    );
  }

  if (decision === 'noadmin' && location.pathname !== '/register') {
    return <Navigate to="/register" replace />;
  }

  return children;
}
