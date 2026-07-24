import { describe, it, expect } from 'vitest';
import RULES, { validateField, validateForm } from '../shared/validation';

describe('validation', () => {
  describe('rules', () => {
    it('required rejects empty values', () => {
      expect(RULES.required('')).toBe('This field is required');
      expect(RULES.required(null)).toBe('This field is required');
      expect(RULES.required(undefined)).toBe('This field is required');
      expect(RULES.required('value')).toBeNull();
    });

    it('email validates format', () => {
      expect(RULES.email('test@example.com')).toBeNull();
      expect(RULES.email('invalid')).toBe('Invalid email address');
      expect(RULES.email('')).toBeNull();
    });

    it('password enforces complexity', () => {
      const err = RULES.password('weak');
      expect(err).toContain('uppercase');
      expect(err).toContain('number');
      expect(err).toContain('special character');
      expect(err).toContain('at least 8');

      expect(RULES.password('Pass1!')).toContain('at least 8 characters');
      expect(RULES.password('Password123!')).toContain('not a common password');
      expect(RULES.password('StrongP@ss1')).toBeNull();
    });

    it('min/max length', () => {
      expect(RULES.min(3)('ab')).toBe('Minimum 3 characters required');
      expect(RULES.min(3)('abc')).toBeNull();
      expect(RULES.max(5)('abcdef')).toBe('Maximum 5 characters allowed');
    });

    it('pattern validation', () => {
      const digitOnly = RULES.pattern(/^\d+$/, 'Digits only');
      expect(digitOnly('123')).toBeNull();
      expect(digitOnly('abc')).toBe('Digits only');
    });
  });

  describe('validateField', () => {
    it('returns first error', () => {
      const err = validateField('', [RULES.required, RULES.email]);
      expect(err).toBe('This field is required');
    });

    it('returns null if all pass', () => {
      expect(validateField('test@example.com', [RULES.required, RULES.email])).toBeNull();
    });
  });

  describe('validateForm', () => {
    it('validates all fields', () => {
      const schema = {
        name: [RULES.required],
        email: [RULES.required, RULES.email],
      };
      const result = validateForm({ name: '', email: 'bad' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBe('This field is required');
      expect(result.errors.email).toBe('Invalid email address');
    });

    it('returns valid for correct data', () => {
      const schema = {
        name: [RULES.required],
        email: [RULES.required, RULES.email],
      };
      const result = validateForm({ name: 'John', email: 'john@test.com' }, schema);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });
  });
});
