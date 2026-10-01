import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectReceipt, validateVerifyInput, verifyTransfer, TRANSFER_TOPIC, type RpcReceipt } from '../src/lib/chain-verification';
import { MONAD_TESTNET } from '../src/lib/chain-types';
const hash = '0x' + 'ab'.repeat(32), blockHash = '0x' + 'cd'.repeat(32);
const recipient = '0x' + '12'.repeat(20), sender = '0x' + '34'.repeat(20);
const input = {transactionHash:hash, recipient, expectedAmount:'1.000001'};
const block = {number:'0x64', hash:blockHash};
const log = { address:MONAD_TESTNET.usdc, topics:[TRANSFER_TOPIC,'0x' + '0'.repeat(24) + sender.slice(2),'0x' + '0'.repeat(24) + recipient.slice(2)], data:'0x' + (1000001n).toString(16).padStart(64,'0'), logIndex:'0x0', transactionHash:hash, blockHash, removed:false };
const receipt: RpcReceipt = {transactionHash:hash, status:'0x1', blockNumber:'0x64', blockHash, logs:[log]};
test('exact canonical finalized USDC transfer is verified', () => {
  const p = inspectReceipt(input, receipt, block, block);
  assert.equal(p.outcome,'verified'); assert.equal(p.receivedAmount,'1.000001'); assert.equal(p.transfers[0].evidenceId,`10143:${hash}:0`);
});
test('wrong token and wrong recipient cannot be counted', () => {
  assert.equal(inspectReceipt(input,{...receipt,logs:[{...log,address:sender}]},block,block).outcome,'no_transfer');
  assert.equal(inspectReceipt({...input,recipient:sender},receipt,block,block).outcome,'no_transfer');
});
test('amount mismatch is not verified', () => { assert.equal(inspectReceipt({...input,expectedAmount:'1'},receipt,block,block).outcome,'amount_mismatch'); });
test('failed and unfinalized transactions cannot be counted', () => {
  assert.equal(inspectReceipt(input,{...receipt,status:'0x0'},block,block).outcome,'reverted');
  assert.equal(inspectReceipt(input,receipt,{...block,number:'0x63'},block).outcome,'not_finalized');
});
test('missing receipt is unknown rather than a zero balance', () => {
  const p = inspectReceipt(input,null,null,null); assert.equal(p.outcome,'unavailable'); assert.equal(p.receivedAmount,null);
});
test('canonical hash mismatch, removed log and duplicate indexes fail closed', () => {
  assert.throws(() => inspectReceipt(input,receipt,block,{...block,hash:'0x'+'ef'.repeat(32)}));
  assert.throws(() => inspectReceipt(input,{...receipt,logs:[{...log,removed:true}]},block,block));
  assert.throws(() => inspectReceipt(input,{...receipt,logs:[log,log]},block,block));
});
test('multiple candidate transfers require manual selection rather than aggregation', () => {
  const p = inspectReceipt(input,{...receipt,logs:[log,{...log,logIndex:'0x1'}]},block,block);
  assert.equal(p.outcome,'amount_mismatch'); assert.equal(p.receivedAmount,null); assert.equal(p.transfers.length,2);
});
test('mint evidence is explicitly distinguished from customer payment', () => {
  const p = inspectReceipt(input,{...receipt,logs:[{...log,topics:[TRANSFER_TOPIC,'0x'+'0'.repeat(64),log.topics[2]]}]},block,block);
  assert.equal(p.transfers[0].isMint,true); assert.match(p.summary,/not a payment from a customer/);
});
test('wrong-chain RPC stops before reading receipts', async () => {
  let calls = 0;
  await assert.rejects(() => verifyTransfer(input,async <T>() => { calls++; return '0x1' as T; }),/not Monad testnet/);
  assert.equal(calls,1);
});
test('invalid user input is rejected before RPC traffic', () => {
  assert.throws(() => validateVerifyInput({...input,transactionHash:'https://evil.example'}));
  assert.throws(() => validateVerifyInput({...input,recipient:'0x'+'0'.repeat(40)}));
  assert.throws(() => validateVerifyInput({...input,expectedAmount:'0'}));
});
