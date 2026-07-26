export class QueueService {
  constructor() {
    this.queues = new Map();
    this.handlers = new Map();
    this.processed = 0;
    this.failed = 0;
  }

  async enqueue(queue, job) {
    if (!this.queues.has(queue)) this.queues.set(queue, []);
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const entry = { id: jobId, data: job, status: 'pending', createdAt: new Date() };
    this.queues.get(queue).push(entry);

    if (this.handlers.has(queue)) {
      this.processNext(queue);
    }

    return jobId;
  }

  process(queue, handler) {
    this.handlers.set(queue, handler);
  }

  async processNext(queue) {
    const jobs = this.queues.get(queue);
    if (!jobs || jobs.length === 0) return;

    const job = jobs.shift();
    if (!job) return;

    const handler = this.handlers.get(queue);
    if (!handler) {
      this.queues.get(queue).unshift(job);
      return;
    }

    try {
      job.status = 'processing';
      await handler(job.data);
      job.status = 'completed';
      this.processed++;
    } catch (err) {
      job.status = 'failed';
      job.error = err.message;
      this.failed++;
    }

    setImmediate(() => this.processNext(queue));
  }

  stats() {
    const result = {};
    for (const [name, jobs] of this.queues) {
      result[name] = {
        pending: jobs.filter((j) => j.status === 'pending').length,
        processing: jobs.filter((j) => j.status === 'processing').length,
        total: jobs.length,
      };
    }
    return { queues: result, processed: this.processed, failed: this.failed };
  }
}

export const queueService = new QueueService();
