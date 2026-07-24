import { describe, it, expect } from 'vitest';
import {
  hashPassword, verifyPassword, generateSalt, generateCSRFToken, validateCSRFToken,
  sanitizeHTML, sanitizeSQL, validateEmail, validateUUID, rls, RLS, validateFile, generateCSP
} from '../shared/security';

describe('security', () => {
  describe('password hashing', () => {
    it('hashPassword produces consistent hashes', async () => {
      const hash1 = await hashPassword('TestPass123!');
      const hash2 = await hashPassword('TestPass123!');
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:/);
    });

    it('verifyPassword works', async () => {
      const hash = await hashPassword('MyP@ssw0rd');
      expect(await verifyPassword('MyP@ssw0rd', hash)).toBe(true);
      expect(await verifyPassword('wrong', hash)).toBe(false);
    });

    it('generateSalt produces unique values', () => {
      const s1 = generateSalt();
      const s2 = generateSalt();
      expect(s1).not.toBe(s2);
      expect(s1.length).toBeGreaterThan(32);
    });
  });

  describe('CSRF', () => {
    it('generateCSRFToken produces tokens', () => {
      const t1 = generateCSRFToken();
      const t2 = generateCSRFToken();
      expect(t1).not.toBe(t2);
      expect(t1.length).toBeGreaterThan(40);
    });

    it('validateCSRFToken works', () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken(token, token)).toBe(true);
      expect(validateCSRFToken('bad', token)).toBe(false);
      expect(validateCSRFToken(null, token)).toBe(false);
    });
  });

  describe('sanitization', () => {
    it('sanitizeHTML escapes dangerous chars', () => {
      expect(sanitizeHTML('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(sanitizeHTML('normal text')).toBe('normal text');
      expect(sanitizeHTML(123)).toBe(123);
    });

    it('sanitizeSQL removes dangerous chars', () => {
      const result = sanitizeSQL("' OR 1=1; --");
      expect(result).not.toContain("'");
      expect(result).not.toContain(';');
      expect(result).toContain('--');
    });
  });

  describe('validation', () => {
    it('validateEmail works', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('validateUUID works', () => {
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(validateUUID('not-a-uuid')).toBe(false);
    });
  });

  describe('RLS', () => {
    it('rls evaluates policies', () => {
      const adminUser = { permissions: ['*'] };
      const regularUser = { permissions: ['user.list'] };
      const noPermUser = { permissions: [] };

      expect(rls.canSelect('users', adminUser, {})).toBe(true);
      expect(rls.canSelect('users', regularUser, {})).toBe(true);
      expect(rls.canSelect('roles', noPermUser, {})).toBe(false);
      expect(rls.canInsert('users', regularUser, {})).toBe(false);
      expect(rls.canInsert('users', adminUser, {})).toBe(true);
    });

    it('custom RLS instance works', () => {
      const myRls = new RLS();
      myRls.definePolicy('docs', (user, op) => user.role === 'editor');
      expect(myRls.canSelect('docs', { role: 'editor' }, {})).toBe(true);
      expect(myRls.canSelect('docs', { role: 'viewer' }, {})).toBe(false);
    });
  });

  describe('file validation', () => {
    it('validateFile checks size and type', () => {
      const result = validateFile(
        { name: 'test.exe', size: 99999999, type: 'application/x-msdownload' },
        { maxSize: 10485760, allowedExtensions: ['pdf', 'doc'], allowedTypes: ['application/pdf'] }
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('validateFile passes for valid files', () => {
      const result = validateFile(
        { name: 'doc.pdf', size: 5000, type: 'application/pdf' },
        { maxSize: 10485760, allowedExtensions: ['pdf'], allowedTypes: ['application/pdf'] }
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('CSP', () => {
    it('generateCSP produces valid policy', () => {
      const csp = generateCSP();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
    });
  });
});
