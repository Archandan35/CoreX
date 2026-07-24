export class ImportService {
  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  async parseCSV(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const headers = this._parseCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this._parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx]; });
        rows.push(row);
      }
    }
    return rows;
  }

  _parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    result.push(current.trim());
    return result;
  }

  async parseJSON(text) {
    try { return JSON.parse(text); }
    catch { throw new Error('Invalid JSON format'); }
  }

  async importFromFile(file, format = 'auto') {
    const text = await this.readFile(file);
    const ext = file.name?.split('.').pop()?.toLowerCase();
    if (format === 'auto') format = ext === 'json' ? 'json' : 'csv';
    if (format === 'csv') return this.parseCSV(text);
    if (format === 'json') return this.parseJSON(text);
    throw new Error(`Unsupported format: ${format}`);
  }
}

const importService = new ImportService();
export default importService;
