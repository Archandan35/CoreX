export class WorkflowStep {
  constructor(name, handler, options = {}) {
    this.name = name;
    this.handler = handler;
    this.retryCount = options.retryCount || 0;
    this.timeout = options.timeout || 30000;
    this.onError = options.onError || 'fail';
  }
}

export class WorkflowEngine {
  constructor() {
    this.workflows = new Map();
  }

  define(name, steps) {
    this.workflows.set(name, steps);
  }

  async execute(name, context = {}) {
    const steps = this.workflows.get(name);
    if (!steps) throw new Error(`Workflow not found: ${name}`);

    const execution = {
      workflow: name,
      context,
      startTime: Date.now(),
      steps: [],
      status: 'running',
    };

    for (const step of steps) {
      const stepResult = { name: step.name, status: 'pending', attempts: 0 };
      execution.steps.push(stepResult);

      for (let attempt = 0; attempt <= step.retryCount; attempt++) {
        stepResult.attempts++;
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Step timed out after ${step.timeout}ms`)), step.timeout)
          );
          stepResult.result = await Promise.race([step.handler(context), timeoutPromise]);
          stepResult.status = 'completed';
          break;
        } catch (err) {
          stepResult.error = err.message;
          stepResult.status = attempt < step.retryCount ? 'retrying' : 'failed';
          if (step.onError === 'abort') {
            execution.status = 'aborted';
            return execution;
          }
        }
      }

      if (stepResult.status === 'failed' && step.onError === 'fail') {
        execution.status = 'failed';
        return execution;
      }
    }

    execution.status = 'completed';
    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;
    return execution;
  }

  get(name) {
    return this.workflows.get(name);
  }
}
