import { useState, useCallback, useEffect, useRef } from 'react';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/ui/Icon.jsx';
import ThemeToggle from '../components/ui/ThemeToggle.jsx';
import { DatabaseValidator } from './DatabaseValidator.js';
import { SqlGenerator } from './SqlGenerator.js';
import { SchemaAnalyzer } from './SchemaAnalyzer.js';
import { highlightSql } from './SqlHighlighter.js';
import { PROVIDERS, getProvider } from './ProviderRegistry.js';
import { isMissingTableError, isMissingColumnError } from '../utils/dbErrors.js';
import { bindInline } from '../data/sqlParams.js';

const STEPS = [
  { id: 'welcome', label: 'Welcome', icon: 'home' },
  { id: 'driver', label: 'Driver', icon: 'database' },
  { id: 'connection', label: 'Connection', icon: 'gear' },
  { id: 'verify', label: 'Verify', icon: 'shield' },
  { id: 'verified', label: 'Verified', icon: 'check-circle' },
  { id: 'analysis', label: 'Analysis', icon: 'scan' },
  { id: 'plan', label: 'Plan', icon: 'list' },
  { id: 'execute', label: 'Execute', icon: 'bolt' },
  { id: 'recheck', label: 'Re-check', icon: 'check-circle' },
  { id: 'complete', label: 'Done', icon: 'check' },
];

const genStatus = { PENDING: 'pending', RUNNING: 'running', COMPLETED: 'completed', FAILED: 'failed' };

