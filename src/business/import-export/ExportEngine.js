export class ExportEngine {
  toJson(data) {
    return JSON.stringify(data, null, 2);
  }

  toCsv(data, options = {}) {
    if (!data || data.length === 0) return '';
    const headers = options.headers || Object.keys(data[0]);
    const delimiter = options.delimiter || ',';

    const lines = [headers.join(delimiter)];
    for (const row of data) {
      lines.push(headers.map((h) => {
        const val = row[h];
        if (val == null) return '';
        const str = String(val);
        return str.includes(delimiter) || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(delimiter));
    }

    return lines.join('\n');
  }

  toXml(data) {
    if (!data || data.length === 0) return '<root/>';
    const rows = data.map((row) => {
      const fields = Object.entries(row).map(([k, v]) => `  <${k}>${v ?? ''}</${k}>`).join('\n');
      return `<record>\n${fields}\n</record>`;
    }).join('\n');
    return `<root>\n${rows}\n</root>`;
  }

  toJsonLines(data) {
    return data.map((row) => JSON.stringify(row)).join('\n');
  }
}
