import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync('frontend/public/runtime-monitor.js', 'utf8');
function monitor() {
  const listeners = {}, reports = [], timers = [];
  class ErrorEvent { constructor(message) { this.message = message; this.error = new Error(message); this.filename = 'https://canvas.test/assets/app.js?private=secret'; this.lineno = 12; this.colno = 3; } }
  runInNewContext(source, { window: { __NC_RELEASE__: { jobId: '12345678-1234-1234-1234-123456789abc', tree: 'a'.repeat(40) } }, ErrorEvent, Error, URL, Set, document: { getElementById: () => ({ hasChildNodes: () => true }) }, addEventListener: (name, fn) => { listeners[name] = fn; }, setTimeout: fn => timers.push(fn), fetch: (_url, init) => { reports.push(JSON.parse(init.body)); return Promise.resolve(); } });
  return { listeners, reports, timers, ErrorEvent };
}
describe('early frontend monitoring', () => {
  it('captures pre-render errors, redacts details and deduplicates reports', () => {
    const m = monitor();
    m.listeners.error(new m.ErrorEvent('Cannot render "private input"'));
    m.listeners.error(new m.ErrorEvent('Cannot render again'));
    m.timers[0]();
    expect(m.reports).toHaveLength(1);
    expect(m.reports[0].message).not.toContain('private input');
    expect(m.reports[0].location).not.toContain('private=');
    expect(m.reports[0].kind).toBe('error');
  });
  it('reports a mounted page only after the observation interval', () => {
    const m = monitor();
    expect(m.reports).toHaveLength(0);
    m.timers[0]();
    expect(m.reports[0].kind).toBe('ready');
  });
  it('captures script load failures and unhandled rejections', () => {
    const m = monitor();
    m.listeners.error({ target: { tagName: 'SCRIPT', src: 'https://canvas.test/assets/missing.js' } });
    m.listeners.unhandledrejection({ reason: new Error('Async failure') });
    expect(m.reports.map(r => r.kind)).toEqual(['resource', 'unhandledrejection']);
  });
});
