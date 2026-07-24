import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressTimeline from '../components/setup/ProgressTimeline.jsx';
import WelcomeStep from '../components/setup/WelcomeStep.jsx';
import DriverStep from '../components/setup/DriverStep.jsx';
import ConnectionStep from '../components/setup/ConnectionStep.jsx';
import VerifyConnectionStep from '../components/setup/VerifyConnectionStep.jsx';
import AnalysisStep from '../components/setup/AnalysisStep.jsx';
import PlanStep from '../components/setup/PlanStep.jsx';
import SqlGenerationStep from '../components/setup/SqlGenerationStep.jsx';
import ExecutionStep from '../components/setup/ExecutionStep.jsx';
import VerifyStep from '../components/setup/VerifyStep.jsx';
import CompleteStep from '../components/setup/CompleteStep.jsx';

const STEP_ORDER = ['welcome', 'driver', 'connection', 'verify-connection', 'analysis', 'plan', 'generate-sql', 'execute-sql', 'verify-install', 'complete'];

const STEPS_MAP = {
  welcome: { component: WelcomeStep, label: 'Welcome', num: 1 },
  driver: { component: DriverStep, label: 'Database Driver', num: 2 },
  connection: { component: ConnectionStep, label: 'Connection Details', num: 3 },
  'verify-connection': { component: VerifyConnectionStep, label: 'Verify Connection', num: 4 },
  analysis: { component: AnalysisStep, label: 'Schema Analysis', num: 5 },
  plan: { component: PlanStep, label: 'Installation Plan', num: 6 },
  'generate-sql': { component: SqlGenerationStep, label: 'Generate SQL', num: 7 },
  'execute-sql': { component: ExecutionStep, label: 'Execute SQL', num: 8 },
  'verify-install': { component: VerifyStep, label: 'Verify Installation', num: 9 },
  complete: { component: CompleteStep, label: 'Setup Complete', num: 10 },
};

const STEP_INDEX = Object.fromEntries(STEP_ORDER.map((s, i) => [s, i]));

export default function SetupWizard({ initialStep }) {
  const nav = useNavigate();
  const [step, setStep] = useState(initialStep || 'welcome');
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [canProceed, setCanProceed] = useState(false);
  const [config, setConfig] = useState({ driver: 'supabase', url: '', anonKey: '', serviceKey: '' });
  const [scanResult, setScanResult] = useState(null);
  const [sqlText, setSqlText] = useState('');
  const [installResult, setInstallResult] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  const next = useCallback(async () => {
    const idx = STEP_INDEX[step];
    if (idx >= STEP_ORDER.length - 1) return;
    setCompletedSteps(prev => new Set([...prev, step]));
    const missing = scanResult?.missing || {};
    const totalMissing = Object.values(missing).reduce((a, b) => a + b.length, 0);

    // Skip execute-sql when nothing is missing
    if (step === 'generate-sql' && totalMissing === 0) {
      setStep('verify-install');
      setCanProceed(false);
      return;
    }

    setStep(STEP_ORDER[idx + 1]);
    setCanProceed(false);
  }, [step, scanResult]);

  const back = useCallback(() => {
    const idx = STEP_INDEX[step];
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }, [step]);

  const CurrentStep = STEPS_MAP[step]?.component;

  return (
    <div className="setup-wizard">
      <ProgressTimeline steps={STEP_ORDER} stepsMap={STEPS_MAP} currentStep={step} completedSteps={completedSteps} />
      <div className="setup-wizard__main">
        <div className="setup-wizard__card">
          {error && <div className="alert alert-danger alert--mb">{error}</div>}
          {CurrentStep && (
            <CurrentStep
              config={config}
              setConfig={setConfig}
              scanResult={scanResult}
              setScanResult={setScanResult}
              sqlText={sqlText}
              setSqlText={setSqlText}
              installResult={installResult}
              setInstallResult={setInstallResult}
              verificationResult={verificationResult}
              setVerificationResult={setVerificationResult}
              health={health}
              setHealth={setHealth}
              next={next}
              back={back}
              nav={nav}
              canProceed={canProceed}
              setCanProceed={setCanProceed}
            />
          )}
        </div>
      </div>
    </div>
  );
}
