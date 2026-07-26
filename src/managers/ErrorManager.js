import { errorReportingService } from '../services/error-reporting/ErrorReportingService.js';
import { notificationManager } from './NotificationManager.js';

class ErrorManager {
  handle(error, context = {}) {
    errorReportingService.capture(error, context);

    if (context.silent) return;

    const message = error?.message || 'An unexpected error occurred';
    notificationManager.error('Error', message);

    if (context.redirect) {
      window.location.href = '/error';
    }
  }

  async wrap(promise, context = {}) {
    try {
      return await promise;
    } catch (error) {
      this.handle(error, context);
      throw error;
    }
  }

  createBoundary(componentName) {
    return {
      componentDidCatch: (error, info) => {
        this.handle(error, { component: componentName, info });
      },
    };
  }
}

export const errorManager = new ErrorManager();
