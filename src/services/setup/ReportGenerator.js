export default class ReportGenerator {
  generate(scanResult, installResult, verificationResult, health) {
    return {
      generatedAt: new Date().toISOString(),
      schemaVersion: scanResult?.schemaVersion || 'unknown',
      provider: scanResult?.provider || 'unknown',
      components: {
        total: scanResult?.totalComponents || 0,
        installed: scanResult?.installedComponents || 0,
        missing: Object.values(scanResult?.missing || {}).reduce((a, b) => a + b.length, 0),
      },
      installation: {
        success: installResult?.success || false,
        statementsExecuted: installResult?.statementsExecuted || 0,
        duration: installResult?.duration || 0,
      },
      verification: {
        passed: verificationResult?.passed || false,
        score: verificationResult?.score || 0,
        issues: verificationResult?.issues || [],
      },
      healthScores: health || {},
      summary: health?.summary?.label || 'Unknown',
    };
  }
}
