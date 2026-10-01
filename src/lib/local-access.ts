import { LedgerError } from './ledger';
export function requireLocal(request: Request) {
  const host = request.headers.get('host') || '';
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)) throw new LedgerError('This workspace is local-only. Hosted access requires authentication before deployment.', 403);
  const origin = request.headers.get('origin');
  if (origin && origin !== `http://${host}` && origin !== `https://${host}`) throw new LedgerError('Open this action from the PayTrace workspace.', 403);
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new LedgerError('Cross-site access is not allowed.', 403);
}
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new LedgerError('Expected JSON.', 415);
  const reader = request.body?.getReader(); if (!reader) throw new LedgerError('Missing request details.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 8192) { await reader.cancel(); throw new LedgerError('Request is too large.', 413); } chunks.push(value); }
  try { const result = JSON.parse(Buffer.concat(chunks).toString()); if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error(); return result; } catch { throw new LedgerError('Invalid request details.'); }
}
