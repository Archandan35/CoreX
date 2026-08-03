export class ImportEngine {
  constructor(validators = {}) {
    this.validators = validators;
  }

  async importJson(data, entity) {
    const validator = this.validators[entity];
    const results = { imported: 0, errors: [], skipped: 0 };

    for (const [index, record] of data.entries()) {
      try {
        if (validator) {
          const validation = validator(record);
          if (!validation.valid) {
            results.errors.push({ row: index + 1, errors: validation.errors });
            continue;
          }
        }
        results.imported++;
      } catch (err) {
        results.errors.push({ row: index + 1, error: err.message });
      }
    }

    return results;
  }

  async importCsv(text, entity, options = {}) {
    const lines = text.split('\n').filter(Boolean);
    if (lines.length < 2) return { imported: 0, errors: [{ row: 1, error: 'No data rows found' }], skipped: 0 };

    const headers = lines[0].split(options.delimiter || ',').map((h) => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(options.delimiter || ',').map((v) => v.trim());
      const record = {};
      headers.forEach((h, idx) => { record[h] = values[idx]; });
      records.push(record);
    }

    return this.importJson(records, entity, options);
  }
}
