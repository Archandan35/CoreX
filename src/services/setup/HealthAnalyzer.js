export default class HealthAnalyzer {
  analyze(scanResult, verificationResult, installResult) {
    const installScore = installResult?.success ? 100 : 0;
    const verifyScore = verificationResult?.score ?? 0;
    const schemaScore = scanResult ? Math.round((scanResult.installedComponents / scanResult.totalComponents) * 100) : 0;

    const overall = Math.round((installScore * 0.4) + (verifyScore * 0.35) + (schemaScore * 0.25));
    const installation = installScore;
    const security = scanResult?.policies?.length ? 75 : 50;
    const performance = verificationResult?.totalChecks > 0 ? Math.round((1 - (verificationResult.failedChecks / verificationResult.totalChecks)) * 100) : 100;

    return {
      overall: Math.min(100, overall),
      installation,
      security: Math.min(100, security + (scanResult?.extensions?.length ? 10 : 0)),
      performance: Math.min(100, performance),
      summary: this._getSummary(overall),
    };
  }

  _getSummary(score) {
    if (score >= 90) return { label: 'Excellent', color: 'var(--success)' };
    if (score >= 70) return { label: 'Good', color: 'var(--primary)' };
    if (score >= 50) return { label: 'Fair', color: 'var(--warning)' };
    return { label: 'Poor', color: 'var(--danger)' };
  }
}
