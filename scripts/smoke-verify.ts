import { writeFile } from 'node:fs/promises';
import { createRpc, TRANSFER_TOPIC, verifyTransfer } from '../src/lib/chain-verification';
import { MONAD_TESTNET } from '../src/lib/chain-types';
import { decimal } from '../src/lib/payments';

async function main() {
  const rpc = createRpc();
  const latest = BigInt(await rpc<string>('eth_blockNumber', []));
  type Log = {transactionHash:string; topics:string[]; data:string};
  let sample: Log | undefined;
  for (let i = 0; i < 20 && !sample; i++) {
    const to = latest - BigInt(i * 100), from = to - 99n;
    const logs = await rpc<Log[]>('eth_getLogs', [{address:MONAD_TESTNET.usdc,fromBlock:'0x'+from.toString(16),toBlock:'0x'+to.toString(16),topics:[TRANSFER_TOPIC]}]);
    sample = logs.find(log => log.topics.length === 3 && BigInt(log.data) > 0n && !/^0x0{64}$/.test(log.topics[1]) && log.topics[1] !== log.topics[2]);
  }
  if (!sample) throw new Error('No suitable public USDC transfer found in the last 2,000 blocks. Supply a test transaction through the interface.');
  const input = {transactionHash:sample.transactionHash,recipient:'0x'+sample.topics[2].slice(-40),expectedAmount:decimal(BigInt(sample.data))};
  const proof = await verifyTransfer(input, rpc);
  if (proof.outcome !== 'verified') throw new Error(`Selected transfer returned ${proof.outcome}: ${proof.summary}`);
  const mismatch = await verifyTransfer({...input, expectedAmount:decimal(BigInt(sample.data) + 1n)},rpc);
  if (mismatch.outcome !== 'amount_mismatch') throw new Error('Negative live verification did not report a mismatch.');
  await writeFile('docs/testnet-verification-evidence.json',JSON.stringify({purpose:'Read-only integration test against a public third-party transaction. Not a transaction sent by PayTrace or its owner.',proof,negativeCheck:{expectedAmount:mismatch.expectedAmount,outcome:mismatch.outcome}},null,2)+'\n');
  console.log(JSON.stringify({outcome:proof.outcome,hash:proof.transactionHash,recipient:proof.recipient,amount:proof.receivedAmount,block:proof.blockNumber,negativeCheck:mismatch.outcome}));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Smoke test failed'); process.exitCode = 1; });
