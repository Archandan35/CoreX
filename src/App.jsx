import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './identity/auth/AuthContext.jsx';
import { PermissionProvider } from './identity/authorization/PermissionContext.jsx';
import { AppProvider, useApp } from './state/AppContext.jsx';
import MainLayout from './components/layout/MainLayout.jsx';
import AdminSetupBanner from './components/layout/AdminSetupBanner.jsx';
import DatabaseHealthBanner from './components/layout/DatabaseHealthBanner.jsx';
import PermissionGate from './components/ui/PermissionGate.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import SetupWizard from './setup-wizard/SetupWizard.jsx';
import { DatabaseValidator } from './setup-wizard/DatabaseValidator.js';
import { SCHEMAS } from './schema/models/index.js';
import { initDatabase, getDatabase } from './data/index.js';
import { config } from './config/index.js';
import Dashboard from './pages/Dashboard.jsx';
import UserList from './pages/users/UserList.jsx';
import UserCreate from './pages/users/UserCreate.jsx';
import UserEdit from './pages/users/UserEdit.jsx';
import UserShow from './pages/users/UserShow.jsx';
import RoleList from './pages/roles/RoleList.jsx';
import RoleCreate from './pages/roles/RoleCreate.jsx';
import RoleEdit from './pages/roles/RoleEdit.jsx';
import RoleShow from './pages/roles/RoleShow.jsx';
import Settings from './pages/Settings.jsx';
import CreateInvoice from './pages/invoices/CreateInvoice.jsx';
import { PERMISSIONS } from './identity/rbac/permissions.js';
import { api } from './services/api.js';
import { isMissingTableError } from './utils/dbErrors.js';

