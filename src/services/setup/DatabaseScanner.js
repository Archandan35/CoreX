export default class DatabaseScanner {
  /**
   * Scans the database schema by calling the server-side API endpoint.
   * In production (Cloudflare Pages), the API is at /api/setup/scan.
   * In local dev, the Vite proxy forwards to the backend.
   */
  async scan(config) {
    const response = await fetch('/api/setup/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Scan request failed with status ${response.status}`);
    }

    return await response.json();
  }
}
