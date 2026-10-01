import { VerificationError, verifyTransfer } from '@/lib/chain-verification';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' };
// Modest instance-wide budget; deployment must add edge/distributed rate limiting.
let active = 0;
let windowStart = Date.now();
let requests = 0;
export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return Response.json({error:'Use the verification form from this site.'}, {status:403, headers});
  if (Date.now() - windowStart > 60000) { requests = 0; windowStart = Date.now(); }
  if (active >= 3 || requests >= 20) return Response.json({error:'Verification is busy. Please retry in a moment.'}, {status:429, headers:{...headers,'Retry-After':'30'}});
  if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({error:'Expected a JSON request.'}, {status:415, headers});
  active++; requests++;
  try {
    const reader = request.body?.getReader(); if (!reader) throw new VerificationError('Missing verification details.', 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > 4096) { await reader.cancel(); throw new VerificationError('Verification request is too large.',413); } chunks.push(value); }
    const body = Buffer.concat(chunks).toString('utf8');
    let input: unknown; try { input = JSON.parse(body); } catch { throw new VerificationError('Verification details must be valid JSON.',400); }
    return Response.json(await verifyTransfer(input), {headers});
  } catch (e) {
    return Response.json({error:e instanceof VerificationError ? e.message : 'Verification could not be completed. No payment was changed.'}, {status:e instanceof VerificationError ? e.status : 500, headers});
  } finally { active--; }
}
