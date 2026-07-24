import { useState, useMemo } from 'react';
import Button from '../Button.jsx';
import SqlGenerator from '../../services/setup/SqlGenerator.js';

export default function SqlGenerationStep({ scanResult, sqlText, setSqlText, setCanProceed, next, back }) {
  const [copied, setCopied] = useState(false);
  const [regenerateKey, setRegenerateKey] = useState(0);
  const [showFullSchema, setShowFullSchema] = useState(false);

  const missing = scanResult?.missing || {};
  const totalMissing = Object.values(missing).reduce((a, b) => a + b.length, 0);
  const isAlreadyInstalled = totalMissing === 0;

  const generated = useMemo(() => {
    const gen = new SqlGenerator();
    const text = gen.generate(scanResult);
    setSqlText(text);
    return text;
  }, [scanResult, regenerateKey]);

  const fullGenerated = useMemo(() => SqlGenerator.generateFull(), []);

  const generatedStatementCount = generated.split('\n').filter(l => l.trim() && !l.trim().startsWith('--')).length;
  const fullStatementCount = fullGenerated.split('\n').filter(l => l.trim() && !l.trim().startsWith('--')).length;

  return (
    <div className="setup-step-content">
      <h2 className="setup-step-title">Generate SQL</h2>

      {isAlreadyInstalled ? (
        <>
          <p className="setup-step-desc">Your database schema is already up to date. No SQL generation is needed.</p>
          <div className="setup-plan__group" style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>&#10003;</div>
            <h4 style={{ margin: '0 0 4px', color: 'var(--success)' }}>No changes required</h4>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>All database objects are already installed and verified.</p>
          </div>
        </>
      ) : (
        <>
          <p className="setup-step-desc">Review the generated SQL script before installation. This is the only SQL generation step.</p>
          <div className="setup-plan__summary" style={{ marginBottom: 16 }}>
            <div className="setup-plan__stat">
              <span className="setup-plan__num">{generatedStatementCount}</span>
              <span className="setup-plan__lbl">Statements</span>
            </div>
            <div className="setup-plan__stat">
              <span className="setup-plan__num">{fullStatementCount}</span>
              <span className="setup-plan__lbl">Total Schema</span>
            </div>
          </div>
          <div className="setup-sql-tabs">
            <div 
              className="setup-sql-tab active" 
              onClick={() => setShowFullSchema(false)}
            >
              Missing Only (Installation)
            </div>
            <div 
              className="setup-sql-tab" 
              onClick={() => setShowFullSchema(true)}
            >
              Full Schema (Complete)
            </div>
          </div>
          <pre className="setup-sql-block">{showFullSchema ? fullGenerated : generated}</pre>
        </>
      )}

      <div className="setup-nav">
        {!isAlreadyInstalled && (
          <>
            <Button variant="ghost" onClick={() => {
              try {
                navigator.clipboard.writeText(showFullSchema ? fullGenerated : generated);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {}
            }}>{copied ? 'Copied!' : 'Copy SQL'}</Button>
            <Button variant="ghost" onClick={() => {
              const content = showFullSchema ? fullGenerated : generated;
              const blob = new Blob([content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; 
              a.download = 'corex_install.sql'; 
              a.click();
              URL.revokeObjectURL(url);
            }}>Download SQL</Button>
            <Button variant="ghost" onClick={() => {
              setSqlText('');
              setRegenerateKey(k => k + 1);
            }}>Regenerate</Button>
          </>
        )}
        <Button variant="ghost" onClick={back}>Back</Button>
        {isAlreadyInstalled ? (
          <Button variant="primary" onClick={() => { setCanProceed(true); next(); }} icon="shield">Continue to Verification</Button>
        ) : (
          <Button variant="primary" onClick={() => { setCanProceed(true); next(); }} icon="shield">Continue to Execution</Button>
        )}
      </div>
    </div>
  );
}
