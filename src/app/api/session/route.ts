import { hosted, makeSession, passwordMatches, requireSite, SESSION_COOKIE } from '@/lib/access';
import { readJson } from '@/lib/local-access';
import { LedgerError } from '@/lib/ledger';
export const runtime='nodejs';
let attempts=0, resetAt=0;
const headers={'Cache-Control':'no-store'};
export async function POST(request: Request) {
  try {requireSite(request);if(!hosted())return Response.json({ok:true},{headers});if(Date.now()>resetAt){attempts=0;resetAt=Date.now()+15*60000;}if(attempts>=5)throw new LedgerError('Too many sign-in attempts. Try again in 15 minutes.',429);attempts++;
    const body=await readJson(request);if(!passwordMatches(body.password,process.env.PAYTRACE_PASSWORD_HASH!))throw new LedgerError('The workspace password is incorrect.',401);
    attempts=0;const token=makeSession(process.env.PAYTRACE_SESSION_SECRET!);return Response.json({ok:true},{headers:{...headers,'Set-Cookie':`${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}});
  }catch(e){return Response.json({error:e instanceof LedgerError?e.message:'Sign-in is unavailable.'},{status:e instanceof LedgerError?e.status:500,headers});}
}
export async function DELETE(request:Request){try{requireSite(request);return Response.json({ok:true},{headers:{...headers,'Set-Cookie':`${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}});}catch{return Response.json({error:'Request rejected.'},{status:403,headers});}}
