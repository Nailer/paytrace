const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path=require('path');
const jobs=[
 ['hook_0','card=hook&hide=s1,s2,s3,s4'],['hook_1','card=hook&hide=s2,s3,s4'],['hook_2','card=hook&hide=s3,s4'],['hook_3','card=hook&hide=s4'],['hook_4','card=hook'],
 ['intro_0','card=intro&hide=f2,f3'],['intro_1','card=intro&hide=f3'],['intro_2','card=intro'],
 ['rules_0','card=rules&hide=r2,r3'],['rules_1','card=rules&hide=r3'],['rules_2','card=rules'],
 ['monad_0','card=monad&hide=s2,s3'],['monad_1','card=monad&hide=s3'],['monad_2','card=monad'],
 ['built','card=built'],['mmside','card=mmside'],['end','card=end'],
 ['chip1','chip=Set the receiving wallet&n=1'],['chip2','chip=Create a payment request&n=2'],['chip3','chip=Share the checkout link&n=3'],
 ['chip4','chip=Customer pays from their wallet&n=4'],['chip5','chip=PayTrace verifies on Monad&n=5'],['chip6','chip=Proof anyone can check&n=6'],
 ['chip7','chip=Merchant sees it instantly&n=7'],['chip8','chip=Public verifier · no wallet needed&n=8'],
 ['badge10','badge=Verified ~10 s after approval'],
];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
for(const [n,qs] of jobs){await p.goto('file://'+path.resolve('cards.html')+'?'+qs);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(150);
 await p.screenshot({path:`png/${n}.png`,omitBackground:n.startsWith('chip')||n.startsWith('badge')});}
await b.close();})();
