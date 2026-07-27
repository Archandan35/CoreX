import { useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

const STEPS = [
  { num: 1, label: 'Welcome', desc: 'Introduction & overview', done: true },
  { num: 2, label: 'Database Provider', desc: 'Choose your database', done: true },
  { num: 3, label: 'Connection Details', desc: 'Enter connection information', done: true },
  { num: 4, label: 'Verify Connection', desc: 'Test and verify database connection', done: true },
  { num: 5, label: 'Schema Analysis', desc: 'Analyze existing schema', done: false, current: true },
  { num: 6, label: 'Installation Plan', desc: 'Review installation summary', done: false },
  { num: 7, label: 'Generate & Execute SQL', desc: 'Create and run SQL scripts', done: false },
  { num: 8, label: 'Verify Installation', desc: 'Verify installed objects', done: false },
  { num: 9, label: 'Final Validation', desc: 'Final system validation', done: false },
  { num: 10, label: 'Setup Complete', desc: 'Setup finished successfully', done: false },
];

const SCHEMA_ITEMS = [
  { icon: 'grid', title: 'Tables', desc: 'Create all required tables' },
  { icon: 'list', title: 'Indexes', desc: 'Create performance indexes' },
  { icon: 'share', title: 'Relationships', desc: 'Set up table relationships' },
  { icon: 'shield', title: 'Constraints', desc: 'Add data integrity constraints' },
  { icon: 'calculator', title: 'Functions', desc: 'Create helper functions' },
  { icon: 'bolt', title: 'Triggers', desc: 'Create database triggers' },
  { icon: 'lock', title: 'Extensions', desc: 'Install required extensions' },
  { icon: 'file-text', title: 'Views', desc: 'Create database views' },
];

export default function SetupSchema() {
  const [activeStep, setActiveStep] = useState(4);

  return (
    <div className="ss-shell">
      <header className="ss-header">
        <div className="ss-header-left">
          <div className="ss-logo">
            <Icon name="database" size={26} />
          </div>
          <div className="ss-header-title">
            <h1>Setup Wizard</h1>
            <p>Guided setup for your application</p>
          </div>
        </div>
        <button className="ss-btn-help">
          <Icon name="info" size={16} /> Need Help?
        </button>
      </header>

      <div className="ss-body">
        <aside className="ss-sidebar">
          <div className="ss-step-list">
            {STEPS.map((s, i) => (
              <div key={s.num} className={`ss-step-row${s.current ? ' ss-step-active' : ''}`}>
                <div className="ss-connector" />
                <div className={`ss-num-circle${s.done ? ' ss-done' : ''}${s.current ? ' ss-current' : ''}`}>
                  {s.done ? <Icon name="check" size={14} /> : s.num}
                </div>
                <div className="ss-step-text">
                  <div className="ss-step-title">{s.label}</div>
                  <div className="ss-step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="ss-main">
          <h2 className="ss-page-title">3. Database Schema</h2>
          <p className="ss-page-sub">We'll create all the required database objects for your application.</p>

          <div className="ss-schema-panel">
            <div className="ss-schema-panel-head">
              <h3>Schema Installation</h3>
              <button className="ss-btn-customize">
                <Icon name="pen" size={16} /> Customize Schema
              </button>
            </div>

            <div className="ss-schema-grid">
              {SCHEMA_ITEMS.map((item) => (
                <div key={item.title} className="ss-schema-item">
                  <div className="ss-schema-row-line">
                    <div className="ss-schema-icon">
                      <Icon name={item.icon} size={19} />
                    </div>
                    <div className="ss-schema-info">
                      <div className="ss-schema-title">{item.title}</div>
                      <div className="ss-schema-desc">{item.desc}</div>
                    </div>
                    <span className="ss-badge-ready">
                      <Icon name="check" size={13} /> Ready
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="ss-info-banner">
              <Icon name="info" size={18} />
              <div>
                <div className="ss-info-main">
                  This will create 24 tables, 38 indexes, 12 functions, 15 triggers and other database objects.
                </div>
                <div className="ss-info-sub">Estimated time: 10—20 seconds</div>
              </div>
            </div>

            <div className="ss-advanced-row">
              <div className="ss-adv-left">
                <Icon name="gear" size={17} />
                <span>Advanced Options <span className="ss-adv-optional">(Optional)</span></span>
              </div>
              <Icon name="chevron-down" size={17} />
            </div>
          </div>

          <div className="ss-action-row">
            <Button variant="secondary" icon="arrow-left">Back</Button>
            <Button variant="primary" icon="database">
              Install Schema
              <Icon name="arrow-right" size={16} />
            </Button>
          </div>
        </main>

        <aside className="ss-right-col">
          <div className="ss-rc-card">
            <h3>Setup Progress</h3>
            <div className="ss-progress-wrap">
              <div className="ss-progress-ring">
                <svg width="150" height="150" viewBox="0 0 150 150">
                  <circle cx="75" cy="75" r="64" fill="none" stroke="#E7E9EE" strokeWidth="10" />
                  <circle cx="75" cy="75" r="64" fill="none" stroke="#6D5BD0" strokeWidth="10"
                    strokeLinecap="round" strokeDasharray="402" strokeDashoffset="201" />
                </svg>
                <div className="ss-pct">50%</div>
              </div>
              <div className="ss-progress-caption">3 of 6 completed</div>
            </div>
          </div>

          <div className="ss-rc-card">
            <div className="ss-next-head">
              <div className="ss-next-num">4</div>
              <div className="ss-next-title">Permissions &amp; Security</div>
            </div>
            <p className="ss-next-desc">Configure role-based access and security policies for your database.</p>
            <div className="ss-illustration-box">
              <Icon name="shield" size={46} />
              <div className="ss-stack">
                <Icon name="user" size={30} />
                <Icon name="database" size={30} />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <footer className="ss-footer-bar">
        <div className="ss-foot-left">
          <Icon name="lock" size={14} /> Your data is safe with us. We use industry-standard encryption.
        </div>
        <div>Setup Wizard v1.0.0</div>
      </footer>
    </div>
  );
}