function ProtectedRoute({ children, permission }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <PermissionGate permission={permission} fallback={<Navigate to="/" replace />}>
      {children}
    </PermissionGate>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const { showWizard, closeSetupWizard, setDbHealth, adminExists, setAdminExists, setRefreshAdminStatus } = useApp();
  const [appState, setAppState] = useState('loading');
  const [db, setDb] = useState(null);

  useEffect(() => {
    initApp();
  }, []);

  // Expose checkAdmin to the rest of the app via context so that after the
  // first administrator is created (Register.jsx), the "no administrator"
  // banner disappears automatically across every page without a full reload.
  // Registered once checkAdmin is defined below; re-registered if db changes.
  // (checkAdmin is recreated each render, but setRefreshAdminStatus is a stable
  // setter, so this just keeps the slot pointing at the freshest closure.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (db) setRefreshAdminStatus(() => () => checkAdmin(db));
  }, [db]);

  // A table is considered "missing" (schema incomplete) if PostgREST/Postgres
  // reports it can't find the relation — see src/utils/dbErrors.js for why
  // PGRST205 (not just 42P01) must be checked for fresh/empty databases.

  // Full live inspection: every required table must exist AND the installed
  // schema/migration version must match the canonical manifest. Always reads
  // fresh metadata — never cached/previous results.
  //
  // Returns a health object rather than a bare boolean because the startup
  // flow needs to tell apart two very different "incompatible" situations:
  //   - the database has NEVER been installed (force the Setup Wizard from
  //     Step 1 — Welcome, per the "Database Incomplete" scenario), vs.
  //   - the database WAS installed successfully before but has since lost
  //     one or more required objects (per "Reopening the Setup Wizard": do
  //     not force the wizard again — keep the app usable and show a
  //     persistent warning banner with a manual "Run Setup Wizard" action).
  async function getSupabaseSchemaHealth(database) {
    const requiredTables = ['users', 'roles', 'settings', '_schema_version'];
    const checks = await Promise.all(
      requiredTables.map((table) => database.supabase.from(table).select('*').limit(1))
    );

    // Treat ANY error (RLS, permission, missing table, etc.) as schema not ready.
    // The only "success" is a clean response (even if empty). This ensures the
    // Setup Wizard runs whenever the database isn't fully accessible with the
    // anon key — which is the real signal that schema + policies are installed.
    const failedTables = requiredTables.filter((_, i) => checks[i].error);
    if (failedTables.length > 0) {
      let everInstalled = false;
      try {
        const { data, error } = await database.supabase
          .from('_schema_version')
          .select('version')
          .order('applied_at', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) everInstalled = true;
      } catch {}
      return { compatible: false, missingCount: failedTables.length, everInstalled };
    }

    // All tables accessible — now verify version
    const { data: versionRows, error: versionError } = await database.supabase
      .from('_schema_version')
      .select('version')
      .order('applied_at', { ascending: false })
      .limit(1);

    const everInstalled = !versionError && versionRows && versionRows.length > 0;
    const current = versionRows?.[0]?.version;
    const required = SCHEMAS.version || 1;
    let versionMatch = current == required;
    if (!versionMatch && current == null) versionMatch = true;

    let compatible = versionMatch;
    let missingCount = versionMatch ? 0 : 1;

    // Thorough check via exec_sql (if installed). This catches missing
    // triggers, RLS policies, and functions that the table-level check
    // above would miss.
    try {
      const [triggerRows, policyRows, funcRows] = await Promise.all([
        database.query(
          `SELECT t.tgname::text FROM pg_catalog.pg_trigger t
           JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
           JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
           WHERE NOT t.tgisinternal AND n.nspname = 'auth'
             AND c.relname = 'users' AND t.tgname = 'on_auth_user_created'`
        ),
        database.query(
          `SELECT COUNT(*) as count FROM pg_policies WHERE schemaname = 'public'`
        ),
        database.query(
          `SELECT COUNT(*) as count FROM pg_catalog.pg_proc
           WHERE pronamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'public')
             AND prokind = 'f' AND proname IN ('exec_sql','check_admin_exists','is_admin_user')`
        ),
      ]);

      const triggerExists = triggerRows && triggerRows.length > 0;
      const policiesExist = parseInt(policyRows?.[0]?.count || 0, 10) > 0;
      const functionsOk = parseInt(funcRows?.[0]?.count || 0, 10) >= 3;

      if (!triggerExists) missingCount++;
      if (!policiesExist) missingCount++;
      if (!functionsOk) missingCount++;
      compatible = versionMatch && triggerExists && policiesExist && functionsOk;
    } catch {
      // exec_sql not installed — fall back to lightweight probes
      let functionsOk = false;
      try {
        const { error: fnError } = await database.supabase.rpc('check_admin_exists');
        functionsOk = !fnError;
      } catch {}

      let columnsOk = true;
      try {
        const { error: colError } = await database.supabase.from('users').select('id').limit(1);
        if (colError) columnsOk = false;
      } catch {}

      if (!functionsOk) missingCount++;
      if (!columnsOk) missingCount++;
      compatible = versionMatch && functionsOk && columnsOk;
      if (!compatible && missingCount === 0) missingCount = 1;
    }

    return {
      compatible,
      missingCount,
      everInstalled: everInstalled || versionMatch,
    };
  }

  // Non-Supabase (raw SQL) path: derive the same { compatible, missingCount,
  // everInstalled } shape from a DatabaseValidator report so both providers
  // drive the same startup decision logic below.
  async function getRawDbSchemaHealth(database) {
    const validator = new DatabaseValidator(database);
    const report = await validator.validateAll(SCHEMAS);

    let everInstalled = false;
    try {
      const result = await database.query('SELECT COUNT(*) as count FROM _schema_version');
      everInstalled = parseInt(result?.[0]?.count || 0, 10) > 0;
    } catch {
      everInstalled = false;
    }

    return {
      compatible: report.valid,
      missingCount: report.summary.missing + report.summary.issues,
      everInstalled,
    };
  }

  async function initApp() {
    try {
      const database = await initDatabase(config.databaseProvider, {
        url: config.supabaseUrl,
        anonKey: config.supabaseAnonKey,
      });
      setDb(database);

      const health = database.isSupabase
        ? await getSupabaseSchemaHealth(database)
        : await getRawDbSchemaHealth(database);
      setDbHealth(health);

      if (health.compatible) {
        // Check for email confirmation redirect (PKCE code or implicit token
        // in the URL). When present, skip Step 10 wizard and go straight to
        // auth so the user lands on login/dashboard after confirming.
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const search = typeof window !== 'undefined' ? window.location.search : '';
        const isAuthRedirect = hash.includes('access_token=') || search.includes('code=');
        if (isAuthRedirect) {
          await checkAdmin(database);
        } else {
          setAppState('complete');
        }
      } else if (health.everInstalled) {
        // Previously installed, now degraded: never force the Setup Wizard
        // again. Continue loading normally straight into the authentication
        // decision — the persistent warning banner (admin-only) surfaces the
        // issue and offers a manual "Run Setup Wizard" action instead.
        await checkAdmin(database);
      } else {
        // Never installed — always start the Setup Wizard from Step 1.
        setAppState('setup');
      }
    } catch {
      setAppState('setup');
    }
  }

  async function checkAdmin(database) {
    try {
      let adminFound = false;
      if (database.isSupabase) {
        const { data: rpcData, error: rpcError } = await database.supabase.rpc('check_admin_exists');
        if (!rpcError && rpcData !== null) {
          adminFound = rpcData === true;
        } else {
          const { data, error } = await database.supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('full_access', true)
            .limit(1);
          if (error && isMissingTableError(error)) {
            // Schema disappeared/incomplete between the initial check and now —
            // route back to setup instead of silently treating this as "no admin".
            setAppState('setup');
            return;
          }
          if (!error) adminFound = (data?.length || 0) > 0;
        }
      } else {
        const result = await database.query(
          `SELECT COUNT(*) as count FROM users WHERE full_access = true`
        );
        adminFound = parseInt(result[0]?.count || 0, 10) > 0;
      }
      setAdminExists(adminFound);
      setAppState('auth');
    } catch {
      setAdminExists(false);
      setAppState('auth');
    }
  }

  async function persistSetupMetadata(database) {
    try {
      if (database.isSupabase) {
        await database.supabase.from('_schema_version').insert({
          version: SCHEMAS.version || 1,
          description: 'Setup completed via Setup Wizard',
        });
      } else {
        await database.query(
          `INSERT INTO _schema_version (version, description) VALUES (${SCHEMAS.version || 1}, 'Setup completed via Setup Wizard') ON CONFLICT DO NOTHING`
        );
      }
    } catch {}
  }

  // Reached when the wizard was opened because the database was INCOMPLETE
  // (started from Step 1). After Step 1→9 finishes, persist the install
  // metadata, re-validate with fresh data, and only proceed to the
  // Administrator Authority check once the database is confirmed compatible.
  // If it's still incomplete, stay in the wizard (restart at Step 1) — the
  // spec forbids ever falling through to Login/Register/Dashboard otherwise.
  async function handleSetupComplete(database) {
    const activeDb = database || db;
    await persistSetupMetadata(activeDb);
    closeSetupWizard();

    try {
      const health = activeDb.isSupabase
        ? await getSupabaseSchemaHealth(activeDb)
        : await getRawDbSchemaHealth(activeDb);
      setDbHealth(health);

      if (health.compatible) {
        await checkAdmin(activeDb);
      } else {
        setAppState('setup');
      }
    } catch {
      setAppState('setup');
    }
  }

  // Reached when the wizard was opened directly on Step 9 because the
  // database was ALREADY fully compatible — nothing was installed, so no
  // metadata is written. Simply continue to the Administrator Authority check.
  async function handleAlreadyCompleteContinue(database) {
    closeSetupWizard();
    await checkAdmin(database || db);
  }

  if (showWizard) {
    return <SetupWizard schema={SCHEMAS} onComplete={handleSetupComplete} db={db} />;
  }

  if (appState === 'loading') {
    return (
      <div className="app-loading">
        <div className="spinner spinner-lg" />
        <p>Initializing application...</p>
      </div>
    );
  }

  // Database incomplete or incompatible — always start the Setup Wizard from
  // Step 1. No Login/Register/Dashboard access is permitted while this is true.
  if (appState === 'setup') {
    return <SetupWizard schema={SCHEMAS} onComplete={handleSetupComplete} db={db} initialStep={0} />;
  }

  // Database fully compatible — skip Steps 1–9 and open directly on
  // Step 10 (Setup Complete), then continue straight to the auth decision.
  if (appState === 'complete') {
    return <SetupWizard schema={SCHEMAS} onComplete={handleAlreadyCompleteContinue} db={db} initialStep={9} />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to="/" replace />
            : adminExists
              ? <Login />
              : <Navigate to="/register" replace />
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated
            ? <Navigate to="/" replace />
            : adminExists
              ? <Navigate to="/login" replace />
              : <Register isFirstAccount={!adminExists} />
        }
      />

      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<ProtectedRoute permission={PERMISSIONS.USER_READ}><UserList /></ProtectedRoute>} />
        <Route path="users/new" element={<ProtectedRoute permission={PERMISSIONS.USER_CREATE}><UserCreate /></ProtectedRoute>} />
        <Route path="users/:id/edit" element={<ProtectedRoute permission={PERMISSIONS.USER_UPDATE}><UserEdit /></ProtectedRoute>} />
        <Route path="users/:id" element={<ProtectedRoute permission={PERMISSIONS.USER_READ}><UserShow /></ProtectedRoute>} />
        <Route path="roles" element={<ProtectedRoute permission={PERMISSIONS.ROLE_READ}><RoleList /></ProtectedRoute>} />
        <Route path="roles/new" element={<ProtectedRoute permission={PERMISSIONS.ROLE_CREATE}><RoleCreate /></ProtectedRoute>} />
        <Route path="roles/:id/edit" element={<ProtectedRoute permission={PERMISSIONS.ROLE_UPDATE}><RoleEdit /></ProtectedRoute>} />
        <Route path="roles/:id" element={<ProtectedRoute permission={PERMISSIONS.ROLE_READ}><RoleShow /></ProtectedRoute>} />
        <Route path="settings" element={<Settings />} />
        <Route path="invoices/new" element={<ProtectedRoute permission={PERMISSIONS.INVOICE_CREATE}><CreateInvoice /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <PermissionProvider>
          {/* AdminSetupBanner is rendered at the root so it appears on EVERY
              page (login, register, and authenticated pages alike) when no
              administrator exists yet. It self-hides when an admin exists or
              the DB is incompatible, so it is safe to mount unconditionally. */}
          <AdminSetupBanner />
          {/* DatabaseHealthBanner at root level ensures the degraded-DB
              warning is visible on login/register pages, not just inside the
              authenticated MainLayout. It self-hides when the DB is compatible
              or the current user lacks full_access. */}
          <DatabaseHealthBanner />
          <AppRoutes />
        </PermissionProvider>
      </AuthProvider>
    </AppProvider>
  );
}
