import test from 'node:test';
import assert from 'node:assert/strict';
import { Wallet } from 'ethers';
import { Ledger } from '../src/lib/ledger';
import { walletChallenge, verifyWalletChallenge } from '../src/lib/wallet-auth';
const origin='https://paytrace.example';
test('wallet authentication verifies ownership, binds browser/origin, prevents replay, and reopens the same workspace',async()=>{
 const db=new Ledger(':memory:'),wallet=Wallet.createRandom(),other=Wallet.createRandom();
 try {
  const challenge=await walletChallenge(db,wallet.address,origin);
  const input={id:challenge.id,signature:await wallet.signMessage(challenge.message)};
  await assert.rejects(verifyWalletChallenge(db,input,'a'.repeat(64),origin));
  await assert.rejects(verifyWalletChallenge(db,input,challenge.binding,'https://evil.example'));
  await assert.rejects(verifyWalletChallenge(db,{...input,signature:await other.signMessage(challenge.message)},challenge.binding,origin));
  const account=await verifyWalletChallenge(db,input,challenge.binding,origin);
  await assert.rejects(verifyWalletChallenge(db,input,challenge.binding,origin));
  const again=await walletChallenge(db,wallet.address,origin);
  const reopened=await verifyWalletChallenge(db,{id:again.id,signature:await wallet.signMessage(again.message)},again.binding,origin);
  assert.equal(reopened.id,account.id);
  const different=await walletChallenge(db,other.address,origin);
  const separate=await verifyWalletChallenge(db,{id:different.id,signature:await other.signMessage(different.message)},different.binding,origin);
  assert.notEqual(separate.id,account.id);
  assert.equal((await db.snapshot()).requests.length,0);
 }finally{db.db.close();}
});
test('expired challenges and simultaneous replay cannot create sessions',async()=>{
 const db=new Ledger(':memory:'),wallet=Wallet.createRandom();
 try {
 const expired=await walletChallenge(db,wallet.address,origin);
 await db.db.execute({sql:'UPDATE auth_challenges SET expires=0 WHERE id=?',args:[expired.id]});
 await assert.rejects(verifyWalletChallenge(db,{id:expired.id,signature:await wallet.signMessage(expired.message)},expired.binding,origin));
 const challenge=await walletChallenge(db,wallet.address,origin),input={id:challenge.id,signature:await wallet.signMessage(challenge.message)};
 const results=await Promise.allSettled([verifyWalletChallenge(db,input,challenge.binding,origin),verifyWalletChallenge(db,input,challenge.binding,origin)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 }finally{db.db.close();}
});
