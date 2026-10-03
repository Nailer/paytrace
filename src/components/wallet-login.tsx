'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowRight, Wallet, ShieldCheck, FileCheck2 } from 'lucide-react';
type Provider={request:(args:{method:string;params?:unknown[]})=>Promise<unknown>};
export function WalletLogin() {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[step,setStep]=useState(''),[resume,setResume]=useState(false);
  useEffect(()=>setResume(new URLSearchParams(location.search).get('next')==='start'),[]);
  async function signIn(){
    setBusy(true);setError('');setStep('Choose your wallet account…');
    try {
      const provider=(window as unknown as {ethereum?:Provider}).ethereum;
      if(!provider)throw Error('Open PayTrace in your wallet’s browser or a browser with an Ethereum-compatible wallet extension. Existing password accounts can use the link below.');
      const accounts=await provider.request({method:'eth_requestAccounts'}) as string[];
      if(!accounts?.[0])throw Error('Choose a wallet account to continue.');
      const call=async(body:Record<string,unknown>)=>{const response=await fetch('/api/wallet-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error);return data;};
      const challenge=await call({action:'challenge',address:accounts[0]});
      setStep('Approve the sign-in message in your wallet…');
      const encoded='0x'+Array.from(new TextEncoder().encode(challenge.message),(byte:number)=>byte.toString(16).padStart(2,'0')).join('');
      const signature=await provider.request({method:'personal_sign',params:[encoded,accounts[0]]});
      setStep('Opening your workspace…');
      await call({action:'verify',id:challenge.id,signature});
      location.assign(resume?'/start':'/workspace');
    }catch(e){setError((e as {code?:number}).code===4001?'Sign-in cancelled. Your draft is still here; try again whenever you’re ready.':e instanceof Error?e.message:'Could not sign in. Please try again.');}finally{setBusy(false);setStep('');}
  }
  return <main className="account-shell"><Link className="verify-brand" href="/">paytrace.</Link><div className="account-layout"><aside className="account-story"><span className="eyebrow">LESS SETUP. MORE CLARITY.</span><h1>Your wallet.<br/>Your workspace.</h1><p>One sign-in for new and returning merchants. No username, password or separate registration form.</p><div className="account-benefit"><ShieldCheck/><span>A signed message proves the wallet is yours</span></div><div className="account-benefit"><FileCheck2/><span>Keep your payment records in a private workspace</span></div><small>Signing in is free. It does not send tokens or grant token permissions.</small></aside><section className="card account-card"><span className="checkout-icon"><Wallet/></span><span className="eyebrow">{resume?'YOUR DRAFT IS READY':'WELCOME TO PAYTRACE'}</span><h2>{resume?'Save your work. Keep it yours.':'Continue with your wallet.'}</h2><p>{resume?'Sign in, then review and publish your prepared request.':'We create a workspace the first time you sign in. Use the same wallet to return to it.'}</p><button className="button primary" disabled={busy} onClick={()=>void signIn()}>{busy?step:'Continue with wallet'}{!busy&&<ArrowRight size={16}/>}</button>{error&&<p className="live-form-error" role="alert">{error}</p>}<p className="live-hint">Use a standard Ethereum-compatible wallet. On mobile, open this page inside your wallet browser. Keep access to this wallet: it is your sign-in method. Smart-contract wallet sign-in is not supported yet.</p><p className="account-links"><Link href="/start">Keep exploring without signing in →</Link></p><details className="account-links"><summary>Already have a password account?</summary><p>Wallet sign-in opens a separate workspace. Your existing records remain with your original sign-in.</p><Link href={resume?'/password-login?next=start':'/password-login'}>Use existing username and password</Link><Link href={resume?'/owner?next=start':'/owner'}>Original workspace access</Link></details></section></div></main>;
}