export default function SetupWizard({ schema, onComplete, db, initialStep }) {
  const [step, setStep] = useState(initialStep || 0);
  const [completedSteps, setCompletedSteps] = useState(new Set([0]));
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [summaryError, setSummaryError] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(null);
  const [visibleFields, setVisibleFields] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [plan, setPlan] = useState(null);
  const [sqlText, setSqlText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genStepStatus, setGenStepStatus] = useState(genStatus.PENDING);
  const [executing, setExecuting] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [validationResult, setValidationResult] = useState(null);
  const [dbInstance, setDbInstance] = useState(db || null);
  const [sqlSearch, setSqlSearch] = useState('');
  const [sqlFullscreen, setSqlFullscreen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [validatingStage, setValidatingStage] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(null);
  const [validationReport, setValidationReport] = useState(null);
  const [installSkipped, setInstallSkipped] = useState(false);
  const [conflictError, setConflictError] = useState(null);
  const completingRef = useRef(false);
  const [completing, setCompleting] = useState(false);

  const invalidateValidation = () => {
    setValidationReport(null);
    setAnalysis(null);
    setPlan(null);
    setSqlText('');
    setGenStepStatus(genStatus.PENDING);
    setVerifyStatus(null);
    setValidationResult(null);
    setInstallSkipped(false);
    setConflictError(null);
  };

  const notify = (message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => { setToast(null); toastTimer.current = null; }, 2500);
  };

  const maxAccessible = Math.max(...completedSteps);

  const goNext = () => {
    setCompletedSteps((prev) => new Set([...prev, step]));
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));
  const goTo = (s) => {
    if (s <= maxAccessible + 1) setStep(s);
  };

  const selectProvider = (providerId) => {
    setSelectedProvider(providerId);
    setFieldValues({});
    setFieldErrors({});
    setSummaryError('');
    setValidationSuccess(null);
    setVisibleFields({});
    invalidateValidation();
  };

  const setField = (key, value) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: null }));
    setSummaryError('');
    setValidationSuccess(null);
    invalidateValidation();
  };

  const toggleFieldVisibility = (key) => {
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const autoAdvancing = useRef(false);
  useEffect(() => {
    if (validationSuccess && !autoAdvancing.current && step === 3) {
      autoAdvancing.current = true;
      const timer = setTimeout(() => {
        goNext();
        autoAdvancing.current = false;
      }, 800);
      return () => { clearTimeout(timer); autoAdvancing.current = false; };
    }
  });
  const copyField = async (value) => {
    try { await navigator.clipboard.writeText(value || ''); } catch { }
  };

  const validateStages = [
    'Connecting to database...',
    'Authenticating credentials...',
    'Reading database metadata...',
    'Preparing schema analysis...',
  ];

  const handleValidate = useCallback(async () => {
    const provider = getProvider(selectedProvider);
    if (!provider) return;
    setValidating(true);
    setValidatingStage(0);
    setFieldErrors({});
    setSummaryError('');
    setValidationSuccess(null);

    const newFieldErrors = {};
    for (const field of provider.fields) {
      if (field.required && !fieldValues[field.key]) newFieldErrors[field.key] = `${field.label} is required.`;
    }
    if (Object.keys(newFieldErrors).length > 0) {
      newFieldErrors._summary = 'Please fill in all required fields before validating.';
      setFieldErrors(newFieldErrors);
      setValidating(false);
      setValidatingStage(0);
      return;
    }

    try {
      setValidatingStage(1);
      const result = await provider.validate(fieldValues);
      setValidatingStage(2);
      if (result.ok) {
        setValidatingStage(3);
        setValidationSuccess({ provider: provider.name, projectInfo: result.projectInfo });
        if (result.client) {
          const supabase = result.client;
          const dbClient = {
            query: async (sql, params) => {
              const lower = sql.trim().toLowerCase();
              const tbl = (n) => params && params.length > 0 ? params[0] : (sql.match(/table_name\s*=\s*['''](\w+)[''']/i)?.[1] || '');
              const col = (n) => params && params.length > 1 ? params[1] : (sql.match(/column_name\s*=\s*['''](\w+)[''']/i)?.[1] || '');
              const tableName = params?.[0] || sql.match(/FROM\s+(\w+)/i)?.[1] || '';
              const columnName = params?.[1] || '';

              if (lower.includes('select exists')) {
                if (lower.includes('information_schema.tables') || lower.includes('sqlite_master')) {
                  try {
                    const name = tbl();
                    if (!name) return [{ exists: false }];
                    const { error: e } = await supabase.from(name).select('*').limit(1);
                    return [{ exists: !isMissingTableError(e) }];
                  } catch { return [{ exists: false }]; }
                }
                if (lower.includes('information_schema.columns')) {
                  try {
                    const t = tbl(), c = col();
                    if (!t || !c) return [{ exists: false }];
                    const { error } = await supabase.from(t).select(c).limit(1);
                    if (error) {
                      if (isMissingTableError(error)) return [{ exists: false }];
                      if (isMissingColumnError(error)) return [{ exists: false }];
                      return [{ exists: true }];
                    }
                    return [{ exists: true }];
                  } catch { return [{ exists: false }]; }
                }
                if (lower.includes('pg_extension')) {
                  if (params && params.length > 0) {
                    const extName = params[0];
                    const known = ['uuid-ossp', 'pgcrypto', 'pgjwt', 'pg_graphql', 'pg_stat_statements'];
                    return [{ exists: known.includes(extName) }];
                  }
                  return [{ exists: false }];
                }
                if (lower.includes('pg_indexes')) {
                  const idxCol = sql.match(/LIKE\s+[''']%(\w+)%[''']/i)?.[1] || columnName;
                  if (idxCol) {
                    try {
                      const t = tbl();
                      if (!t) return [{ exists: false }];
                      const { error: e } = await supabase.from(t).select('*', { head: true }).limit(1);
                      return [{ exists: !isMissingTableError(e) }];
                    } catch { return [{ exists: false }]; }
                  }
                  return [{ exists: false }];
                }
                if (lower.includes('table_constraints')) {
                  try {
                    const t = tbl();
                    if (!t) return [{ exists: false }];
                    const { error: e } = await supabase.from(t).select('*', { head: true }).limit(1);
                    return [{ exists: !isMissingTableError(e) }];
                  } catch { return [{ exists: false }]; }
                }
                return [{ exists: false }];
              }

              if (lower.includes('information_schema.columns')) {
                const t = tbl();
                if (!t) return [];
                try {
                  const { error: existsErr } = await supabase.from(t).select('*', { head: true }).limit(1);
                  if (isMissingTableError(existsErr)) return [];
                } catch { return []; }
                try {
                  const { data: row } = await supabase.from(t).select('*').limit(1);
                  if (row && row.length > 0) return Object.keys(row[0]).map((c) => ({ column_name: c }));
                } catch { }
                return [];
              }

              if (lower.includes('information_schema.schemata')) {
                const schemaName = sql.match(/schema_name\s*=\s*['''](\w+)[''']/i)?.[1] || 'public';
                return [{ schema_name: schemaName }];
              }

              if (lower.includes('information_schema.routines') || lower.includes('information_schema.triggers') || lower.includes('information_schema.views')) {
                return [];
              }

              if (lower.includes('pg_catalog') || lower.includes('from pg_trigger') || lower.includes('from pg_class') || lower.includes('from pg_namespace')) {
                try {
                  const bound = bindInline(sql, params);
                  const { data, error } = await supabase.rpc('exec_sql', { query_text: bound });
                  if (error) {
                    return [];
                  }
                  return Array.isArray(data) ? data : [];
                } catch {
                  return [];
                }
              }

              if (lower.includes('pg_policies')) {
                return [];
              }

              if (lower.includes('_schema_version')) {
                try {
                  const { data, error } = await supabase.from('_schema_version').select('version').limit(1);
                  if (error) return [];
                  if (data && data.length > 0) return data;
                  return [{ version: null }];
                } catch { return [{ version: null }]; }
              }

              if (lower.includes('select count(*)')) {
                try {
                  const t = sql.match(/FROM\s+(\w+)/i)?.[1] || tableName;
                  if (!t) return [{ count: 0 }];
                  let query = supabase.from(t).select('*', { count: 'exact', head: true });
                  const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*(true|false|'[^']*'|\S+)/i);
                  if (whereMatch) {
                    const field = whereMatch[1];
                    let val = whereMatch[2];
                    if (val === 'true') val = true;
                    else if (val === 'false') val = false;
                    else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
                    query = query.eq(field, val);
                  }
                  const { count, error } = await query;
                  if (error) throw error;
                  return [{ count: count || 0 }];
                } catch { return [{ count: 0 }]; }
              }

              if (lower.includes('sqlite_master')) {
                return [];
              }

              return [];
            },
            _raw: supabase,
          };
          setDbInstance(dbClient);
        }
      } else if (result.errors) {
        const errs = {};
        let hasField = false;
        for (const [k, v] of Object.entries(result.errors)) {
          if (k === '_summary') setSummaryError(v);
          else { errs[k] = v; hasField = true; }
        }
        setFieldErrors(errs);
        if (result.errors._summary) setSummaryError(result.errors._summary);
        if (!result.errors._summary && !hasField) setSummaryError('Connection validation failed.');
      }
    } catch (err) {
      setSummaryError(`Connection validation failed: ${err.message}`);
    } finally { setValidating(false); }
  }, [selectedProvider, fieldValues]);

  const storeReport = useCallback((report) => {
    setValidationReport(report);
    const analyzer = new SchemaAnalyzer(schema);
    const result = analyzer.analyze(report);
    setAnalysis(result);
    setPlan(analyzer.getInstallationPlan(result));
    return result;
  }, [schema]);

  const handleAnalyze = useCallback(async () => {
    if (!dbInstance) return;
    setBusy(true);
    try {
      const validator = new DatabaseValidator(dbInstance);
      const report = await validator.validateAll(schema);
      storeReport(report);
      setGenStepStatus(genStatus.PENDING);
      setSqlText('');
    } catch (err) {
      setErrors((e) => ({ ...e, analysis: err.message }));
    } finally { setBusy(false); }
  }, [dbInstance, schema, storeReport]);

  const validatedStep3 = useRef(false);
  useEffect(() => {
    if (step === 3 && !validatedStep3.current) {
      validatedStep3.current = true;
      handleValidate();
    }
    if (step !== 3) validatedStep3.current = false;
  }, [step, handleValidate]);
  const analyzedStep4 = useRef(false);
  useEffect(() => {
    if (step === 5 && !analyzedStep4.current && !busy && !analysis) {
      analyzedStep4.current = true;
      handleAnalyze();
    }
    if (step !== 5) analyzedStep4.current = false;
  }, [step, handleAnalyze, busy, analysis]);

  const autoSkipRef = useRef(false);
  useEffect(() => {
    if (step === 6 && plan && analysis && !autoSkipRef.current) {
      autoSkipRef.current = true;
      const fullyCompatible =
        plan.toCreate.length === 0 &&
        plan.toUpdate.length === 0 &&
        analysis.isComplete &&
        (analysis.dependencyStatus || 'complete') === 'complete';
      if (fullyCompatible) {
        setInstallSkipped(true);
        setCompletedSteps((prev) => new Set([...prev, 5, 6, 7, 8]));
        setStep(9);
      }
    }
    if (step !== 6) autoSkipRef.current = false;
  }, [step, plan, analysis]);

  const handleGenerateSql = useCallback(async () => {
    if (!dbInstance || !plan) return;
    setGenerating(true);
    setGenStepStatus(genStatus.RUNNING);
    setVerifyStatus(null);
    try {
      const validator = new DatabaseValidator(dbInstance);
      const report = await validator.validateAll(schema);
      storeReport(report);
      const generator = new SqlGenerator(schema);
      const sql = report.missing.length > 0 || (report.issues && report.issues.length > 0)
        ? generator.generate({ missing: report.missing, issues: report.issues })
        : generator.generateFullSchema();
      setSqlText(sql);
      setGenStepStatus(genStatus.COMPLETED);
      notify('SQL generated successfully');
    } catch (err) {
      setGenStepStatus(genStatus.FAILED);
      setErrors((e) => ({ ...e, generate: err.message }));
      notify(err.message || 'SQL generation failed', 'error');
    } finally { setGenerating(false); }
  }, [dbInstance, schema, plan, storeReport]);

  const handleCopySql = () => {
    navigator.clipboard?.writeText(sqlText);
    notify('Copied to clipboard');
  };
  const handleDownloadSql = () => {
    const blob = new Blob([sqlText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'schema.sql'; a.click();
    URL.revokeObjectURL(url);
    notify('Downloaded schema.sql');
  };

  const handleExecuteSql = useCallback(async () => {
    if (!dbInstance || !sqlText) return;
    setExecuting(true);
    setGenStepStatus(genStatus.RUNNING);
    setVerifyStatus(null);
    try {
      const validator = new DatabaseValidator(dbInstance);
      const report = await validator.validateAll(schema);
      storeReport(report);
      if (report.valid) {
        setGenStepStatus(genStatus.COMPLETED);
        setVerifyStatus({ ok: true, message: 'All objects verified in the database.' });
        notify('Verification passed — all objects found');
      } else {
        setGenStepStatus(genStatus.FAILED);
        const parts = [];
        if (report.missing.length) parts.push(`${report.missing.length} missing`);
        if (report.issues?.length) parts.push(`${report.issues.length} failed`);
        setVerifyStatus({ ok: false, message: `${parts.join(', ')}.`, missing: report.missing, issues: report.issues, failed: report.issues?.length || 0 });
        setTimeout(() => setShowVerifyModal({ missing: report.missing, issues: report.issues, failed: report.issues?.length || 0 }), 300);
      }
    } catch (err) {
      setGenStepStatus(genStatus.FAILED);
      const msg = err.message || '';
      setShowErrorModal({
        title: 'Verification Failed',
        message: msg,
        details: msg,
        suggestion: 'Copy the generated SQL and run it in your Supabase SQL Editor, then verify again.',
        onRegenerate: () => handleGenerateSql(),
        onBackToPlan: () => goTo(6),
      });
      setVerifyStatus({ ok: false, message: msg });
      notify('Verification failed', 'error');
    } finally { setExecuting(false); }
  }, [dbInstance, sqlText, schema, storeReport]);

  const handleVerifyInstall = useCallback(async () => {
    if (!dbInstance) return;
    setBusy(true);
    setConflictError(null);
    try {
      const validator = new DatabaseValidator(dbInstance);
      const report = await validator.validateAll(schema);
      storeReport(report);
      if (plan && plan.toCreate.length === 0 && report.missing.length > 0) {
        setBusy(false);
        setConflictError('Internal validation conflict: Installation Plan reported 0 objects to create, but Verify Installation found missing objects. Please return to Schema Analysis.');
        return;
      }
      setValidationResult(report.valid ? { valid: true, report } : { valid: false, report, missing: report.missing.length });
    } catch (err) {
      setValidationResult({ valid: false, error: err.message });
    } finally { setBusy(false); }
  }, [dbInstance, schema, storeReport, plan]);

  const filteredSql = sqlText
    ? sqlText.split('\n').filter((l) => !sqlSearch || l.toLowerCase().includes(sqlSearch.toLowerCase())).join('\n')
    : '';

  const lineCount = sqlText ? sqlText.split('\n').length : 0;

  const provider = getProvider(selectedProvider);
  const canContinue = !!validationSuccess;
  const progress = ((step + 1) / STEPS.length) * 100;

  const genSteps = [
    { key: 'scan', label: 'Scan Database', status: genStepStatus === genStatus.RUNNING ? genStatus.RUNNING : sqlText ? genStatus.COMPLETED : genStepStatus },
    { key: 'generate', label: 'Generate SQL', status: sqlText ? genStatus.COMPLETED : genStepStatus === genStatus.RUNNING ? genStatus.RUNNING : genStatus.PENDING },
    { key: 'execute', label: 'Execute SQL', status: verifyStatus?.ok ? genStatus.COMPLETED : executing ? genStatus.RUNNING : verifyStatus ? genStatus.FAILED : genStatus.PENDING },
    { key: 'verify', label: 'Verify Objects', status: verifyStatus?.ok ? genStatus.COMPLETED : verifyStatus ? genStatus.FAILED : genStatus.PENDING },
  ];

  return (
    <div className="setup-wizard">
      {/* Header Bar */}
      <div className="setup-wizard-header">
        <div className="setup-wizard-header-brand">
          <div className="setup-wizard-header-logo">C</div>
          <div>
            <div className="setup-wizard-header-title">CoreX Setup</div>
            <div className="setup-wizard-header-sub">Database Configuration</div>
          </div>
        </div>
        <div className="setup-wizard-header-actions">
          <ThemeToggle className="setup-wizard-theme-toggle" />
        </div>
      </div>

      {/* Horizontal Stepper */}
      <div className="setup-wizard-stepper">
        {STEPS.map((s, i) => {
          const isCompleted = completedSteps.has(i);
          const isActive = i === step;
          const isLocked = i > maxAccessible + 1;
          return (
            <div className="setup-wizard-step" key={s.id}>
              <button
                className={`setup-wizard-step-button ${isActive ? 'setup-wizard-step--active' : ''} ${isCompleted ? 'setup-wizard-step--completed' : ''}`}
                onClick={() => goTo(i)}
                disabled={isLocked}
                type="button"
              >
                <span className="setup-wizard-step-circle">
                  {isCompleted ? <Icon name="check" size={11} /> : i + 1}
                </span>
                <span className="setup-wizard-step-label">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`setup-wizard-step-connector ${isCompleted || (completedSteps.has(i + 1)) ? 'setup-wizard-step-connector--completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div className="setup-wizard-body">
        <div className="setup-wizard-body-inner">

          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="setup-wizard-panel">
              <h1>Welcome to CoreX Setup</h1>
              <p>This wizard will help you initialize and configure your database.</p>
              <div className="setup-wizard-features">
                <div className="setup-feature">
                  <span className="setup-feature-icon"><Icon name="database" size={18} /></span>
                  <span>Database Configuration</span>
                </div>
                <div className="setup-feature">
                  <span className="setup-feature-icon"><Icon name="scan" size={18} /></span>
                  <span>Schema Analysis</span>
                </div>
                <div className="setup-feature">
                  <span className="setup-feature-icon"><Icon name="bolt" size={18} /></span>
                  <span>SQL Generation</span>
                </div>
                <div className="setup-feature">
                  <span className="setup-feature-icon"><Icon name="shield" size={18} /></span>
                  <span>Verification</span>
                </div>
              </div>
              <div className="setup-wizard-actions"><Button variant="primary" onClick={goNext}>Get Started</Button></div>
            </div>
          )}

          {/* Step 1 — Driver */}
          {step === 1 && (
            <div className="setup-wizard-panel">
              <h1>Database Driver</h1>
              <p>Select your database provider to get started.</p>
              <div className="setup-provider-section">
                <h2 className="setup-section-title">Select Database Provider</h2>
                <div className="setup-provider-grid">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      className={`setup-provider-card ${selectedProvider === p.id ? 'selected' : ''}`}
                      onClick={() => selectProvider(p.id)}
                      type="button"
                    >
                      <div className="setup-provider-card-header">
                        <div className="setup-provider-card-logo" style={{ backgroundColor: p.color }}>
                          {p.logo}
                        </div>
                        <div className="setup-provider-card-body">
                          <div className="setup-provider-card-name">{p.name}</div>
                          <div className="setup-provider-card-desc">{p.description}</div>
                        </div>
                      </div>
                      <div className="setup-provider-card-footer">
                        {validationSuccess && selectedProvider === p.id ? (
                          <span className="provider-status-validated"><Icon name="check-circle" size={12} /> Validated</span>
                        ) : (
                          <span className="provider-status-not-configured">Not Configured</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="setup-wizard-actions">
                <Button variant="secondary" onClick={goPrev}>Back</Button>
                <Button variant="primary" onClick={() => { if (selectedProvider) goNext(); }} disabled={!selectedProvider}>Next</Button>
              </div>
            </div>
          )}

          {/* Step 2 — Connection */}
          {step === 2 && (
            <div className="setup-wizard-panel">
              <h1>Connection Details</h1>
              <p>Configure the connection for your selected provider.</p>
              {provider && (
                <div className="setup-provider-config-section">
                  <h2 className="setup-section-title">{provider.name} Configuration</h2>
                  <div className="setup-provider-config-card">
                    <div className="setup-provider-config-header">
                      <div className="setup-provider-config-logo" style={{ backgroundColor: provider.color }}>{provider.logo}</div>
                      <span className="setup-provider-config-name">{provider.name}</span>
                    </div>
                    <div className="setup-provider-config-fields">
                      {provider.fields.map((field) => (
                        <div key={field.key} className="setup-provider-field">
                          <label className="setup-field-label">{field.label}</label>
                          <div className={`setup-field-input-wrapper ${fieldErrors[field.key] ? 'has-error' : ''}`}>
                            {field.type === 'password' ? (
                              <>
                                <input
                                  type={visibleFields[field.key] ? 'text' : 'password'}
                                  value={fieldValues[field.key] || ''}
                                  onChange={(e) => setField(field.key, e.target.value)}
                                  placeholder={field.placeholder}
                                  autoComplete="off"
                                />
                                <button type="button" className="setup-field-visibility-toggle" onClick={() => toggleFieldVisibility(field.key)}
                                  aria-label={visibleFields[field.key] ? 'Hide' : 'Show'} tabIndex={-1}>
                                  <Icon name={visibleFields[field.key] ? 'eye-off' : 'eye'} size={14} />
                                </button>
                                <button type="button" className="setup-field-copy-btn" onClick={() => copyField(fieldValues[field.key])}
                                  aria-label="Copy to clipboard" tabIndex={-1}>
                                  <Icon name="copy" size={12} />
                                </button>
                              </>
                            ) : (
                              <input type={field.type || 'text'} value={fieldValues[field.key] || ''}
                                onChange={(e) => setField(field.key, e.target.value)} placeholder={field.placeholder} autoComplete="off" />
                            )}
                          </div>
                          {field.description && <p className="setup-field-desc">{field.description}</p>}
                          {fieldErrors[field.key] && <p className="setup-field-error">{fieldErrors[field.key]}</p>}
                        </div>
                      ))}
                    </div>
                    {summaryError && (
                      <div className="setup-validation-summary-error">
                        <Icon name="alert-circle" size={16} />
                        <span>{summaryError}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="setup-wizard-actions">
                <Button variant="secondary" onClick={goPrev}>Back</Button>
                <Button variant="primary" onClick={goNext} disabled={!selectedProvider}>Next</Button>
              </div>
            </div>
          )}

          {/* Step 3 — Verify */}
          {step === 3 && (
            <div className="setup-wizard-panel">
              <h1>Verify Connection</h1>
              <p>Your database connection will now be tested.</p>
              {validating && (
                <div className="setup-loading-overlay">
                  <div className="setup-loading-spinner" />
                  <h2>Validating Connection...</h2>
                  <div className="setup-loading-stages">
                    {validateStages.map((label, i) => (
                      <div key={i} className={`setup-loading-stage ${i < validatingStage ? 'done' : i === validatingStage ? 'active' : ''}`}>
                        <span className="setup-loading-stage-icon">
                          {i < validatingStage ? <Icon name="check-circle" size={16} /> :
                            i === validatingStage ? <Icon name="loader" size={16} /> :
                              <Icon name="circle" size={16} />}
                        </span>
                        <span className="setup-loading-stage-label">{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="setup-loading-progress">
                    <div className="setup-loading-progress-fill" style={{ width: `${(validatingStage / validateStages.length) * 100}%` }} />
                  </div>
                </div>
              )}
              {!validating && !validationSuccess && summaryError && (
                <div className="setup-validation-summary-error" style={{ marginTop: 16 }}>
                  <Icon name="alert-circle" size={16} />
                  <span>{summaryError}</span>
                </div>
              )}
              {!validating && !validationSuccess && summaryError && (
                <div className="setup-wizard-actions" style={{ marginTop: 24 }}>
                  <Button variant="secondary" onClick={goPrev}>Back</Button>
                  <Button variant="primary" onClick={handleValidate} loading={validating} icon="shield">Retry Verification</Button>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Verified */}
          {step === 4 && (
            <div className="setup-wizard-panel">
              <div className="setup-connection-result">
                <div className="setup-success-icon-container">
                  <svg className="setup-success-checkmark" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
                    <circle className="setup-success-circle" cx="26" cy="26" r="25" fill="none" />
                    <path className="setup-success-check" d="M14 27l7 7 16-16" fill="none" />
                  </svg>
                </div>
                <h1>Connection Verified</h1>
                <p>{provider?.name || selectedProvider} connection established. Credentials validated successfully.</p>
                <div className="setup-complete-info">
                  <div className="complete-row"><span>Connected Database</span><span>{validationSuccess?.projectInfo?.url || provider?.name || 'Connected'}</span></div>
                  <div className="complete-row"><span>Database Provider</span><span>{provider?.name || selectedProvider}</span></div>
                  <div className="complete-row"><span>Database Version</span><span>{validationSuccess?.projectInfo?.version || 'Detected on schema analysis'}</span></div>
                  <div className="complete-row"><span>Connection Status</span><span className="status-ok">Connected</span></div>
                </div>
              </div>
              <div className="setup-wizard-actions">
                <Button variant="primary" onClick={goNext}>Next</Button>
              </div>
            </div>
          )}

          {/* Step 5 — Analysis */}
          {step === 5 && (
            <div className="setup-wizard-panel">
              <h1>Schema Analysis</h1>
              <p>Analyzing database structure against required schema.</p>
              {busy && (
                <div className="setup-analyzing">
                  <div className="setup-analyzing-spinner" />
                  <span>Validating database schema...</span>
                </div>
              )}
              {analysis && (
                <div className="setup-analysis-results">
                  <div className="setup-summary-cards">
                    <div className="setup-summary-card card-present">
                      <span className="summary-card-value">{analysis.totalPresent}</span>
                      <span className="summary-card-label">Objects Present</span>
                    </div>
                    <div className="setup-summary-card card-missing">
                      <span className="summary-card-value">{analysis.totalMissing}</span>
                      <span className="summary-card-label">Objects Missing</span>
                    </div>
                    {analysis.totalIssues > 0 && (
                      <div className="setup-summary-card card-issues">
                        <span className="summary-card-value">{analysis.totalIssues}</span>
                        <span className="summary-card-label">Issues Found</span>
                      </div>
                    )}
                    <div className={`setup-summary-card card-overall ${analysis.isComplete ? 'complete' : analysis.totalMissing > 0 ? 'incomplete' : 'card-issues'}`}>
                      <span className={`summary-card-value ${analysis.isComplete ? 'text-success' : analysis.totalMissing > 0 ? 'text-danger' : 'text-warning'}`}>
                        {analysis.isComplete ? 'Complete' : analysis.totalMissing > 0 ? 'Incomplete' : 'Issues'}
                      </span>
                      <span className="summary-card-label">Overall</span>
                    </div>
                    <div className={`setup-summary-card ${analysis.dependencyStatus === 'complete' ? 'complete' : analysis.dependencyStatus === 'missing' ? 'incomplete' : 'card-issues'}`}>
                      <span className={`summary-card-value ${analysis.dependencyStatus === 'complete' ? 'text-success' : analysis.dependencyStatus === 'missing' ? 'text-danger' : 'text-warning'}`}>
                        {analysis.dependencyStatus === 'complete' ? 'Resolved' : analysis.dependencyStatus === 'missing' ? 'Missing' : 'Issues'}
                      </span>
                      <span className="summary-card-label">Dependencies</span>
                    </div>
                  </div>
                  {Object.entries(analysis.categories).map(([key, cat]) => {
                    const badgeClass = cat.status === 'complete' ? 'badge-complete' :
                      cat.status === 'missing' ? 'badge-missing' :
                        cat.status === 'issues' ? 'badge-issues' :
                          cat.status === 'validating' ? 'badge-validating' : 'badge-pending';
                    const badgeLabel = cat.status === 'complete' ? 'Complete' :
                      cat.status === 'missing' ? 'Missing' :
                        cat.status === 'issues' ? 'Issues' :
                          cat.status === 'validating' ? 'Validating' : 'Pending';
                    const showBlink = cat.status !== 'complete';
                    return (
                      <details key={key} className="setup-analysis-category" open={cat.status !== 'complete'}>
                        <summary>
                          <span className={`setup-category-badge ${badgeClass}`}>
                            <span className={`badge-dot ${showBlink ? 'blink' : ''}`} />
                            {badgeLabel}
                          </span>
                          {cat.label}
                        </summary>
                        <div className="setup-category-items">
                          {cat.items.map((item, i) => {
                            const itemIcon = item.status === 'present' ? 'check' : item.status === 'missing' ? 'x' : 'alert';
                            return (
                              <div key={i} className={`setup-category-item item-${item.status}`}>
                                <Icon name={itemIcon} size={14} />
                                <span>{item.column || item.name || item.table || item.constraint || item.index || item.detail || '—'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
              {!analysis && !busy && <Button variant="primary" onClick={handleAnalyze} icon="scan">Analyze Database</Button>}
              <div className="setup-wizard-actions">
                <Button variant="secondary" onClick={goPrev}>Back</Button>
                {analysis && <Button variant="primary" onClick={goNext}>Next</Button>}
                {analysis && <Button variant="secondary" onClick={handleAnalyze} loading={busy}>Re-analyze</Button>}
              </div>
            </div>
          )}

          {/* Step 6 — Plan */}
          {step === 6 && plan && (
            <div className="setup-wizard-panel setup-plan-page">
              <h1>Installation Plan</h1>
              <p>Review the objects that will be created, updated, or skipped.</p>
              <div className="setup-plan-scroll">
                <div className="setup-plan-stats-grid">
                  <div className="plan-stat-card"><span className="plan-stat-value">{plan.existing.length}</span><span className="plan-stat-label">Existing</span></div>
                  <div className="plan-stat-card accent-create"><span className="plan-stat-value">{plan.toCreate.length}</span><span className="plan-stat-label">To Create</span></div>
                  <div className="plan-stat-card accent-update"><span className="plan-stat-value">{plan.toUpdate.length}</span><span className="plan-stat-label">To Update</span></div>
                  <div className="plan-stat-card accent-skip"><span className="plan-stat-value">{plan.toSkip.length}</span><span className="plan-stat-label">To Skip</span></div>
                </div>
                {(() => {
                  const groups = {};
                  for (const item of plan.toCreate) {
                    const type = item.type === 'table' ? 'Tables' :
                      item.column ? 'Columns' :
                        item.constraint ? 'Constraints' :
                          item.index ? 'Indexes' :
                            item.type === 'extension' ? 'Extensions' :
                              item.type === 'function' ? 'Functions' :
                                item.type === 'trigger' ? 'Triggers' :
                                  item.type === 'policy' || item.type === 'rls' ? 'Policies' :
                                    item.type === 'version' ? 'Schema Version' :
                                      item.type === 'seed' ? 'Seed Data' : 'Other';
                    if (!groups[type]) groups[type] = [];
                    const label = item.column ? `${item.table}.${item.column}` :
                      item.name || item.table || item.constraint || item.index || item.detail || item.type;
                    if (label && label !== '—') groups[type].push(label);
                  }
                  return Object.entries(groups).filter(([, items]) => items.length > 0).map(([type, items]) => (
                    <details key={type} className="setup-plan-group" open>
                      <summary><span className="plan-group-title">{type}</span><span className="plan-group-count">{items.length}</span></summary>
                      <ul className="plan-group-list">
                        {items.map((label, i) => <li key={i}>{label}</li>)}
                      </ul>
                    </details>
                  ));
                })()}
              </div>
              <div className="setup-wizard-actions">
                <Button variant="secondary" onClick={goPrev}>Back</Button>
                <Button variant="primary" onClick={goNext}>Next</Button>
              </div>
            </div>
          )}

          {/* Step 7 — Execute */}
          {step === 7 && (
            <div className="setup-wizard-panel">
              <h1>Generate & Execute SQL</h1>
              <p>Generate SQL from the canonical schema, preview it, and execute against the connected database.</p>

              <div className="setup-gen-steps">
                {genSteps.map((gs) => {
                  const statusIcon = gs.status === 'completed' ? 'check-circle' :
                    gs.status === 'running' ? 'loader' :
                      gs.status === 'failed' ? 'alert-circle' : 'circle';
                  return (
                    <div key={gs.key} className={`setup-gen-step setup-gen-step--${gs.status}`}>
                      <span className="setup-gen-step-icon">
                        <Icon name={statusIcon} size={16} />
                      </span>
                      <span className="setup-gen-step-label">{gs.label}</span>
                      <span className={`setup-gen-step-badge badge-${gs.status}`}>{gs.status}</span>
                    </div>
                  );
                })}
              </div>

              <div className="setup-sql-toolbar">
                <Button variant="primary" onClick={handleGenerateSql} loading={generating} icon="refresh-cw">
                  {sqlText ? 'Regenerate SQL' : 'Generate SQL'}
                </Button>
                {sqlText && (
                  <>
                    <Button variant="secondary" onClick={handleCopySql} icon="copy">Copy</Button>
                    <Button variant="secondary" onClick={handleDownloadSql} icon="download">Download</Button>
                    <Button variant="secondary" onClick={() => setSqlFullscreen(!sqlFullscreen)}
                      icon={sqlFullscreen ? 'minimize' : 'maximize'}>
                      {sqlFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </Button>
                  </>
                )}
              </div>

              {sqlText && (
                <div className={`setup-sql-preview ${sqlFullscreen ? 'setup-sql-preview--fullscreen' : ''}`}>
                  <div className="setup-sql-preview-header">
                    {sqlFullscreen && (
                      <button type="button" className="setup-sql-preview-close" onClick={() => setSqlFullscreen(false)} aria-label="Close fullscreen">
                        <Icon name="x" size={18} />
                      </button>
                    )}
                    <span className="setup-sql-preview-count">{lineCount} lines</span>
                    <div className="setup-sql-preview-search">
                      <Icon name="search" size={14} />
                      <input type="text" placeholder="Search SQL..." value={sqlSearch}
                        onChange={(e) => setSqlSearch(e.target.value)} />
                    </div>
                  </div>
                  <div className="setup-sql-preview-body">
                    <div className="setup-sql-line-numbers">
                      {sqlText.split('\n').map((_, i) => (
                        <span key={i} className="setup-sql-line-num">{i + 1}</span>
                      ))}
                    </div>
                    <pre className="setup-sql-output"><code dangerouslySetInnerHTML={{ __html: highlightSql(filteredSql) }} /></pre>
                  </div>
                </div>
              )}

              {sqlText && (
                <div className="setup-sql-execute">
                  <Button variant="primary" onClick={handleExecuteSql} loading={executing} icon="bolt">
                    Already Executed in Database & Verify
                  </Button>
                  {verifyStatus && verifyStatus.ok && (
                    <div className="setup-connection-status success">
                      <Icon name="check-circle" size={16} />
                      <span>{verifyStatus.message}</span>
                    </div>
                  )}
                  {verifyStatus && !verifyStatus.ok && (
                    <div className="setup-connection-status error">
                      <Icon name="alert-circle" size={16} />
                      <span>{verifyStatus.message}</span>
                      {verifyStatus.missing && verifyStatus.missing.length > 0 && (
                        <Button variant="secondary" size="small" onClick={() => setShowVerifyModal(verifyStatus)} style={{ marginTop: 8 }}>
                          View Missing Objects
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="setup-wizard-actions">
                <Button variant="secondary" onClick={goPrev}>Back</Button>
                {verifyStatus?.ok && <Button variant="primary" onClick={goNext}>Next</Button>}
              </div>
            </div>
          )}

          {/* Step 8 — Re-check */}
          {step === 8 && (
            <div className="setup-wizard-panel">
              <h1>Verify Installation</h1>
              <p>Re-validate the entire database schema against the canonical manifest.</p>
              {conflictError && (
                <div className="setup-validation-summary-error" style={{ marginBottom: 16 }}>
                  <Icon name="alert-circle" size={16} />
                  <span>{conflictError}</span>
                </div>
              )}
              {!validationResult && !conflictError && <Button variant="primary" onClick={handleVerifyInstall} loading={busy}>Verify Installation</Button>}
              {validationResult && (
                <div className={`setup-verify-result ${validationResult.valid ? 'success' : 'error'}`}>
                  <Icon name={validationResult.valid ? 'check-circle' : 'x-circle'} size={32} />
                  <h3>{validationResult.valid ? 'All checks passed' : `${validationResult.missing} objects still missing`}</h3>
                  {validationResult.error && <p>{validationResult.error}</p>}
                </div>
              )}
              <div className="setup-wizard-actions">
                <Button variant="secondary" onClick={goPrev}>Back</Button>
                {validationResult?.valid && <Button variant="primary" onClick={goNext}>Next</Button>}
                {validationResult && !validationResult.valid && (
                  <Button variant="primary" onClick={() => goTo(5)}>Return to Analysis</Button>
                )}
              </div>
            </div>
          )}

          {/* Step 9 — Done */}
          {step === 9 && (
            <div className="setup-wizard-panel">
              <div className="setup-complete">
                <div className="setup-complete-icon">
                  <Icon name="check-circle" size={64} />
                </div>
                <h1>Installation Successful</h1>
                {(initialStep === 9 || installSkipped) ? (
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>The database is fully compatible. No installation was required.</p>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Database has been configured and verified successfully.</p>
                )}
                <div className="setup-complete-info">
                  <div className="complete-row"><span>Database Driver</span><span>{selectedProvider || (dbInstance?.isSupabase ? 'Supabase' : dbInstance?.provider?.constructor?.name) || (dbInstance ? 'Connected' : 'Not selected')}</span></div>
                  <div className="complete-row"><span>Connected Database</span><span>{dbInstance?._databaseName || (dbInstance?.isSupabase ? 'Supabase' : 'Default')}</span></div>
                  <div className="complete-row"><span>Schema Version</span><span>{schema.version || 1}</span></div>
                  <div className="complete-row"><span>Migration Version</span><span>{validationReport?.details?.version?.current ?? (schema.version || 1)}</span></div>
                  <div className="complete-row"><span>Installation Date</span><span>{new Date().toLocaleString()}</span></div>
                  <div className="complete-row"><span>Database Status</span><span className="status-ok">Connected</span></div>
                  <div className="complete-row"><span>Compatibility</span><span className="status-ok">Fully Compatible</span></div>
                </div>
                <Button
                  variant="primary"
                  loading={completing}
                  disabled={completing}
                  onClick={async () => {
                    if (completingRef.current) return;
                    completingRef.current = true;
                    setCompleting(true);
                    try {
                      await onComplete(dbInstance);
                    } finally {
                      completingRef.current = false;
                      setCompleting(false);
                    }
                  }}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="setup-modal-overlay" onClick={() => setShowErrorModal(null)}>
          <div className="setup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="setup-modal-header">
              <Icon name="alert-circle" size={24} />
              <h2>{showErrorModal.title || 'Error'}</h2>
            </div>
            <div className="setup-modal-body">
              <p>{showErrorModal.message}</p>
              {showErrorModal.details && (
                <details className="setup-modal-details">
                  <summary>Technical Details</summary>
                  <pre>{showErrorModal.details}</pre>
                </details>
              )}
              {showErrorModal.suggestion && (
                <div className="setup-modal-suggestion">
                  <Icon name="info" size={14} />
                  <span>{showErrorModal.suggestion}</span>
                </div>
              )}
            </div>
            <div className="setup-modal-actions">
              <Button variant="secondary" onClick={() => setShowErrorModal(null)}>Close</Button>
              {showErrorModal.onRegenerate && (
                <Button variant="primary" onClick={() => { setShowErrorModal(null); showErrorModal.onRegenerate(); }}>Regenerate SQL</Button>
              )}
              {showErrorModal.onBackToPlan && (
                <Button variant="secondary" onClick={() => { setShowErrorModal(null); showErrorModal.onBackToPlan(); }}>Return to Plan</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verify Failure Modal */}
      {showVerifyModal && (
        <div className="setup-modal-overlay" onClick={() => setShowVerifyModal(null)}>
          <div className="setup-modal setup-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="setup-modal-header error">
              <Icon name="x-circle" size={24} />
              <h2>Database Verification Failed</h2>
            </div>
            <div className="setup-modal-body">
              <div className="verify-modal-summary">
                <div className="verify-modal-stat"><span className="stat-label">Missing Objects</span><span className="stat-value error">{showVerifyModal.missing?.length || 0}</span></div>
                <div className="verify-modal-stat"><span className="stat-label">Failed Objects</span><span className="stat-value error">{showVerifyModal.failed || 0}</span></div>
              </div>
              {(() => {
                const items = showVerifyModal.missing || [];
                const groups = {};
                for (const item of items) {
                  const type = item.type === 'table' || item.name ? 'Tables' :
                    item.column ? 'Columns' :
                      item.constraint ? 'Constraints' :
                        item.index ? 'Indexes' :
                          item.type === 'function' ? 'Functions' :
                            item.type === 'trigger' ? 'Triggers' :
                              item.type === 'policy' || item.type === 'rls' ? 'Policies' :
                                item.type === 'extension' ? 'Extensions' :
                                  item.type === 'version' ? 'Schema Version' : 'Other';
                  if (!groups[type]) groups[type] = [];
                  const label = item.column ? `${item.table}.${item.column}` :
                    item.name || item.table || item.constraint || item.index || item.detail || item.type;
                  if (label && label !== '—') groups[type].push({ label, item });
                }
                const missingEls = Object.entries(groups).map(([type, list]) => (
                  <details key={type} className="verify-group" open>
                    <summary><span className="verify-group-title">Missing {type}</span><span className="verify-group-count">{list.length}</span></summary>
                    <ul className="verify-group-list">
                      {list.map((entry, i) => (
                        <li key={i}>
                          <span className="verify-item-name">{entry.label}</span>
                          <span className="verify-item-status">{entry.item.status || 'missing'}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ));
                const issues = showVerifyModal.issues || [];
                const issueEls = issues.length > 0 ? (
                  <details className="verify-group" open>
                    <summary><span className="verify-group-title">Failed Checks</span><span className="verify-group-count">{issues.length}</span></summary>
                    <ul className="verify-group-list">
                      {issues.map((issue, i) => (
                        <li key={i}>
                          <span className="verify-item-name">{issue.detail || issue.type || 'Unknown'}</span>
                          <span className="verify-item-status failed">failed</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null;
                return [...missingEls, ...(issueEls ? [issueEls] : [])];
              })()}
            </div>
            <div className="setup-modal-actions">
              <Button variant="secondary" onClick={() => setShowVerifyModal(null)}>Close</Button>
              <Button variant="secondary" onClick={() => { setShowVerifyModal(null); handleCopySql(); }}>View SQL</Button>
              <Button variant="primary" onClick={() => { setShowVerifyModal(null); handleGenerateSql(); }}>Regenerate SQL</Button>
              <Button variant="primary" onClick={() => { setShowVerifyModal(null); handleExecuteSql(); }}>Re-run Verification</Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`setup-toast setup-toast--${toast.type}`}>
          <Icon name={toast.type === 'error' ? 'alert-circle' : 'check-circle'} size={16} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
