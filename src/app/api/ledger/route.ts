import { operatorLedger } from '@/lib/access';
import { ledger, LedgerError } from '@/lib/ledger';
import { createRpc, VerificationError, verifyTransfer } from '@/lib/chain-verification';
import { readJson } from '@/lib/local-access';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
function failure(e: unknown) { return Response.json({ error: e instanceof LedgerError || e instanceof VerificationError ? e.message : 'The operation could not be completed. Please retry.' }, { status: e instanceof LedgerError || e instanceof VerificationError ? e.status : 500, headers }); }
export async function GET(request: Request) { try { const db=await operatorLedger(request); return Response.json((await db.snapshot()), { headers }); } catch(e) { return failure(e); } }
let active = 0;
export async function POST(request: Request) {
  let acquired = false;
  try {
    const db=await operatorLedger(request);
    if (active >= 3) throw new LedgerError('The ledger is busy. Please retry shortly.', 429);
    active++; acquired = true;
    const body = await readJson(request);
    switch(body.action) {
      case 'settings': (await db.setRecipient(body.recipient)); break;
      case 'create': {
        const rpc = createRpc();
        const chain = await rpc<string>('eth_chainId', []);
        if (chain !== '0x279f') throw new LedgerError('The provider is not connected to Monad testnet.', 502);
        const block = await rpc<string>('eth_blockNumber', []);
        if (!/^0x[\da-f]+$/i.test(block)) throw new LedgerError('Starting block is unavailable.', 502);
        (await db.create(body, Number(BigInt(block)))); break;
      }
      case 'import': (await db.importFunding(await verifyTransfer({ transactionHash: body.transactionHash, recipient: (await db.snapshot()).recipient, expectedAmount: body.amount }), body.label)); break;
      case 'match': {
        if (typeof body.id !== 'string') throw new LedgerError('Choose a payment request.');
        const row = (await db.request(body.id));
        try { (await db.match(row.id, await verifyTransfer({ transactionHash: body.transactionHash, recipient: row.recipient, expectedAmount: row.amount }))); } catch(e) { if(e instanceof LedgerError && e.status === 422 && typeof body.transactionHash === 'string') (await db.review(row.id,body.transactionHash,e.message)); throw e; } break;
      }
      case 'cancel': if(typeof body.id !== 'string') throw new LedgerError('Choose a request.'); (await db.cancel(body.id)); break;
      case 'resolve': if(typeof body.id !== 'string') throw new LedgerError('Choose a review item.'); (await db.resolveReview(body.id)); break;
      case 'note': if (typeof body.id !== 'string') throw new LedgerError('Choose a payment request.'); (await db.note(body.id, body.text)); break;
      default: throw new LedgerError('Unknown ledger action.');
    }
    return Response.json((await db.snapshot()), { headers });
  } catch(e) { return failure(e); } finally { if (acquired) active--; }
}
