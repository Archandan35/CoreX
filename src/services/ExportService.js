export class ExportService {
  toCSV(data, columns) {
    if (!data?.length) return '';
    const headers = columns.map(c => `"${c}"`).join(',');
    const rows = data.map(item =>
      columns.map(c => {
        const val = item[c] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    return [headers, ...rows].join('\n');
  }

  toJSON(data, pretty = true) {
    return JSON.stringify(data, null, pretty ? 2 : undefined);
  }

  download(content, filename, mimeType = 'text/csv') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportCSV(data, columns, filename = 'export.csv') {
    this.download(this.toCSV(data, columns), filename, 'text/csv;charset=utf-8;');
  }

  exportJSON(data, filename = 'export.json') {
    this.download(this.toJSON(data), filename, 'application/json;charset=utf-8;');
  }
}

const exportService = new ExportService();
export default exportService;
