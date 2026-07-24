import { useNavigate } from 'react-router-dom';
import ReportGenerator from '../../services/setup/ReportGenerator.js';

export default function CompleteStep({ scanResult, installResult, verificationResult, health }) {
  const nav = useNavigate();
  const handleLaunch = () => nav('/login', { replace: true });

  const handleExport = () => {
    const gen = new ReportGenerator();
    const report = gen.generate(scanResult, installResult, verificationResult, health);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'corex_setup_report.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackup = () => {
    const data = { scanResult, installResult, verificationResult, health, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'corex_backup.udb.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const existing = scanResult?.existing || {};
  const totalObjects = Object.values(existing).reduce((a, b) => a + b.length, 0);

  return (
    <div className="setup-step-content">
      <div className="setup-finish-center">
        <div className="setup-success__icon"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="var(--success)" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <h2 className="setup-step-title setup-finish-title">Setup Complete</h2>
        <p className="setup-step-desc setup-finish-desc">Installation successful. Your database is ready.</p>
      </div>

      <div className="setup-plan__summary" style={{ marginBottom: 24 }}>
        <div className="setup-plan__stat">
          <span className="setup-plan__num" style={{ color: 'var(--success)' }}>{totalObjects}</span>
          <span className="setup-plan__lbl">Objects Installed</span>
        </div>
        <div className="setup-plan__stat">
          <span className="setup-plan__num" style={{ color: 'var(--primary)' }}>{scanResult?.schemaVersion || '1.0'}</span>
          <span className="setup-plan__lbl">Schema Version</span>
        </div>
        <div className="setup-plan__stat">
          <span className="setup-plan__num" style={{ color: 'var(--success)' }}>{verificationResult?.score || 100}<span style={{ fontSize: 14 }}>/100</span></span>
          <span className="setup-plan__lbl">Verification Score</span>
        </div>
      </div>

      <div className="setup-finish-actions">
        <button className="setup-card" onClick={handleLaunch}>
          <span className="setup-card__icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg></span>
          <span className="setup-card__body">
            <span className="setup-card__title">Launch Application</span>
            <span className="setup-card__desc">Go to the login page</span>
          </span>
        </button>
        <button className="setup-card" onClick={handleExport}>
          <span className="setup-card__icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span>
          <span className="setup-card__body">
            <span className="setup-card__title">Export Report</span>
            <span className="setup-card__desc">Download setup report (JSON)</span>
          </span>
        </button>
        <button className="setup-card" onClick={handleBackup}>
          <span className="setup-card__icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></span>
          <span className="setup-card__body">
            <span className="setup-card__title">Create Backup</span>
            <span className="setup-card__desc">Download a backup (.udb.json)</span>
          </span>
        </button>
      </div>
    </div>
  );
}
