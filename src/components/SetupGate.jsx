import { Suspense, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AdminSetup from '../pages/AdminSetup';
import supabaseSync from '../services/supabaseSync';

const Loader = () => (
  <div className="auth-layout">
    <div className="spinner-center">
      <div className="spinner spinner-lg" />
    </div>
  </div>
);

function isSetupComplete() {
  try { return localStorage.getItem('corex_setup_complete') === 'true'; } catch { return false; }
}

export default function SetupGate({ children }) {
  const [state, setState] = useState(() => isSetupComplete() ? 'ready' : 'checking');
  const [reason, setReason] = useState('');
  const location = useLocation();

  const isAuthPage = location.pathname === '/register' || location.pathname === '/login';

  useEffect(() => {
    if (state !== 'checking') return;
    let active = true;
    (async () => {
      try {
        if (!supabaseSync.isConfigured()) {
          if (active) { setReason('config'); setState('setup'); }
          return;
        }
        const schemaOk = await supabaseSync.checkSchemaExists();
        if (!schemaOk) {
          if (active) { setReason('schema'); setState('setup'); }
          return;
        }
        const adminExists = await supabaseSync.hasAdminUser();
        if (active) setState(adminExists ? 'ready' : 'setup');
      } catch {
        if (active) { setReason('schema'); setState('setup'); }
      }
    })();
    return () => { active = false; };
  }, [state]);

  if (state === 'checking') return <Loader />;
  if (state === 'setup' && (!supabaseSync.isConfigured() || reason === 'schema' || reason === 'config' || !isAuthPage)) return <Suspense fallback={<Loader />}><AdminSetup /></Suspense>;
  return children;
}
