import { describe, it, expect } from 'vitest';
import { generateId, generateToken } from '../utils/id';
import { formatDate, formatRelativeTime } from '../utils/date';

describe('utils', () => {
  describe('id generation', () => {
    it('generateId returns unique ids', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('generateToken returns crypto-strength token', () => {
      const token = generateToken();
      expect(token.length).toBeGreaterThan(32);
      expect(/^[0-9a-z]+$/.test(token)).toBe(true);
    });
  });

  describe('date formatting', () => {
    it('formatDate formats correctly', () => {
      const date = new Date('2024-06-15');
      expect(formatDate(date)).toBe('Jun 15, 2024');
    });

    it('formatDate handles null/empty', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate('')).toBe('');
    });

    it('formatRelativeTime returns relative strings', () => {
      expect(formatRelativeTime(new Date())).toBe('just now');
      const fiveMinAgo = new Date(Date.now() - 300000);
      expect(formatRelativeTime(fiveMinAgo)).toContain('m ago');
    });
  });
});
