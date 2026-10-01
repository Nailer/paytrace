import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { LedgerError } from './ledger';
import { requireLocal } from './local-access';
export const SESSION_COOKIE = 'paytrace_session';
export function hosted() { return Boolean(process.env.PAYTRACE_PUBLIC_ORIGIN); }
export function publicOrigin() {
  const value = process.env.PAYTRACE_PUBLIC_ORIGIN;
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.origin !== value) throw new LedgerError('Hosting configuration requires an HTTPS origin without a trailing slash.',503);
  if (!process.env.PAYTRACE_SESSION_SECRET || process.env.PAYTRACE_SESSION_SECRET.length < 32 || !process.env.PAYTRACE_PASSWORD_HASH) throw new LedgerError('Workspace authentication is not configured.',503);
  return value;
}
export function requireSite(request: Request) {
  const origin = publicOrigin();
  if (!origin) return requireLocal(request);
  if (request.headers.get('host') !== new URL(origin).host) throw new LedgerError('Unrecognized application host.',403);
  const supplied = request.headers.get('origin');
  if ((supplied && supplied !== origin) || (request.method !== 'GET' && request.method !== 'HEAD' && supplied !== origin)) throw new LedgerError('Open this action from PayTrace.',403);
  if (request.headers.get('sec-fetch-site') === 'cross-site' && request.method !== 'GET') throw new LedgerError('Cross-site action blocked.',403);
}
export function makeSession(secret: string, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({exp:now+8*60*60*1000,nonce:randomBytes(16).toString('hex')})).toString('base64url');
  return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;
}
export function validSession(token: string | undefined, secret: string, now = Date.now()) {
  if (!token || token.length > 1000) return false;
  try { const [body,signature,...extra]=token.split('.'); if(extra.length || !body || !signature) return false; const expected=createHmac('sha256',secret).update(body).digest();const actual=Buffer.from(signature,'base64url');if(actual.length!==expected.length || !timingSafeEqual(actual,expected)) return false; const v=JSON.parse(Buffer.from(body,'base64url').toString());return Number.isSafeInteger(v.exp)&&v.exp>now&&v.exp<=now+8*60*60*1000; } catch {return false;}
}
export function passwordMatches(password: unknown, encoded: string) {
  if (typeof password !== 'string' || password.length > 256) return false;
  try {const [salt,hash,...extra]=encoded.split(':');if(extra.length||!salt||!hash||!/^[a-f0-9]{128}$/.test(hash)) return false;return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hash,'hex'));}catch{return false;}
}
export function requireOperator(request: Request) {
  requireSite(request); if (!hosted()) return;
  const token=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length+1);
  if(!validSession(token,process.env.PAYTRACE_SESSION_SECRET!)) throw new LedgerError('Please sign in to your workspace.',401);
}
