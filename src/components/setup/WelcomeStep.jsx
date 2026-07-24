import Button from '../Button.jsx';

export default function WelcomeStep({ next, setCanProceed }) {
  const handleStart = () => {
    setCanProceed(true);
    next();
  };

  return (
    <div className="setup-step-content">
      <div className="setup-hero">
        <div className="setup-hero__icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h1 className="setup-hero__title">Welcome to CoreX</h1>
        <p className="setup-hero__desc">
          This wizard will guide you through setting up your database schema.
          Follow the steps in order — each stage must be completed before progressing.
        </p>
        <div className="setup-hero__requirements">
          <h4>Requirements</h4>
          <ul>
            <li>A Supabase project with URL and API keys</li>
            <li>Access to the Supabase Dashboard SQL Editor</li>
            <li>Service Role Key for schema management</li>
          </ul>
        </div>
      </div>
      <div className="setup-nav">
        <Button variant="primary" onClick={handleStart} icon="shield">Start Setup</Button>
      </div>
    </div>
  );
}
