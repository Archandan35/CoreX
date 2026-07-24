import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExportService } from '../services/ExportService';
import { ImportService } from '../services/ImportService';
import logger from '../services/LoggerService';
import analytics from '../services/AnalyticsService';
import scheduler from '../services/SchedulerService';

describe('ExportService', () => {
  const es = new ExportService();

  it('exports CSV with columns', () => {
    const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const csv = es.toCSV(data, ['id', 'name']);
    expect(csv).toContain('"id","name"');
    expect(csv).toContain('"1","Alice"');
    expect(csv).toContain('"2","Bob"');
  });

  it('exports JSON', () => {
    const data = [{ id: 1 }];
    const json = es.toJSON(data);
    expect(json).toContain('"id": 1');
  });

  it('handles empty data', () => {
    expect(es.toCSV([], ['id'])).toBe('');
    expect(es.toJSON([])).toBe('[]');
  });
});

describe('ImportService', () => {
  const imp = new ImportService();

  it('parses CSV content', async () => {
    const result = await imp.parseCSV('name,age\nAlice,30\nBob,25');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alice');
    expect(result[0].age).toBe('30');
  });

  it('parses JSON content', async () => {
    const result = await imp.parseJSON('[{"id":1,"name":"test"}]');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('test');
  });

  it('handles invalid JSON', async () => {
    await expect(imp.parseJSON('not json')).rejects.toThrow('Invalid JSON');
  });
});

describe('LoggerService', () => {
  beforeEach(() => { logger.clearHistory(); });
  afterEach(() => { logger.clearHistory(); });

  it('logs messages at correct levels', () => {
    logger.info('test info');
    logger.warn('test warn');
    logger.error('test error');
    expect(logger.getHistory()).toHaveLength(3);
  });

  it('respects log level filtering', () => {
    logger.setLevel('WARN');
    logger.info('should not appear');
    logger.warn('should appear');
    const history = logger.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].level).toBe('WARN');
    logger.setLevel('INFO');
  });

  it('addHandler and removeHandler', () => {
    const handler = vi.fn();
    logger.addHandler(handler);
    logger.info('test');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('clearHistory empties history', () => {
    logger.info('a');
    logger.warn('b');
    logger.clearHistory();
    expect(logger.getHistory()).toHaveLength(0);
  });
});

describe('AnalyticsService', () => {
  beforeEach(() => { analytics.clear(); });

  it('track records events', () => {
    analytics.track('click', { button: 'submit' });
    expect(analytics.getEvents().length).toBe(1);
  });

  it('pageView records page views', () => {
    analytics.pageView('/home');
    analytics.pageView('/about');
    expect(analytics.getEvents()).toHaveLength(2);
  });

  it('getSummary returns correct counts', () => {
    analytics.track('login');
    analytics.track('logout');
    analytics.pageView('/');
    const s = analytics.getSummary();
    expect(s.login).toBe(1);
    expect(s.logout).toBe(1);
    expect(s.page_view).toBe(1);
  });

  it('clear resets all data', () => {
    analytics.track('x');
    analytics.clear();
    expect(analytics.getSummary()).toEqual({});
  });
});

describe('SchedulerService', () => {
  afterEach(() => scheduler.cancelAll());

  it('every runs task repeatedly', async () => {
    const task = vi.fn();
    scheduler.every('test-interval', 50, task);
    await new Promise((r) => setTimeout(r, 120));
    expect(task).toHaveBeenCalled();
  });

  it('delay runs task once', async () => {
    const task = vi.fn();
    scheduler.delay('test-delay', 30, task);
    expect(task).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 60));
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('cancelAll stops all tasks', () => {
    scheduler.every('t1', 100, () => {});
    scheduler.delay('t2', 100, () => {});
    scheduler.cancelAll();
    expect(scheduler.getAllTasks()).toHaveLength(0);
  });
});
