import { decimal, units } from './payments';
import { MONAD_TESTNET, type ChainProof, type ChainTransfer, type VerifyInput } from './chain-types';

export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const hashPattern = /^0x[0-9a-fA-F]{64}$/;
const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const quantityPattern = /^0x[0-9a-fA-F]+$/;
export class VerificationError extends Error { constructor(message: string, public status = 502) { super(message); } }
export function validateVerifyInput(value: unknown): VerifyInput {
  if (!value || typeof value !== 'object') throw new VerificationError('Enter a transaction hash, recipient and expected amount.', 400);
  const v = value as Record<string, unknown>;
  if (typeof v.transactionHash !== 'string' || !hashPattern.test(v.transactionHash.trim())) throw new VerificationError('A transaction hash must start with 0x and contain 64 hexadecimal characters.', 400);
  if (typeof v.recipient !== 'string' || !addressPattern.test(v.recipient.trim()) || /^0x0{40}$/i.test(v.recipient.trim())) throw new VerificationError('Enter a valid, nonzero recipient wallet address.', 400);
  try { if (typeof v.expectedAmount !== 'string' || units(v.expectedAmount) <= 0n) throw new Error(); } catch { throw new VerificationError('Enter a positive USDC amount with up to six decimal places.', 400); }
  return { transactionHash: v.transactionHash.trim().toLowerCase(), recipient: v.recipient.trim().toLowerCase(), expectedAmount: v.expectedAmount as string };
}
export type RpcReceipt = { transactionHash: string; status: string; blockNumber: string; blockHash: string; logs: { address: string; topics: string[]; data: string; logIndex: string; transactionHash: string; blockHash: string; removed?: boolean }[] };
type Block = { number: string; hash: string };
type Rpc = <T>(method: string, params: unknown[]) => Promise<T>;
function blockNumber(value: string): number { if (!quantityPattern.test(value)) throw new VerificationError('The network returned invalid block evidence.'); const n = Number(BigInt(value)); if (!Number.isSafeInteger(n) || n < 0) throw new VerificationError('The network returned an invalid block number.'); return n; }
export function inspectReceipt(input: VerifyInput, receipt: RpcReceipt | null, finalized: Block | null, canonical: Block | null, now = new Date()): ChainProof {
  const base: ChainProof = { outcome:'unavailable', summary: 'No receipt is available yet. The transaction may be pending or absent from Monad testnet.', transactionHash: input.transactionHash, recipient: input.recipient, expectedAmount: input.expectedAmount, chainId: MONAD_TESTNET.chainId, tokenAddress: MONAD_TESTNET.usdc, receivedAmount: null, blockNumber: null, blockHash: null, finalizedThrough: null, checkedAt: now.toISOString(), transfers: [] };
  if (!receipt) return base;
  if (!hashPattern.test(receipt.transactionHash) || receipt.transactionHash.toLowerCase() !== input.transactionHash || !hashPattern.test(receipt.blockHash)) throw new VerificationError('The network returned inconsistent transaction evidence.');
  base.blockNumber = blockNumber(receipt.blockNumber); base.blockHash = receipt.blockHash;
  if (!canonical || canonical.hash.toLowerCase() !== receipt.blockHash.toLowerCase() || blockNumber(canonical.number) !== base.blockNumber) throw new VerificationError('The receipt no longer matches the canonical block. Check again.');
  if (receipt.status === '0x0') return { ...base, outcome:'reverted', summary:'This transaction reverted. It cannot be counted as a received payment.', receivedAmount:'0' };
  if (receipt.status !== '0x1') throw new VerificationError('The transaction success status could not be verified.');
  if (!finalized || !hashPattern.test(finalized.hash)) throw new VerificationError('The provider could not supply finalized-block evidence. No payment was marked verified.');
  base.finalizedThrough = blockNumber(finalized.number);
  if (base.blockNumber > base.finalizedThrough) return { ...base, outcome:'not_finalized', summary:'The transaction is included but its block is not yet within the provider’s finalized range. Check again shortly.' };
  if (!Array.isArray(receipt.logs)) throw new VerificationError('The network returned an invalid event list.');
  const transfers: ChainTransfer[] = [];
  const seen = new Set<number>();
  for (const log of receipt.logs) {
    if (typeof log.address !== 'string' || log.address.toLowerCase() !== MONAD_TESTNET.usdc.toLowerCase()) continue;
    if (!Array.isArray(log.topics) || log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
    if (log.topics.length !== 3 || !log.topics.slice(1).every(t => /^0x0{24}[a-f0-9]{40}$/i.test(t)) || !hashPattern.test(log.data)) throw new VerificationError('A USDC transfer log has an unexpected format.');
    if (log.removed || log.transactionHash?.toLowerCase() !== input.transactionHash || log.blockHash?.toLowerCase() !== receipt.blockHash.toLowerCase()) throw new VerificationError('A USDC transfer log does not match the finalized receipt.');
    const index = blockNumber(log.logIndex);
    if (seen.has(index)) throw new VerificationError('The network returned duplicate log indexes.');
    seen.add(index);
    const from = '0x' + log.topics[1].slice(-40).toLowerCase(), to = '0x' + log.topics[2].slice(-40).toLowerCase();
    if (to !== input.recipient) continue;
    const raw = BigInt(log.data);
    if (raw === 0n) continue;
    transfers.push({ evidenceId: `${MONAD_TESTNET.chainId}:${input.transactionHash}:${index}`, logIndex:index, from, to, amount:decimal(raw), isMint:/^0x0{40}$/.test(from) });
  }
  if (!transfers.length) return { ...base, outcome:'no_transfer', summary:'No positive transfer from the supported USDC contract to this recipient was found. The transaction itself may have succeeded.', receivedAmount:'0' };
  // One candidate event is selected later by the operator. We never combine ambiguous logs into a payment.
  const exact = transfers.filter(t => BigInt(t.amount.replace('.', '')) === units(input.expectedAmount));
  if (exact.length === 1 && transfers.length === 1) return { ...base, outcome:'verified', summary: transfers[0].isMint ? 'A finalized test USDC mint matches this recipient and amount. It is faucet/mint evidence, not a payment from a customer.' : 'A finalized test USDC transfer matches this recipient and amount.', receivedAmount:transfers[0].amount, transfers };
  return { ...base, outcome:'amount_mismatch', summary: transfers.length > 1 ? 'Multiple incoming USDC events need manual review. They have not been combined or assigned to a payment.' : 'The recipient matches, but the transferred amount differs from the requested amount.', receivedAmount:transfers.length === 1 ? transfers[0].amount : null, transfers };
}
export function createRpc(url = MONAD_TESTNET.rpc): Rpc {
  return async function rpc<T>(method: string, params: unknown[]): Promise<T> {
    let response: Response;
    try { response = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}), signal:AbortSignal.timeout(12000), cache:'no-store' }); }
    catch { throw new VerificationError('The Monad testnet provider did not respond. Nothing was marked verified. Please retry.'); }
    if (!response.ok) throw new VerificationError(response.status === 429 ? 'The public RPC is rate limited. Please retry in a moment.' : 'The Monad testnet provider is temporarily unavailable.', response.status === 429 ? 429 : 502);
    let payload: { result?: T; error?: unknown };
    try { payload = await response.json(); } catch { throw new VerificationError('The network returned unreadable data.'); }
    if (!payload || payload.error || !Object.hasOwn(payload, 'result')) throw new VerificationError('The provider could not complete this verification. Nothing was marked verified.');
    return payload.result as T;
  };
}
export async function verifyTransfer(value: unknown, rpc: Rpc = createRpc()): Promise<ChainProof> {
  const input = validateVerifyInput(value);
  const chainId = await rpc<string>('eth_chainId', []);
  if (!quantityPattern.test(chainId) || BigInt(chainId) !== BigInt(MONAD_TESTNET.chainId)) throw new VerificationError('The connected provider is not Monad testnet. Verification stopped.');
  const receipt = await rpc<RpcReceipt | null>('eth_getTransactionReceipt', [input.transactionHash]);
  if (!receipt) return inspectReceipt(input, null, null, null);
  if (!quantityPattern.test(receipt.blockNumber)) throw new VerificationError('The receipt has no valid block number.');
  const [finalized, canonical] = await Promise.all([rpc<Block | null>('eth_getBlockByNumber', ['finalized', false]), rpc<Block | null>('eth_getBlockByNumber', [receipt.blockNumber, false])]);
  return inspectReceipt(input, receipt, finalized, canonical);
}
