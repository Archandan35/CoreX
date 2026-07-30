import { validationEngine } from './ValidationEngine.js';

validationEngine.defineSchema('settings', {
  siteTitle: [{ rule: 'maxLength', max: 100 }],
  tagline: [{ rule: 'maxLength', max: 200 }],
  siteUrl: ['url'],
  appUrl: ['url'],
  supportEmail: ['email'],
  contactNumber: ['phone'],
});

export function validateSettings(data) {
  const result = validationEngine.validate(data, 'settings');
  return result;
}