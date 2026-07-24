export default class InstallationExecutor {
  async execute(sql, config, onProgress) {
    if (config?.driver === 'supabase') {
      return {
        success: false,
        statementsExecuted: 0,
        duration: 0,
        manualInstall: true,
        message: 'Auto-install requires a backend server. Copy the SQL script and run it in the Supabase Dashboard SQL Editor, then click "Verify Installation".',
      };
    }

    return { success: false, statementsExecuted: 0, duration: 0, error: 'Only Supabase driver is supported.' };
  }
}
