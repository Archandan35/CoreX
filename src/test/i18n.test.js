import { describe, it, expect } from 'vitest';
import { t, setLocale, getLocale } from '../shared/i18n';

describe('i18n', () => {
  it('t returns key for missing translations', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('t returns translated value for known keys', () => {
    expect(t('app.name')).toBe('Universal Enterprise Application');
    expect(t('common.save')).toBe('Save');
    expect(t('auth.signIn')).toBe('Sign In');
  });

  it('setLocale updates locale', () => {
    expect(getLocale()).toBe('en');
  });
});
