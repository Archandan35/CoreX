import { describe, it, expect } from 'vitest';
import { Translator, databaseTranslator, schemaTranslator, permissionTranslator, languageTranslator, themeTranslator, backupTranslator, notificationTranslator } from '../shared/translator';

describe('translator', () => {
  it('Translator base class defines and translates', () => {
    const t = new Translator();
    t.define('greeting', 'french', () => 'Bonjour');
    expect(t.translate('greeting', 'greeting', 'french')).toBe('Bonjour');
    expect(t.translate('unknown', 'missing', 'french')).toBe('unknown');
  });

  it('databaseTranslator translates entities to schemas', () => {
    const result = databaseTranslator.translate({ resource: 'users', name: 'text' }, 'entity', 'schema');
    expect(result.table).toBe('users');
    expect(Array.isArray(result.columns)).toBe(true);
  });

  it('schemaTranslator translates user entity to table', () => {
    const result = schemaTranslator.translate('user:entity', 'user:entity', 'database:table');
    expect(result.name).toBe('users');
    expect(result.columns.some(c => c.name === 'email')).toBe(true);
  });

  it('permissionTranslator translates action to permission', () => {
    const result = permissionTranslator.translate({ resource: 'user', action: 'read' }, 'action', 'permission');
    expect(result).toBe('user.read');
  });

  it('languageTranslator translates English keys', () => {
    const result = languageTranslator.translate('en', 'en', 'app.name');
    expect(result).toBe('Universal Enterprise Application');
    expect(languageTranslator.translate('en', 'en', 'nav.dashboard')).toBe('Dashboard');
    expect(languageTranslator.translate('en', 'en', 'common.save')).toBe('Save');
  });

  it('themeTranslator translates light theme', () => {
    const result = themeTranslator.translate('light', 'light', 'css:variables');
    expect(result['--bg']).toBe('#ffffff');
    expect(result['--text']).toBe('#0f172a');
  });

  it('backupTranslator creates backup format', () => {
    const result = backupTranslator.translate({ users: [] }, 'app:state', 'backup:format');
    expect(result.format).toBe('ueaf');
    expect(result.version).toBe('1.0');
  });

  it('notificationTranslator translates toast icons', () => {
    const result = notificationTranslator.translate('success', 'success', 'toast:icon');
    expect(result).toBe('check');
    expect(notificationTranslator.translate('error', 'error', 'toast:icon')).toBe('alert');
  });

  it('all translators are Translator instances', () => {
    const translators = [databaseTranslator, schemaTranslator, permissionTranslator, languageTranslator, themeTranslator, backupTranslator, notificationTranslator];
    translators.forEach((t) => {
      expect(t).toBeInstanceOf(Translator);
    });
  });
});
