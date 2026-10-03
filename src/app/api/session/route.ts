import { hosted, makeSession, passwordMatches, requireSite, SESSION_COOKIE } from '@/lib/access';
import { createAccount, signIn, recover } from '@/lib/accounts';
import { readJson } from '@/lib/local-access';
import { createHmac } from 'node:crypto';
import { ledger, LedgerError } from '@/lib/ledger';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export async function POST(request: Request) {
  try {
    requireSite(request);
    const secret=process.env.PAYTRACE_SESSION_SECRET;
    if (!secret || secret.length<32) throw new LedgerError('Account sign-in is not configured on this host.',503);
    const body=await readJson(request);
    const action=body.action || 'signin';
    if(typeof action!=='string'||!['signin','signup','recover','owner'].includes(action))throw new LedgerError('Unknown account action.');
    const client=process.env.VERCEL?request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown':'single-host';
    const key=createHmac('sha256',secret).update(`account:${action}:${client}`).digest('hex');
    await ledger().takeLoginAttempt(key);
    let account: {id:string;version:number}|undefined;
    let recoveryCode: string|undefined;
    if(action==='owner') {
      if(!passwordMatches(body.password,process.env.PAYTRACE_PASSWORD_HASH!))throw new LedgerError('The workspace password is incorrect.',401);
    } else if(action==='signup') {
      const result=await createAccount(body);account=result.account;recoveryCode=result.recoveryCode;
    } else if(action==='recover') {
      const result=await recover(body);account={id:String(result.account.id),version:Number(result.account.version)};recoveryCode=result.recoveryCode;
    } else account=await signIn(body);
    const token=makeSession(secret,Date.now(),account);
    return Response.json({ok:true,recoveryCode},{headers:{...headers,'Set-Cookie':`${SESSION_COOKIE}=${token}; Path=/; HttpOnly; ${hosted()?'Secure; ':''}SameSite=Strict; Max-Age=28800`}});
  }catch(e){return Response.json({error:e instanceof LedgerError?e.message:'Account access is temporarily unavailable.'},{status:e instanceof LedgerError?e.status:500,headers});}
}
export async function DELETE(request:Request){try{requireSite(request);return Response.json({ok:true},{headers:{...headers,'Set-Cookie':`${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}});}catch{return Response.json({error:'Request rejected.'},{status:403,headers});}}
