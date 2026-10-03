import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft } from '../src/lib/request-draft';
import { Ledger } from '../src/lib/ledger';
const recipient='0x1111111111111111111111111111111111111111',payer='0x2222222222222222222222222222222222222222';
const draft={customer:' Client ',description:'Work',amount:'1.00',recipient,payer};
test('guest drafts validate exact amounts and distinct, nonzero wallets',()=>{
 assert.equal(validateDraft(draft).customer,'Client');
 for(const invalid of [{amount:'0'},{amount:'1.0000001'},{payer:recipient},{recipient:'0x'+'0'.repeat(40)},{customer:''}])assert.throws(()=>validateDraft({...draft,...invalid}));
});
test('publishing a draft uses its explicit wallet without changing workspace settings',async()=>{
 const db=new Ledger(':memory:');
 try {const account=await db.registerAccount('draftmerchant','Draft merchant','unused','unused');const scope=db.forWorkspace(account.id);const row=await scope.create(draft,100);assert.equal(row.recipient,recipient);assert.equal((await scope.snapshot()).recipient,'');assert.equal((await db.snapshot()).requests.length,0);await scope.setRecipient(payer);assert.equal((await scope.request(row.id)).recipient,recipient);}finally{db.db.close();}
});
