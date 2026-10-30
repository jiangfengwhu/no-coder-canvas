import type { Env } from './index';
// Add application business APIs here. Return null for frontend asset requests.
export async function appApi(_request: Request, _env: Env): Promise<Response | null> {
  return null;
}
