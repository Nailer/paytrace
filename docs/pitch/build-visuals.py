import textwrap, subprocess, os
from PIL import Image, ImageDraw, ImageFont, ImageOps
W,H=1920,1080
BG=(248,248,245); G=(42,92,69); DK=(30,50,40); MU=(95,110,100)
def F(sz,b=False):
    for p in (['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'] if b else ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']):
        if os.path.exists(p): return ImageFont.truetype(p,sz)
    return ImageFont.load_default()
photo=Image.open('photo.webp').convert('RGB')
def circ(im,d):
    im=ImageOps.fit(im,(d,d)); m=Image.new('L',(d,d),0); ImageDraw.Draw(m).ellipse((0,0,d,d),fill=255); out=Image.new('RGBA',(d,d)); out.paste(im,(0,0),m); return out
shots={k:Image.open(k+'.png').convert('RGB') for k in ('home','verify','guide')}
def shot(k,w=1000):
    im=shots[k]; h=int(im.height*w/im.width); im=im.resize((w,h)); 
    bd=Image.new('RGB',(w+8,h+8),(210,218,212)); bd.paste(im,(4,4)); return bd
# scenes: (visual, title, [(caption, words)])
S=[
('intro','Meet the builder',[
 "Hi, I'm [Your name], founder and builder of PayTrace.",
 "I'm a full-stack blockchain developer with over five years of experience and a Computer Science degree.",
 "I've won multiple hackathons, worked as a senior developer at two fintech companies, and I'm an entrepreneur.",
 "I'm building PayTrace on my own, and I've shipped every layer: verification, checkout and the merchant workspace."]),
('problem','The problem',[
 "Here's what I kept seeing in fintech. Receiving a blockchain payment is easy. Knowing what it means is hard.",
 "Which customer was it for? Was the amount exact? Right token, right sender, and has it finalized?",
 "Today that means screenshots, block explorers and spreadsheets, and one mistake can count a transfer twice."]),
('home','The solution',[
 "PayTrace fixes that. A merchant creates a payment request with an exact amount and expected payer.",
 "The customer pays straight from their own wallet on Monad. PayTrace never holds funds."]),
('verify','The solution',[
 "Our server checks the real onchain USDC transfer: sender, recipient, exact amount and finalization.",
 "Only then is the request paid, and both sides get a receipt with the evidence.",
 "One transfer can never pay two requests, and mismatches go to a review inbox."]),
('why','Why I am building it',[
 "I'm building this because I've worked on the money side of fintech, and I know trust comes from a clear trail, not a promise.",
 "Stablecoin payments are growing, and merchants need accounting they can rely on."]),
('close','PayTrace',[
 "PayTrace: every payment, accounted for. Live on Monad testnet today at paytrace-tau.vercel.app. Thank you."]),
]
frames=[]; 
allw=sum(len(c.split()) for _,_,cs in S for c in cs)
TOTAL=118.0; per=TOTAL/allw
def wrap(d,t,f,wd):
    lines=[];cur=''
    for w in t.split():
        x=(cur+' '+w).strip()
        if d.textlength(x,font=f)>wd and cur: lines.append(cur);cur=w
        else: cur=x
    lines.append(cur); return lines
i=0
for vis,title,caps in S:
  for c in caps:
    im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
    d.text((80,60),'paytrace.',font=F(44,True),fill=G)
    d.text((W-80,70),title.upper(),font=F(24,True),fill=MU,anchor='ra')
    if vis=='intro':
        cp_=circ(photo,420); im.paste(cp_,(180,200),cp_); 
        t=["Full-stack blockchain developer","5+ years experience","Multiple-time hackathon winner","Senior developer at two fintechs","Entrepreneur","B.Sc. Computer Science"]
        for k,x in enumerate(t): d.text((680,220+k*68),'•  '+x,font=F(40,k==0),fill=DK)
    elif vis in('home','verify'):
        s=shot(vis,1150); im.paste(s,((W-s.width)//2,150))
    elif vis=='problem':
        for k,(x) in enumerate(["Which customer was it for?","Was the amount exact?","Right token? Right sender?","Has it finalized?"]):
            d.text((W//2,220+k*100),x,font=F(56,True),fill=DK if k%2==0 else G,anchor='ma')
    elif vis=='why':
        d.text((W//2,330),"Trust comes from a clear trail,",font=F(66,True),fill=DK,anchor='ma')
        d.text((W//2,430),"not a promise.",font=F(66,True),fill=G,anchor='ma')
    else:
        d.text((W//2,330),"Every payment, accounted for.",font=F(76,True),fill=G,anchor='ma')
        d.text((W//2,470),"paytrace-tau.vercel.app",font=F(48),fill=DK,anchor='ma')
        d.text((W//2,550),"Live on Monad testnet",font=F(34),fill=MU,anchor='ma')
    # caption bar
    f=F(40); lines=wrap(d,c,f,W-260); bh=len(lines)*58+40
    d.rectangle((0,H-bh-30,W,H),fill=(30,50,40))
    for k,l in enumerate(lines): d.text((W//2,H-bh-30+30+k*58),l,font=f,fill=(255,255,255),anchor='ma')
    fn=f'f{i:02d}.png'; im.save(fn); frames.append((fn,len(c.split())*per)); i+=1
with open('list.txt','w') as fh:
    for fn,dur in frames: fh.write(f"file '{fn}'\nduration {dur:.2f}\n")
    fh.write(f"file '{frames[-1][0]}'\n")
print(len(frames),sum(d for _,d in frames))
