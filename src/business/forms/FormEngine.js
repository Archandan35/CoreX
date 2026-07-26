export class FormEngine {
  constructor(fields) {
    this.fields = fields;
  }

  validate(data) {
    const errors = {};
    for (const field of this.fields) {
      const value = data[field.name];
      const fieldErrors = [];

      for (const rule of field.rules || []) {
        const error = rule(value, data);
        if (error) fieldErrors.push(error);
      }

      if (fieldErrors.length > 0) errors[field.name] = fieldErrors;
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  serialize(data) {
    const result = {};
    for (const field of this.fields) {
      const value = data[field.name];
      result[field.name] = field.transform ? field.transform(value) : value;
    }
    return result;
  }

  deserialize(data) {
    const result = {};
    for (const field of this.fields) {
      const value = data[field.name];
      result[field.name] = field.reverse ? field.reverse(value) : value;
    }
    return result;
  }
}
