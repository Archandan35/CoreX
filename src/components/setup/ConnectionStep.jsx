import { Field, Input } from '../Field.jsx';
import PasswordInput from '../PasswordInput.jsx';
import Button from '../Button.jsx';
import { configure } from '../../services/supabaseSync.js';

function updateConfig(config, setConfig, setCanProceed, key, value) {
  const next = { ...config, [key]: value };
  setConfig(next);
  setCanProceed(false);
  if (next.url && next.serviceKey) {
    configure({ url: next.url, anonKey: next.anonKey, serviceKey: next.serviceKey });
  }
}

export default function ConnectionStep({ config, setConfig, setCanProceed, next, back }) {
  const update = (key, value) => updateConfig(config, setConfig, setCanProceed, key, value);

  const hasAll = config.url && config.anonKey && config.serviceKey;

  return (
    <div className="setup-step-content">
      <h2 className="setup-step-title">Connection Details</h2>
      <p className="setup-step-desc">Enter your database credentials. You will verify the connection in the next step.</p>

      <div className="setup-form">
        <Field label="Supabase URL">
          <Input value={config.url || ''} onChange={(e) => update('url', e.target.value)} placeholder="https://your-project.supabase.co" />
        </Field>
        <div className="alert alert-info setup-hint">
          Enter the project URL only (e.g. https://your-project.supabase.co). Do not include /rest/v1/ or other paths.
        </div>
        <Field label="Supabase Anon Key">
          <PasswordInput value={config.anonKey || ''} onChange={(e) => update('anonKey', e.target.value)} placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
        </Field>
        <Field label="Supabase Service Role Key">
          <PasswordInput value={config.serviceKey || ''} onChange={(e) => update('serviceKey', e.target.value)} placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
        </Field>
      </div>

      <div className="setup-nav">
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" onClick={() => { setCanProceed(true); next(); }} disabled={!hasAll}>Continue</Button>
      </div>
    </div>
  );
}
