import { useState } from 'react';
import Button from '../Button.jsx';
import ConnectionManager from '../../services/setup/ConnectionManager.js';

export default function VerifyConnectionStep({ config, setCanProceed, next, back }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [verified, setVerified] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleVerify = async () => {
    setTesting(true);
    setTestResult(null);
    setCanProceed(false);
    setVerified(false);
    const cm = new ConnectionManager();
    const result = await cm.testConnection(config);
    setTestResult(result);
    if (result.ok) {
      setCanProceed(true);
      setVerified(true);
    }
    setTesting(false);
  };

  const buttonDisabled = testing || (verified && !hovered);

  return (
    <div className="setup-step-content">
      <h2 className="setup-step-title">Verify Connection</h2>
      <p className="setup-step-desc">Test that your database credentials are correct and the service is reachable.</p>

      <div className="setup-verify-connection">
        <div className="setup-verify-summary">
          <div className="setup-verify-field"><strong>URL:</strong> {config.url}</div>
          <div className="setup-verify-field"><strong>Driver:</strong> {config.driver}</div>
        </div>

        {!testResult && !testing && (
          <div className="setup-verify-prompt">
            <p>Click <strong>Verify Connection</strong> to test connectivity before proceeding.</p>
          </div>
        )}

        {testing && (
          <div className="setup-scanning">
            <div className="spinner spinner-lg" />
            <p>Testing connection...</p>
          </div>
        )}

        {testResult && !testing && (
          <div className={`alert ${testResult.ok ? 'alert-success' : 'alert-danger'} alert--mb`}>
            <strong>{testResult.ok ? 'Connected Successfully' : 'Connection Failed'}</strong>
            <p style={{ marginTop: 4, fontSize: 13 }}>{testResult.message}</p>
            {testResult.details && (
              <ul className="setup-verify-details">
                {testResult.details.map((d, i) => (
                  <li key={i} className={`setup-verify-detail ${d.ok ? 'ok' : 'fail'}`}>
                    {d.ok ? '✓' : '✗'} {d.label}: {d.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="setup-nav">
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button
          variant={verified && !hovered ? 'ghost' : 'primary'}
          onClick={handleVerify}
          loading={testing}
          disabled={buttonDisabled}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {verified ? (hovered ? 'Re-verify' : 'Verified') : 'Verify Connection'}
        </Button>
        <Button variant="primary" onClick={next} disabled={!testResult?.ok}>Continue</Button>
      </div>
    </div>
  );
}
