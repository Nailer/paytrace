import { ledger, LedgerError } from '@/lib/ledger';
import { verifyTransfer, VerificationError } from '@/lib/chain-verification';
import { readJson } from '@/lib/local-access';
import { requireSite } from '@/lib/access';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
type Context={params:Promise<{token:string}>};
let active=0, count=0, start=0;
function fail(e:unknown){return Response.json({error:e instanceof LedgerError||e instanceof VerificationError?e.message:'Verification is temporarily unavailable.'},{status:e instanceof LedgerError||e instanceof VerificationError?e.status:500,headers});}
export async function GET(request:Request,{params}:Context){try{requireSite(request);const {token}=await params;const row=(await ledger().tracking(token));if(!row)throw new LedgerError('Payment link not found.',404);return Response.json(row,{headers});}catch(e){return fail(e);}}
export async function POST(request:Request,{params}:Context){let acquired=false;try{requireSite(request);if(Date.now()-start>60000){count=0;start=Date.now();}if(active>=3||count>=45)throw new LedgerError('Verification is busy. Retry shortly.',429);active++;count++;acquired=true;
  const {token}=await params;const db=ledger(),row=(await db.tracking(token));if(!row)throw new LedgerError('Payment link not found.',404);if(row.status!=='awaiting')return Response.json(row,{headers});
  const body=await readJson(request);const proof=await verifyTransfer({transactionHash:body.transactionHash,recipient:row.recipient,expectedAmount:row.amount});
  if(proof.outcome==='unavailable'||proof.outcome==='not_finalized')return Response.json({pending:true,summary:proof.summary},{status:202,headers});
  try{(await db.match(row.id,proof));}catch(e){if(e instanceof LedgerError&&e.status===422)(await db.review(row.id,proof.transactionHash,e.message));throw e;}
  return Response.json((await db.tracking(token)),{headers});
}catch(e){return fail(e);}finally{if(acquired)active--;}}
