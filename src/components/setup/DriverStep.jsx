import Button from '../Button.jsx';

const DRIVERS = [
  { id: 'supabase', icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>', title: 'Supabase', desc: 'PostgreSQL database with REST API, auth, and storage' },
  { id: 'firebase', icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 20L10 4l-3 16 7 4 9-4z"/><path d="M7 20L3 8l4 12z"/></svg>', title: 'Firebase', desc: 'NoSQL database with real-time sync and auth' },
  { id: 'postgresql', icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>', title: 'PostgreSQL', desc: 'Direct PostgreSQL connection with full schema control' },
  { id: 'mysql', icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>', title: 'MySQL', desc: 'MySQL/MariaDB connection with schema migration' },
  { id: 'other', icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', title: 'Other', desc: 'Custom database connection with ODBC/JDBC bridge' },
];

export default function DriverStep({ config, setConfig, setCanProceed, next, back }) {
  const selected = config.driver || 'supabase';

  const handleSelect = (id) => {
    setConfig({ ...config, driver: id });
    setCanProceed(true);
  };

  return (
    <div className="setup-step-content">
      <h2 className="setup-step-title">Select Database Driver</h2>
      <p className="setup-step-desc">Choose your database type to configure the connection.</p>
      <div className="setup-cards setup-cards--vertical">
        {DRIVERS.map((d) => (
          <button
            key={d.id}
            className={`setup-card ${selected === d.id ? 'setup-card--selected' : ''}`}
            onClick={() => handleSelect(d.id)}
          >
            <span className="setup-card__icon" dangerouslySetInnerHTML={{ __html: d.icon }} />
            <span className="setup-card__body">
              <span className="setup-card__title">{d.title}</span>
              <span className="setup-card__desc">{d.desc}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="setup-nav">
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" onClick={next} disabled={!selected}>Continue</Button>
      </div>
    </div>
  );
}
