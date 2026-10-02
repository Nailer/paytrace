import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ledger } from '../src/lib/ledger';
import type { ChainProof } from '../src/lib/chain-types';
import { requireLocal } from '../src/lib/local-access';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const recipient = '0x' + 'a'.repeat(40), payer = '0x' + 'b'.repeat(40);
async function setup() { const db = new Ledger(':memory:'); (await db.setRecipient(recipient)); const row = (await db.create({customer:'Client',description:'Design',amount:'1.123456',payer},100)); return {db,row}; }
function proof(): ChainProof { return { outcome:'verified',summary:'Verified',transactionHash:'0x'+'c'.repeat(64),chainId:10143,tokenAddress:'0x534b2f3A21130d7a60830c2Df862319e593943A3',recipient,expectedAmount:'1.123456',receivedAmount:'1.123456',blockNumber:101,blockHash:'0x'+'d'.repeat(64),finalizedThrough:102,checkedAt:new Date().toISOString(),transfers:[{evidenceId:'10143:tx:0',from:payer,to:recipient,amount:'1.123456',logIndex:0,isMint:false}] }; }
test('records verified payment and prevents evidence reuse across requests', async () => { const {db,row} = await setup(); (await db.match(row.id,proof())); assert.equal((await db.request(row.id)).status,'received'); const second=(await db.create({customer:'Other',description:'Design',amount:'1.123456',payer},100)); await assert.rejects(async()=>(await db.match(second.id,proof())),/counted twice/); assert.equal((await db.request(second.id)).status,'awaiting'); db.db.close(); });
test('historical funding cannot pay an invoice or be imported twice',async ()=>{const {db,row}=await setup(); (await db.importFunding(proof(),'Funding')); await assert.rejects(async()=>(await db.match(row.id,proof())),/counted twice/); await assert.rejects(async()=>(await db.importFunding(proof(),'Again')),/counted twice/); assert.equal((await db.snapshot()).funding.length,1); db.db.close();});
test('rejects pre-request evidence, incorrect sender and mint',async ()=>{const {db,row}=await setup(); await assert.rejects(async()=>(await db.match(row.id,{...proof(),blockNumber:100})),/predates/); const wrong=proof();wrong.transfers[0].from=recipient;await assert.rejects(async()=>(await db.match(row.id,wrong)),/payer/);const mint=proof();mint.transfers[0].isMint=true;await assert.rejects(async()=>(await db.match(row.id,mint)),/payer/);assert.equal((await db.request(row.id)).status,'awaiting');db.db.close();});
test('rejects mismatches and nonfinal receipts without claiming evidence',async ()=>{const {db,row}=await setup();await assert.rejects(async()=>(await db.match(row.id,{...proof(),outcome:'not_finalized'})));await assert.rejects(async()=>(await db.match(row.id,{...proof(),expectedAmount:'2'})),/match/);(await db.match(row.id,proof()));assert.equal((await db.request(row.id)).status,'received');db.db.close();});
test('tracking hides names and notes; changing wallet preserves existing request',async ()=>{const {db,row}=await setup();(await db.note(row.id,'Private customer information'));(await db.setRecipient(payer));const track=(await db.tracking(row.token))!;assert.equal(track.recipient,recipient);assert.ok(!('customer' in track));assert.ok(!('notes' in track));assert.equal((await db.tracking('bad')),null);assert.equal((await db.request(row.id)).notes.length,1);db.db.close();});
test('database survives closing and reopening',async ()=>{const dir=mkdtempSync(join(tmpdir(),'paytrace-ledger-'));try { const path=join(dir,'ledger.sqlite'); const first=new Ledger(path);(await first.setRecipient(recipient));(await first.importFunding(proof(),'Funding'));first.db.close();const second=new Ledger(path);assert.equal((await second.snapshot()).recipient,recipient);assert.equal((await second.snapshot()).funding.length,1);await assert.rejects(async()=>(await second.importFunding(proof(),'Duplicate')),/counted twice/);second.db.close(); }finally{rmSync(dir,{recursive:true,force:true});}});
test('local access blocks remote hosts and cross-site requests',async ()=>{assert.doesNotThrow(()=>requireLocal(new Request('http://localhost:3100/api/ledger',{headers:{host:'localhost:3100',origin:'http://localhost:3100'}})));assert.throws(()=>requireLocal(new Request('https://evil.example/api/ledger',{headers:{host:'evil.example'}})),/local-only/);assert.throws(()=>requireLocal(new Request('http://localhost:3100/api/ledger',{headers:{host:'localhost:3100',origin:'https://evil.example'}})),/workspace/);});

test('cancellation closes checkout and cannot change a paid request',async ()=>{const {db,row}=await setup();(await db.cancel(row.id));assert.equal((await db.tracking(row.token))?.status,'cancelled');await assert.rejects(async()=>(await db.match(row.id,proof())),/no longer/);const paid=(await db.create({customer:'Client',description:'Design',amount:'1.123456',payer},100));(await db.match(paid.id,proof()));await assert.rejects(async()=>(await db.cancel(paid.id)),/awaiting/);db.db.close();});
test('review acknowledgement never marks a request paid; successful match resolves its reviews',async ()=>{const {db,row}=await setup();(await db.review(row.id,proof().transactionHash,'Wrong amount'));(await db.review(row.id,proof().transactionHash,'Repeated'));assert.equal((await db.snapshot()).reviews.length,1);(await db.resolveReview((await db.snapshot()).reviews[0].id));assert.equal((await db.request(row.id)).status,'awaiting');(await db.review(row.id,'0x'+'e'.repeat(64),'Wrong sender'));(await db.match(row.id,proof()));assert.ok((await db.snapshot()).reviews.every(r=>r.resolved));db.db.close();});

test('unresolved review items are never hidden by the history limit',async ()=>{const {db}=await setup();for(let i=0;i<6;i++){const row=(await db.create({customer:'Batch '+i,description:'Review coverage',amount:'1',payer},100));for(let j=0;j<20;j++)(await db.review(row.id,'0x'+BigInt(i*20+j+1).toString(16).padStart(64,'0'),'Unresolved'));}assert.equal((await db.snapshot()).reviews.filter(r=>!r.resolved).length,120);db.db.close();});

test('login budgets survive reopening and isolate separate client keys',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'paytrace-login-'));
  try {
    const path=join(dir,'ledger.sqlite');const first=new Ledger(path);
    for(let i=0;i<5;i++)await first.takeLoginAttempt('client-a',1000);
    first.db.close();const second=new Ledger(path);
    await assert.rejects(second.takeLoginAttempt('client-a',1001),/Too many/);
    await second.takeLoginAttempt('client-b',1001);
    await second.takeLoginAttempt('client-a',901001);
    second.db.close();
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('a failed write rolls back its evidence claim',async()=>{
  const {db,row}=await setup();
  await db.db.execute("CREATE TRIGGER reject_payment BEFORE UPDATE ON requests BEGIN SELECT RAISE(ABORT, 'write failed'); END");
  await assert.rejects(db.match(row.id,proof()),/write failed/);
  assert.equal((await db.request(row.id)).status,'awaiting');
  await db.db.execute('DROP TRIGGER reject_payment');
  await db.match(row.id,proof());
  assert.equal((await db.request(row.id)).status,'received');db.db.close();
});
