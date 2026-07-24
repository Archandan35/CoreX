import { useState } from 'react';
import Button from '../Button.jsx';
import InstallationExecutor from '../../services/setup/InstallationExecutor.js';

export default function ExecutionStep({ config, sqlText, installResult, setInstallResult, setCanProceed, next, back }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sqlText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleVerified = () => {
    setInstallResult({ success: true, manualInstall: true, message: 'SQL has been executed. Proceed to verification.', duration: 0, statementsExecuted: 0 });
    setCanProceed(true);
    next();
  };

  const statementCount = sqlText?.split('\n').filter(l => l.trim() && !l.trim().startsWith('--')).length || 0;

  return (
    <div className="setup-step-content">
      <h2 className="setup-step-title">Execute SQL</h2>
      <p className="setup-step-desc">Run the generated SQL against your database.</p>

      <div className="alert alert-warning alert--mb setup-install-alert">
        <strong>Manual execution required.</strong><br /><br />
        Follow these steps:
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Open your Supabase Dashboard</li>
          <li>Go to <strong>SQL Editor</strong></li>
          <li>Paste the generated SQL script</li>
          <li>Execute it</li>
          <li>Return to this wizard and click <strong>I've Run the SQL</strong></li>
        </ol>
      </div>

      <p>Ready to execute <strong>{statementCount}</strong> statements.</p>

      <pre className="setup-sql-block">{sqlText}</pre>

      <div className="setup-nav">
        <Button variant="ghost" onClick={handleCopy}>{copied ? 'Copied!' : 'Copy SQL'}</Button>
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" onClick={handleVerified} icon="shield">I've Run the SQL — Verify</Button>
      </div>
    </div>
  );
}
