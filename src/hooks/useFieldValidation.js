import { useState, useCallback, useRef } from 'react';

const VALIDATORS = {
  required: (v) => (v === undefined || v === null || v === '' ? 'This field is required.' : null),
  email: (v) => (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email address.' : null),
  phone: (v) => (v && !/^[+]?[\d\s()-]{7,20}$/.test(v) ? 'Invalid phone number.' : null),
  gstin: (v) => (v && !/^[0-9A-Z]{15}$/.test(v) ? 'Invalid GSTIN (15 characters).' : null),
  number: (v) => (v !== undefined && v !== null && v !== '' && isNaN(Number(v)) ? 'Must be a number.' : null),
  positive: (v) => (Number(v) < 0 ? 'Must be a positive number.' : null),
  min: (min) => (v) => (Number(v) < min ? `Minimum value is ${min}.` : null),
  max: (max) => (v) => (Number(v) > max ? `Maximum value is ${max}.` : null),
  minLength: (min) => (v) => (v && v.length < min ? `Minimum ${min} characters.` : null),
  maxLength: (max) => (v) => (v && v.length > max ? `Maximum ${max} characters.` : null),
  pattern: (regex, msg) => (v) => (v && !regex.test(v) ? msg || 'Invalid format.' : null),
};

export default function useFieldValidation() {
  const [errors, setErrors] = useState({});
  const touched = useRef({});

  const markTouched = useCallback((field) => {
    touched.current[field] = true;
  }, []);

  const validate = useCallback((field, value, rules = {}) => {
    const fieldErrors = [];
    for (const [rule, param] of Object.entries(rules)) {
      if (rule === 'required' && param) {
        const err = VALIDATORS.required(value);
        if (err) fieldErrors.push(err);
      } else if (rule === 'email' && param) {
        const err = VALIDATORS.email(value);
        if (err) fieldErrors.push(err);
      } else if (rule === 'phone' && param) {
        const err = VALIDATORS.phone(value);
        if (err) fieldErrors.push(err);
      } else if (rule === 'gstin' && param) {
        const err = VALIDATORS.gstin(value);
        if (err) fieldErrors.push(err);
      } else if (rule === 'number' && param) {
        const err = VALIDATORS.number(value);
        if (err) fieldErrors.push(err);
      } else if (rule === 'positive' && param) {
        const err = VALIDATORS.positive(value);
        if (err) fieldErrors.push(err);
      } else if (rule === 'min') {
        const err = VALIDATORS.min(param)(value);
        if (err) fieldErrors.push(err);
      } else if (rule === 'max') {
        const err = VALIDATORS.max(param)(value);
        if (err) fieldErrors.push(err);
      } else if (rule === 'minLength') {
        const err = VALIDATORS.minLength(param)(value);
        if (err) fieldErrors.push(err);
      } else if (rule === 'maxLength') {
        const err = VALIDATORS.maxLength(param)(value);
        if (err) fieldErrors.push(err);
      } else if (rule === 'pattern') {
        const [regex, msg] = param;
        const err = VALIDATORS.pattern(regex, msg)(value);
        if (err) fieldErrors.push(err);
      }
    }
    setErrors((prev) => {
      const next = { ...prev };
      if (fieldErrors.length) next[field] = fieldErrors[0];
      else delete next[field];
      return next;
    });
    return fieldErrors.length === 0;
  }, []);

  const validateAll = useCallback((data, rulesMap) => {
    const allErrors = {};
    for (const [field, rules] of Object.entries(rulesMap)) {
      const value = data[field];
      const fieldErrors = [];
      for (const [rule, param] of Object.entries(rules)) {
        if (rule === 'required' && param) { const e = VALIDATORS.required(value); if (e) fieldErrors.push(e); }
        else if (rule === 'email' && param) { const e = VALIDATORS.email(value); if (e) fieldErrors.push(e); }
        else if (rule === 'phone' && param) { const e = VALIDATORS.phone(value); if (e) fieldErrors.push(e); }
        else if (rule === 'gstin' && param) { const e = VALIDATORS.gstin(value); if (e) fieldErrors.push(e); }
        else if (rule === 'number' && param) { const e = VALIDATORS.number(value); if (e) fieldErrors.push(e); }
        else if (rule === 'positive' && param) { const e = VALIDATORS.positive(value); if (e) fieldErrors.push(e); }
        else if (rule === 'min') { const e = VALIDATORS.min(param)(value); if (e) fieldErrors.push(e); }
        else if (rule === 'max') { const e = VALIDATORS.max(param)(value); if (e) fieldErrors.push(e); }
        else if (rule === 'minLength') { const e = VALIDATORS.minLength(param)(value); if (e) fieldErrors.push(e); }
        else if (rule === 'maxLength') { const e = VALIDATORS.maxLength(param)(value); if (e) fieldErrors.push(e); }
        else if (rule === 'pattern') { const [regex, msg] = param; const e = VALIDATORS.pattern(regex, msg)(value); if (e) fieldErrors.push(e); }
      }
      if (fieldErrors.length) allErrors[field] = fieldErrors[0];
    }
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  }, []);

  const clearErrors = useCallback(() => setErrors({}), []);
  const getError = useCallback((field) => errors[field], [errors]);
  const hasErrors = Object.keys(errors).length > 0;

  return { errors, validate, validateAll, clearErrors, getError, hasErrors, markTouched, touched };
}