import { useState, useEffect, useRef, useCallback } from 'react';
import Button from '../Button.jsx';
import DatabaseScanner from '../../services/setup/DatabaseScanner.js';

export default function AnalysisStep({ config, scanResult, setScanResult, setCanProceed, next, back }) {
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const mounted = useRef(true);

  const runScan = useCallback(async () => {
    setScanning(true);
    setScanResult(null);
    setScanError(null);
    setCanProceed(false);
    try {
      const scanner = new DatabaseScanner();
      const result = await scanner.scan(config);
      if (mounted.current) {
        setScanResult(result);
        setCanProceed(true);
      }
    } catch (err) {
      if (mounted.current) setScanError(err.message || 'Scan failed. Check your connection details.');
    } finally {
      if (mounted.current) setScanning(false);
    }
  }, [config, setScanResult, setCanProceed]);

  useEffect(() => {
    mounted.current = true;
    if (!scanResult) runScan();
    return () => { mounted.current = false; };
  }, [refreshKey]);

  const existing = scanResult?.existing || {};
  const missing = scanResult?.missing || {};

  const typeLabels = {
    tables: { label: 'Tables', color: 'var(--primary)' },
    functions: { label: 'Functions', color: 'var(--success)' },
    triggers: { label: 'Triggers', color: 'var(--warning)' },
    policies: { label: 'Policies', color: 'var(--info)' },
    indexes: { label: 'Indexes', color: 'var(--primary)' },
  };

  return (
    <div className="setup-step-content">
      <h2 className="setup-step-title">Schema Analysis</h2>
      <p className="setup-step-desc">Scanning your live database to detect existing and missing objects.</p>

      {scanning && (
        <div className="setup-scanning">
          <div className="spinner spinner-lg" />
          <p>Analyzing extensions, tables, functions, triggers, policies...</p>
        </div>
      )}

      {scanError && !scanning && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <strong>Scan failed:</strong> {scanError}
        </div>
      )}

      {scanResult && !scanning && (
        <div className="setup-results">
          <div className="setup-result-row"><span className="setup-result-label">Provider</span><span className="setup-result-value">{scanResult.provider}</span></div>
          <div className="setup-result-row"><span className="setup-result-label">Schema Version</span><span className="setup-result-value">{scanResult.schemaVersion}</span></div>
          <div className="setup-result-row"><span className="setup-result-label">Extensions</span><span className="setup-result-value">{scanResult.extensions.join(', ') || 'None'}</span></div>
        </div>
      )}

      {scanResult && !scanning && (
        <div className="setup-analysis">
          {Object.entries(typeLabels).map(([key, meta]) => {
            const exist = existing[key] || [];
            const miss = missing[key] || [];
            const total = exist.length + miss.length;
            const pct = total ? Math.round((exist.length / total) * 100) : 0;
            return (
              <div key={key} className="setup-analysis__item">
                <div className="setup-analysis__header">
                  <span className="setup-analysis-label" style={{ color: meta.color }}>{meta.label}</span>
                  <span>{exist.length}/{total} installed</span>
                </div>
                <div className="setup-progress-bar">
                  <div className="setup-progress-bar__fill" style={{ width: `${pct}%`, background: meta.color }} />
                </div>
                {miss.length > 0 && (
                  <div className="setup-analysis__missing">Missing: {miss.join(', ')}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="setup-nav">
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="secondary" onClick={() => setRefreshKey(k => k + 1)} disabled={scanning}>Refresh Scan</Button>
        <Button variant="primary" onClick={next} disabled={!scanResult || scanning}>Continue to Plan</Button>
      </div>
    </div>
  );
}
