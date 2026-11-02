(() => {
  const release = window.__NC_RELEASE__;
  if (!release || !release.jobId) return;
  let failed = false;
  const sent = new Set();
  const clean = value => String(value || '').replace(/https?:\/\/[^\s)]+/g, url => { try { return new URL(url).pathname; } catch { return '[url]'; } }).replace(/(["'`]).*?\1/g, '[text]').replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[redacted]').slice(0, 500);
  const report = (kind, message, location) => {
    if (kind !== 'ready') failed = true;
    if (sent.has(kind) || sent.size >= 3) return;
    sent.add(kind);
    fetch('https://nocoder.297782.xyz/api/runtime-report', { method: 'POST', mode: 'cors', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...release, kind, message: clean(message), location: clean(location) }), keepalive: true }).catch(() => {});
  };
  addEventListener('error', event => {
    if (event instanceof ErrorEvent) report('error', `${event.error?.name || 'Error'}: ${event.message}`, `${event.filename || ''}:${event.lineno || 0}:${event.colno || 0}`);
    else {
      const element = event.target;
      const url = element?.src || element?.href || '';
      if (element?.tagName === 'SCRIPT' || (element?.tagName === 'LINK' && element.rel === 'stylesheet')) report('resource', 'Application resource failed to load', url);
    }
  }, true);
  addEventListener('unhandledrejection', event => report('unhandledrejection', event.reason instanceof Error ? `${event.reason.name}: ${event.reason.message}` : 'Unhandled Promise rejection', event.reason instanceof Error ? (event.reason.stack || '').split('\n').slice(1, 3).join('\n') : ''));
  setTimeout(() => {
    if (failed) return;
    if (!document.getElementById('root')?.hasChildNodes()) report('error', 'Application did not mount', '/');
    else report('ready', '', '');
  }, 30000);
})();
