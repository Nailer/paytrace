'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, FileCheck2 } from 'lucide-react';
import { DRAFT_KEY, EMPTY_DRAFT, validateDraft, type RequestDraft } from '@/lib/request-draft';
export function RequestStarter() {
  const [draft, setDraft] = useState<RequestDraft>(EMPTY_DRAFT);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [signedIn, setSignedIn] = useState(false), [review, setReview] = useState(false);
  useEffect(() => {
    try { const saved = sessionStorage.getItem(DRAFT_KEY); if (saved) { setDraft(validateDraft(JSON.parse(saved))); setReview(true); } } catch { /* An incomplete draft is safe to discard. */ }
    setReady(true);
    void fetch('/api/ledger', {cache:'no-store'}).then(async r => { if (r.ok) { setSignedIn(true); const data = await r.json(); setDraft(old => ({...old, recipient:old.recipient || data.recipient || ''})); } }).catch(() => {});
  }, []);
  function change(key: keyof RequestDraft, value: string) { setDraft(old => ({...old, [key]:value})); setReview(false); }
  async function publish() {
    setError(''); setBusy(true);
    try {
      const value = validateDraft(draft);
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(value));
      if (!signedIn) { location.assign('/login?next=start'); return; }
      const res = await fetch('/api/ledger', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...value, action:'create'})});
      const data = await res.json();
      if (res.status === 401) { location.assign('/login?next=start'); return; }
      if (!res.ok) throw Error(data.error || 'Could not create your request.');
      sessionStorage.removeItem(DRAFT_KEY);
      location.assign('/workspace');
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); } finally { setBusy(false); }
  }
  return <main className="account-shell"><Link href="/" className="verify-brand">paytrace.</Link><div className="account-layout"><aside className="account-story"><span className="eyebrow">START WITHOUT AN ACCOUNT</span><h1>Your next payment starts here.</h1><p>Prepare the details and review your request first. Sign in only when you’re ready to save it and get a checkout link.</p><div className="account-benefit"><FileCheck2/><span>Try the real request workflow</span></div><div className="account-benefit"><ShieldCheck/><span>No transfer is made when you prepare a request</span></div><p><Link href="/verify">Just checking a transaction? Verify it freely →</Link></p><small>Draft stays in this browser tab during sign-in. It is not a live checkout until you publish it.</small></aside><section className="card account-card"><span className="eyebrow">{review?'02 · REVIEW & SAVE':'01 · PAYMENT DETAILS'}</span><h2>{review?'Ready when you are.':'Prepare your request.'}</h2>{review?<><p>{draft.description}</p><dl className="draft-preview"><dt>Customer / reference</dt><dd>{draft.customer}</dd><dt>Amount</dt><dd>{draft.amount} test USDC</dd><dt>Receiving wallet</dt><dd>{draft.recipient}</dd><dt>Expected payer</dt><dd>{draft.payer}</dd></dl><p>{signedIn?'Save this request to your workspace and create its customer checkout.':'Your draft is ready. Sign in to keep it in your private workspace and create the shareable checkout.'}</p><p className="live-hint">The customer must pay after the request is published. This receiving address applies only to this request.</p><button className="button primary" disabled={busy} onClick={()=>void publish()}>{busy?'Working…':signedIn?'Publish payment request':'Continue to save request'}<ArrowRight size={16}/></button><button className="text-button" disabled={busy} onClick={()=>setReview(false)}>Edit details</button></>:<form onSubmit={e=>{e.preventDefault();setError('');try { const value=validateDraft(draft); sessionStorage.setItem(DRAFT_KEY,JSON.stringify(value));setDraft(value);setReview(true); } catch(e){setError(e instanceof Error?e.message:'Check your details.');}}}>{([['customer','Customer or reference','e.g. Maple Studio'],['description','What is this payment for?','e.g. Design milestone'],['amount','Amount in test USDC','1.00'],['recipient','Receiving wallet','0x…'],['payer','Expected payer wallet','0x…']] as const).map(([key,label,placeholder])=><label key={key}>{label}<input value={draft[key]} onChange={e=>change(key,e.target.value)} required maxLength={key==='customer'?80:key==='description'?240:80} inputMode={key==='amount'?'decimal':'text'} placeholder={placeholder} disabled={!ready || busy}/></label>)}<button className="button primary" disabled={!ready}>Review request<ArrowRight size={16}/></button></form>}{error&&<p className="live-form-error" role="alert">{error}</p>}<p className="account-links"><Link href="/workspace">Open existing workspace</Link> · <Link href="/guide">How it works</Link></p></section></div></main>;
}
