import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MONAD_TESTNET } from '../src/lib/chain-types';
import { TRANSFER_TOPIC } from '../src/lib/chain-verification';

test('API creates, tracks, notes and matches a payment; rejects duplicate, cross-origin and oversized writes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'paytrace-api-'));
  process.env.PAYTRACE_DB_PATH = join(dir, 'test.sqlite');
  const originalFetch = globalThis.fetch;
  const recipient = '0x'+'a'.repeat(40), payer='0x'+'b'.repeat(40), hash='0x'+'c'.repeat(64), blockHash='0x'+'d'.repeat(64);
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    const result = body.method === 'eth_chainId' ? '0x279f' : body.method === 'eth_blockNumber' ? '0x64' : body.method === 'eth_getBlockByNumber' ? {number:'0x65',hash:blockHash} : body.method === 'eth_getTransactionReceipt' ? {transactionHash:hash,status:'0x1',blockNumber:'0x65',blockHash,logs:[{address:MONAD_TESTNET.usdc,topics:[TRANSFER_TOPIC,'0x'+'0'.repeat(24)+payer.slice(2),'0x'+'0'.repeat(24)+recipient.slice(2)],data:'0x'+(1_000_001n).toString(16).padStart(64,'0'),logIndex:'0x0',transactionHash:hash,blockHash}]} : null;
    return Response.json({jsonrpc:'2.0',id:1,result});
  };
  const {GET,POST}=await import('../src/app/api/ledger/route');
  const publicApi=await import('../src/app/api/track/[token]/route');
  const {ledger}=await import('../src/lib/ledger');
  const send = (body: unknown, origin='http://localhost:3100') => POST(new Request('http://localhost:3100/api/ledger',{method:'POST',headers:{host:'localhost:3100',origin,'content-type':'application/json'},body:JSON.stringify(body)}));
  try {
    assert.equal((await send({action:'settings',recipient})).status,200);
    const created=await send({action:'create',customer:'API acceptance test',description:'Isolated test request',amount:'1.000001',payer});
    assert.equal(created.status,200); const state=await created.json(); const row=state.requests[0];
    assert.equal(row.afterBlock,100); assert.equal(row.status,'awaiting');
    assert.equal((await send({action:'note',id:row.id,text:'Never expose this note'})).status,200);
    const context={params:Promise.resolve({token:row.token})};
    const publicGet=await publicApi.GET(new Request('http://localhost:3100/api/track/'+row.token,{headers:{host:'localhost:3100'}}),context);
    const publicData=await publicGet.json();assert.ok(!('notes' in publicData));assert.ok(!('customer' in publicData));
    const publicMatch=()=>publicApi.POST(new Request('http://localhost:3100/api/track/'+row.token,{method:'POST',headers:{host:'localhost:3100',origin:'http://localhost:3100','content-type':'application/json'},body:JSON.stringify({transactionHash:hash})}),context);
    assert.equal((await publicMatch()).status,200);assert.equal((await publicMatch()).status,200);
    const refreshed=await GET(new Request('http://localhost:3100/api/ledger',{headers:{host:'localhost:3100'}}));
    const saved=await refreshed.json(); assert.equal(saved.requests[0].status,'received'); assert.equal(saved.requests[0].notes.length,1);
    assert.equal(ledger().tracking(row.token)?.transactionHash,hash);
    assert.ok(!JSON.stringify(ledger().tracking(row.token)).includes('Never expose'));
    assert.equal((await send({action:'import',label:'Already used',amount:'1.000001',transactionHash:hash})).status,409);
    assert.equal((await send({action:'settings',recipient},'https://untrusted.example')).status,403);
    assert.equal((await send({action:'note',id:row.id,text:'x'.repeat(9000)})).status,413);
    assert.equal((await send({action:'create',customer:'Invalid',description:'Invalid',amount:'1',payer:recipient})).status,400);
  } finally { globalThis.fetch=originalFetch;ledger().db.close();delete process.env.PAYTRACE_DB_PATH;rmSync(dir,{recursive:true,force:true}); }
});
