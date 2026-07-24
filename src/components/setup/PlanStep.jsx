import { useEffect, useMemo } from 'react';
import Button from '../Button.jsx';
import MANIFEST from '../../services/setup/SchemaManifest.js';

function groupColumns(missingColumns) {
  const groups = {};
  for (const col of missingColumns) {
    const [table] = col.split('.');
    if (!groups[table]) groups[table] = [];
    groups[table].push(col);
  }
  return groups;
}

export default function PlanStep({ scanResult, setCanProceed, next, back }) {
  useEffect(() => { setCanProceed(true); }, [setCanProceed]);
  const missing = scanResult?.missing || {};
  const existing = scanResult?.existing || {};

  const totalMissing = useMemo(() => Object.values(missing).reduce((a, b) => a + b.length, 0), [missing]);
  const totalExisting = useMemo(() => Object.values(existing).reduce((a, b) => a + b.length, 0), [existing]);

  const columnGroups = useMemo(() => groupColumns(missing.columns || []), [missing.columns]);

  const estimatedSeconds = useMemo(() => totalMissing * 1.5, [totalMissing]);
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  const typeLabels = {
    tables: 'Tables',
    functions: 'Functions',
    triggers: 'Triggers',
    policies: 'Policies',
    indexes: 'Indexes',
    columns: 'Columns',
  };

  return (
    <div className="setup-step-content">
      <h2 className="setup-step-title">Installation Plan</h2>
      <p className="setup-step-desc">Review what exists and what will be created.</p>

      <div className="setup-plan">
        <div className="setup-plan__summary">
          <div className="setup-plan__stat">
            <span className="setup-plan__num">{totalExisting}</span>
            <span className="setup-plan__lbl">Existing</span>
          </div>
          <div className="setup-plan__stat">
            <span className="setup-plan__num setup-plan__num--missing">{totalMissing}</span>
            <span className="setup-plan__lbl">To Install</span>
          </div>
          <div className="setup-plan__stat">
            <span className="setup-plan__num">{totalExisting + totalMissing}</span>
            <span className="setup-plan__lbl">Total Objects</span>
          </div>
          <div className="setup-plan__stat">
            <span className="setup-plan__num">{estimatedMinutes}<span style={{ fontSize: 14 }}>m</span></span>
            <span className="setup-plan__lbl">Est. Time</span>
          </div>
        </div>

        {totalMissing === 0 ? (
          <div className="setup-plan__group" style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>&#10003;</div>
            <h4 style={{ margin: '0 0 4px', color: 'var(--success)' }}>Database is already fully installed</h4>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No installation is required. All {totalExisting} objects are present.</p>
          </div>
        ) : (
          <>
            {Object.entries(missing).map(([key, items]) => {
              if (items.length === 0 || key === 'columns') return null;
              const label = typeLabels[key] || key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <div key={key} className="setup-plan__group">
                  <h4 className="setup-plan__group-title">{label} ({items.length})</h4>
                  <ul className="setup-plan__list">
                    {items.map((item) => (
                      <li key={item} className="setup-plan__item">{item}</li>
                    ))}
                  </ul>
                </div>
              );
            })}

            {Object.keys(columnGroups).length > 0 && (
              <div className="setup-plan__group">
                <h4 className="setup-plan__group-title">Columns ({missing.columns.length})</h4>
                {Object.entries(columnGroups).map(([table, cols]) => (
                  <div key={table} className="setup-plan-column-group">
                    <strong className="setup-plan-column-table">{table}</strong>
                    <ul className="setup-plan__list">
                      {cols.map(col => (
                        <li key={col} className="setup-plan__item setup-plan-column-item">{col.split('.')[1]}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="setup-nav">
        <Button variant="ghost" onClick={back}>Back</Button>
        {totalMissing === 0 ? (
          <Button variant="primary" onClick={next}>Continue</Button>
        ) : (
          <Button variant="primary" onClick={next}>Generate SQL</Button>
        )}
      </div>
    </div>
  );
}
