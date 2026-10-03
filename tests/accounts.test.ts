import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Ledger} from '../src/lib/ledger';
import {passwordHash} from '../src/lib/accounts';
import type {ChainProof} from '../src/lib/chain-types';
const recipient='0x'+'a'.repeat(40),payer='0x'+'b'.repeat(40);
const input={customer:'Private client',description:'Invoice',amount:'1',payer};
function proof():ChainProof{return {outcome:'verified',summary:'Verified',transactionHash:'0x'+'c'.repeat(64),chainId:10143,tokenAddress:'0x534b2f3A21130d7a60830c2Df862319e593943A3',recipient,expectedAmount:'1.000000',receivedAmount:'1.000000',blockNumber:101,blockHash:'0x'+'d'.repeat(64),finalizedThrough:102,checkedAt:new Date().toISOString(),transfers:[{evidenceId:'10143:shared:0',from:payer,to:recipient,amount:'1.000000',logIndex:0,isMint:false}]};}
test('workspaces isolate reads and all request mutations while checkout resolves its owner',async()=>{
 const root=new Ledger(':memory:');const a=root.forWorkspace(randomUUID()),b=root.forWorkspace(randomUUID());
 await root.setRecipient(recipient);const legacy=await root.create(input,100);
 await a.setRecipient(recipient);await b.setRecipient(payer);
 const row=await a.create(input,100);await a.note(row.id,'Private note');await a.review(row.id,proof().transactionHash,'Mismatch');
 assert.equal((await b.snapshot()).requests.length,0);assert.equal((await root.snapshot()).requests.length,1);
 for(const op of [()=>b.request(row.id),()=>b.note(row.id,'Attack'),()=>b.cancel(row.id),()=>b.match(row.id,proof()),()=>b.review(row.id,proof().transactionHash,'Attack')])await assert.rejects(op,/not found/);
 const review=(await a.snapshot()).reviews[0];await b.resolveReview(review.id);assert.equal((await a.snapshot()).reviews[0].resolved,false);
 assert.equal((await b.snapshot()).reviews.length,0);assert.equal((await a.snapshot()).recipient,recipient);
 const checkout=await root.forTracking(row.token);assert.equal(checkout.workspace,a.workspace);await checkout.match(row.id,proof());
 assert.equal((await a.request(row.id)).status,'received');assert.equal((await root.request(legacy.id)).status,'awaiting');
 const publicData=await root.tracking(row.token);assert.ok(!('notes' in publicData!));assert.ok(!('customer' in publicData!));
 await assert.rejects(root.forTracking('not-a-token'),/not found/);root.db.close();
});
test('historical funding and claims are isolated per workspace',async()=>{
 const root=new Ledger(':memory:'),a=root.forWorkspace(randomUUID()),b=root.forWorkspace(randomUUID());
 await a.setRecipient(recipient);await b.setRecipient(recipient);
 await a.importFunding(proof(),'Private funding');assert.equal((await b.snapshot()).funding.length,0);
 await assert.rejects(a.importFunding(proof(),'Duplicate'),/counted twice/);
 // Another merchant cannot block the legitimate merchant by claiming its public transaction first.
 const row=await b.create(input,100);await b.match(row.id,proof());assert.equal((await b.request(row.id)).status,'received');root.db.close();
});
test('account signup, sessions, recovery rotation and API tenant isolation',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'paytrace-accounts-'));process.env.PAYTRACE_DB_PATH=join(dir,'accounts.sqlite');process.env.PAYTRACE_PUBLIC_ORIGIN='https://accounts.example';process.env.PAYTRACE_SESSION_SECRET='s'.repeat(48);process.env.PAYTRACE_PASSWORD_HASH=passwordHash('original-owner-password');
 const session=await import('../src/app/api/session/route');const api=await import('../src/app/api/ledger/route');const {ledger}=await import('../src/lib/ledger');
 const req=(path:string,body?:unknown,cookie?:string)=>new Request('https://accounts.example'+path,{method:body?'POST':'GET',headers:{host:'accounts.example',origin:'https://accounts.example','content-type':'application/json',...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const create=async(username:string)=>{const r=await session.POST(req('/api/session',{action:'signup',username,name:username+' studio',password:'a-very-good-password'}));assert.equal(r.status,200);return {cookie:r.headers.get('set-cookie')!.split(';')[0],data:await r.json()};};
 try{
 const a=await create('merchant_a'),b=await create('merchant_b');assert.equal(a.data.recoveryCode.length,43);
 assert.equal((await session.POST(req('/api/session',{action:'signup',username:'MERCHANT_A',name:'Dup',password:'a-very-good-password'}))).status,409);
 await api.POST(req('/api/ledger',{action:'settings',recipient},a.cookie));
 assert.equal((await (await api.GET(req('/api/ledger',undefined,b.cookie))).json()).recipient,'');
 const la=await ledger().account('merchant_a');const scoped=ledger().forWorkspace(String(la!.id));const row=await scoped.create(input,100);
 assert.equal((await api.POST(req('/api/ledger',{action:'note',id:row.id,text:'Attack',workspace:String(la!.id)},b.cookie))).status,404);
 assert.equal((await api.GET(req('/api/ledger'))).status,401);
 const recovered=await session.POST(req('/api/session',{action:'recover',username:'merchant_a',recoveryCode:a.data.recoveryCode,password:'a-new-strong-password'}));assert.equal(recovered.status,200);const newCode=(await recovered.json()).recoveryCode;assert.notEqual(newCode,a.data.recoveryCode);
 assert.equal((await api.GET(req('/api/ledger',undefined,a.cookie))).status,401);
 assert.equal((await api.GET(req('/api/ledger',undefined,b.cookie))).status,200);
 assert.equal((await session.POST(req('/api/session',{action:'recover',username:'merchant_a',recoveryCode:a.data.recoveryCode,password:'another-good-password'}))).status,401);
 assert.equal((await session.POST(req('/api/session',{username:'merchant_a',password:'a-very-good-password'}))).status,401);
 assert.equal((await session.POST(req('/api/session',{username:'merchant_a',password:'a-new-strong-password'}))).status,200);
 const owner=await session.POST(req('/api/session',{action:'owner',password:'original-owner-password'}));assert.equal(owner.status,200);const ownerData=await (await api.GET(req('/api/ledger',undefined,owner.headers.get('set-cookie')!.split(';')[0]))).json();assert.equal(ownerData.requests.length,0);
 }finally{ledger().db.close();for(const k of ['PAYTRACE_DB_PATH','PAYTRACE_PUBLIC_ORIGIN','PAYTRACE_SESSION_SECRET','PAYTRACE_PASSWORD_HASH'])delete process.env[k];rmSync(dir,{recursive:true,force:true});}
});
