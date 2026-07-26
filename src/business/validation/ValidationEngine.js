export class ValidationRule {
  constructor(name, validator, message) {
    this.name = name;
    this.validator = validator;
    this.message = message;
  }

  validate(value, context = {}) {
    const result = this.validator(value, context);
    if (typeof result === 'boolean') {
      return result ? null : this.message;
    }
    return result;
  }
}

export class ValidationEngine {
  constructor() {
    this.rules = new Map();
    this.schemas = new Map();
  }

  addRule(name, validator, message) {
    this.rules.set(name, new ValidationRule(name, validator, message));
  }

  defineSchema(name, fields) {
    this.schemas.set(name, fields);
  }

  validate(data, schemaName) {
    const fields = this.schemas.get(schemaName);
    if (!fields) throw new Error(`Schema not found: ${schemaName}`);

    const errors = {};

    for (const [field, rules] of Object.entries(fields)) {
      const fieldErrors = [];
      const value = data[field];

      for (const ruleConfig of rules) {
        const ruleName = typeof ruleConfig === 'string' ? ruleConfig : ruleConfig.rule;
        const rule = this.rules.get(ruleName);
        if (!rule) continue;

        const message = ruleConfig.message || rule.message;
        const error = rule.validate(value, { ...data, field });
        if (error) {
          fieldErrors.push(typeof message === 'function' ? message(value) : message);
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

export const validationEngine = new ValidationEngine();

validationEngine.addRule('required', (v) => v !== undefined && v !== null && v !== '', 'This field is required');
validationEngine.addRule('email', (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Invalid email address');
validationEngine.addRule('minLength', (v, ctx) => !v || v.length >= (ctx.min || 0), (v, ctx) => `Minimum ${ctx.min} characters`);
validationEngine.addRule('maxLength', (v, ctx) => !v || v.length <= (ctx.max || Infinity), (v, ctx) => `Maximum ${ctx.max} characters`);
validationEngine.addRule('number', (v) => v === undefined || v === null || !isNaN(Number(v)), 'Must be a number');
validationEngine.addRule('url', (v) => !v || /^https?:\/\/.+/.test(v), 'Invalid URL');
validationEngine.addRule('phone', (v) => !v || /^[\d\s\-+()]{7,}$/.test(v), 'Invalid phone number');
