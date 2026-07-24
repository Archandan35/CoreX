import { useState, useEffect, useRef, useCallback } from 'react';
import Button from '../Button.jsx';
import VerificationEngine from '../../services/setup/VerificationEngine.js';

export default function VerifyStep({ config, setScanResult, verificationResult, setVerificationResult, setCanProceed, next, back }) {
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedIssue, setExpandedIssue] = useState(null);
  const mounted = useRef(true);

  const runVerify = useCallback(async () => {
    setVerifying(true);
    setVerificationResult(null);
    setVerifyError(null);
    setCanProceed(false);
    setExpandedIssue(null);
    try {
      const verifier = new VerificationEngine();
      const result = await verifier.verify(config);
      if (mounted.current) {
        setVerificationResult(result);
        if (result.scan) setScanResult(result.scan);
        setCanProceed(result.passed);
      }
    } catch (err) {
      if (mounted.current) setVerifyError(err.message || 'Verification failed');
    } finally {
      if (mounted.current) setVerifying(false);
    }
  }, [config, setScanResult, setVerificationResult, setCanProceed]);

  useEffect(() => {
    mounted.current = true;
    runVerify();
    return () => { mounted.current = false; };
  }, [refreshKey]);

  return (
    <div className="setup-step-content">
      <h2 className="setup-step-title">Verify Installation</h2>
      <p className="setup-step-desc">Re-scanning your database to confirm everything was installed correctly.</p>

      {verifying && (
        <div className="setup-scanning">
          <div className="spinner spinner-lg" />
          <p>Re-scanning database...</p>
        </div>
      )}

      {verifyError && !verifying && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <strong>Verification failed:</strong> {verifyError}
        </div>
      )}

      {verificationResult && !verifying && (
        <div className="setup-results">
          <div className={`setup-verify-badge ${verificationResult.passed ? 'setup-verify-badge--pass' : 'setup-verify-badge--fail'}`}>
            {verificationResult.passed ? '✓ All checks passed' : `${verificationResult.failedChecks} issue(s) found`}
          </div>

          <div className="setup-plan__summary" style={{ marginTop: 16 }}>
            <div className="setup-plan__stat">
              <span className="setup-plan__num">{verificationResult.totalChecks}</span>
              <span className="setup-plan__lbl">Total Checks</span>
            </div>
            <div className="setup-plan__stat">
              <span className="setup-plan__num" style={{ color: 'var(--success)' }}>{verificationResult.passedChecks}</span>
              <span className="setup-plan__lbl">Passed</span>
            </div>
            <div className="setup-plan__stat">
              <span className="setup-plan__num" style={{ color: 'var(--danger)' }}>{verificationResult.failedChecks}</span>
              <span className="setup-plan__lbl">Failed</span>
            </div>
            <div className="setup-plan__stat">
              <span className="setup-plan__num">{verificationResult.score}<span style={{ fontSize: 14 }}>/100</span></span>
              <span className="setup-plan__lbl">Score</span>
            </div>
          </div>

          <p className="setup-summary">{verificationResult.summary}</p>

          {verificationResult.issues.map((issue, i) => (
            <div key={i} className="setup-issue-card">
              <div
                onClick={() => setExpandedIssue(expandedIssue === i ? null : i)}
                className={`setup-issue-header ${issue.severity === 'error' ? 'setup-issue-header--error' : 'setup-issue-header--warning'}`}
              >
                <span className={issue.severity === 'error' ? 'setup-issue-icon' : 'setup-issue-icon--warn'}>
                  {issue.severity === 'error' ? '!' : '-'}
                </span>
                <span className="setup-issue-text">{issue.message}</span>
                <span className="setup-issue-toggle">{expandedIssue === i ? 'less' : 'details'}</span>
              </div>
              {expandedIssue === i && (
                <div className="setup-issue-body">
                  <div className="setup-issue-field"><strong>Type:</strong> {issue.objectType}</div>
                  <div className="setup-issue-field"><strong>Name:</strong> <code>{issue.objectName}</code></div>
                  <div className="setup-issue-field"><strong>Reason:</strong> {issue.reason}</div>
                  <div className="setup-issue-field"><strong>Suggestion:</strong> {issue.suggestedResolution}</div>
                  {issue.expectedDefinition && (
                    <div>
                      <strong>Expected Definition:</strong>
                      <pre className="setup-issue-def">{issue.expectedDefinition}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="setup-nav">
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="secondary" onClick={() => setRefreshKey(k => k + 1)} disabled={verifying}>Re-scan</Button>
        <Button variant="primary" onClick={next} disabled={!verificationResult?.passed}>Complete Setup</Button>
      </div>
    </div>
  );
}
