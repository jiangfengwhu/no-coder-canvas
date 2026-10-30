import { appApi } from './app';
export interface Env { ASSETS: Fetcher; APP_COMMIT?: string; APP_TREE?: string; APP_JOB?: string }
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/health') return Response.json({ ok: true, commit: env.APP_COMMIT || 'local', tree: env.APP_TREE || '', jobId: env.APP_JOB || '' }, { headers: { 'Cache-Control': 'no-store' } });
    const response = await appApi(request, env);
    if (response) return response;
    if (path.startsWith('/api/')) return Response.json({ error: '接口不存在。' }, { status: 404 });
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
