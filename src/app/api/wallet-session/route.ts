import { createHmac } from 'node:crypto';
import { hosted, publicOrigin, requireSite, makeSession, SESSION_COOKIE } from '@/lib/access';
import { ledger, LedgerError } from '@/lib/ledger';
import { readJson } from '@/lib/local-access';
import { CHALLENGE_COOKIE, walletChallenge, verifyWalletChallenge } from '@/lib/wallet-auth';
export const runtime='nodejs';
export async function POST(request:Request) {
  const headers=new Headers({'Cache-Control':'no-store'});
  try {
    requireSite(request);
    const secret=process.env.PAYTRACE_SESSION_SECRET;
    if(!secret || secret.length<32)throw new LedgerError('Sign-in is not configured on this host.',503);
    const body=await readJson(request),db=ledger(),origin=publicOrigin() || new URL(request.url).origin;
    const client=process.env.VERCEL?request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown':'single-host';
    if(body.action!=='challenge'&&body.action!=='verify')throw new LedgerError('Unknown sign-in action.');
    await db.takeLoginAttempt(createHmac('sha256',secret).update(`wallet:${body.action}:${client}`).digest('hex'));
    const cookie=(name:string,value:string,age:number)=>`${name}=${value}; Path=/; HttpOnly; ${hosted()?'Secure; ':''}SameSite=Strict; Max-Age=${age}`;
    if(body.action==='challenge') {
      const challenge=await walletChallenge(db,body.address,origin);
      headers.append('Set-Cookie',cookie(CHALLENGE_COOKIE,challenge.binding,300));
      return Response.json({id:challenge.id,message:challenge.message},{headers});
    }
    const binding=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${CHALLENGE_COOKIE}=`))?.slice(CHALLENGE_COOKIE.length+1)||'';
    const account=await verifyWalletChallenge(db,body,binding,origin);
    headers.append('Set-Cookie',cookie(SESSION_COOKIE,makeSession(secret,Date.now(),account),28800));
    headers.append('Set-Cookie',cookie(CHALLENGE_COOKIE,'',0));
    return Response.json({ok:true},{headers});
  }catch(e){return Response.json({error:e instanceof LedgerError?e.message:'Sign-in is temporarily unavailable.'},{status:e instanceof LedgerError?e.status:500,headers});}
}
