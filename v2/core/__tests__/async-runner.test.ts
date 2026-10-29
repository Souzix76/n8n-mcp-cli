import { describe, it, expect, vi } from 'vitest';
import { AsyncRunner, CancellationToken } from '../async-runner.js';

describe('AsyncRunner', () => {
  it('runs async operation with progress', async () => {
    const progressReports: Array<{ stage: string; progress: number }> = [];
    const runner = new AsyncRunner();

    const result = await runner.run(async (progressToken) => {
      progressToken.report({ stage: 'start', progress: 0 });
      await new Promise(r => setTimeout(r, 10));
      progressToken.report({ stage: 'middle', progress: 50 });
      await new Promise(r => setTimeout(r, 10));
      progressToken.report({ stage: 'end', progress: 100 });
      return 'done';
    }, { onProgress: (p) => progressReports.push({ stage: p.stage, progress: p.progress }) });

    expect(result).toBe('done');
    expect(progressReports).toHaveLength(3);
    expect(progressReports[0].stage).toBe('start');
    expect(progressReports[2].progress).toBe(100);
  });

  it('cancels operation when token triggered', async () => {
    const runner = new AsyncRunner();
    const token = new CancellationToken();

    setTimeout(() => token.cancel(), 5);

    await expect(runner.run(async (p) => {
      await new Promise(r => setTimeout(r, 100));
      return 'done';
    }, { cancellationToken: token })).rejects.toThrow('cancelled');
  });

  it('cancels operation when token already cancelled', async () => {
    const runner = new AsyncRunner();
    const token = new CancellationToken();
    token.cancel();

    await expect(runner.run(async () => 'done', { cancellationToken: token })).rejects.toThrow('cancelled');
  });

  it('enforces timeout budget', async () => {
    const runner = new AsyncRunner({ defaultTimeout: 50 });

    await expect(runner.run(async () => {
      await new Promise(r => setTimeout(r, 200));
      return 'done';
    })).rejects.toThrow('timeout');
  });

  it('allows custom timeout override', async () => {
    const runner = new AsyncRunner({ defaultTimeout: 5000 });

    await expect(runner.run(async () => {
      await new Promise(r => setTimeout(r, 100));
      return 'done';
    }, { timeout: 10 })).rejects.toThrow('timeout');
  });

  it('calls global onProgress callback', async () => {
    const progressReports: Array<{ stage: string; progress: number }> = [];
    const runner = new AsyncRunner({ onProgress: (p) => progressReports.push({ stage: p.stage, progress: p.progress }) });

    await runner.run(async (p) => {
      p.report({ stage: 'test', progress: 42 });
      return 'ok';
    });

    expect(progressReports).toContainEqual({ stage: 'test', progress: 42 });
  });

  it('CancellationToken onCancel registers listener', () => {
    const token = new CancellationToken();
    const listener = vi.fn();
    const unsubscribe = token.onCancel(listener);

    token.cancel();
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    listener.mockClear();
    token.cancel();
    expect(listener).not.toHaveBeenCalled();
  });

  it('ProgressToken reports correctly', () => {
    const reports: Array<{ stage: string; progress: number }> = [];
    const token = AsyncRunner.createProgressToken((p) => reports.push(p));

    token.report({ stage: 'a', progress: 10 });
    token.report({ stage: 'b', progress: 90 });

    expect(reports).toHaveLength(2);
    expect(reports[1].progress).toBe(90);
  });
});