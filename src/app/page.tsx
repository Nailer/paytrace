import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, ShieldCheck, Wallet, FileCheck2, Link2 } from 'lucide-react';

export default function Home() {
  return <main className="marketing">
    <nav aria-label="Main navigation"><Link className="verify-brand" href="/">paytrace.</Link><div><Link href="/guide">How it works</Link><Link href="/login">Sign in</Link><Link className="button primary" href="/start">Get started<ArrowUpRight size={16}/></Link></div></nav>
    <section className="marketing-hero clear-hero">
      <div>
        <span className="eyebrow">USDC PAYMENT TRACKING FOR FREELANCERS & BUSINESSES</span>
        <h1>Send a payment link.<br/><span>Know when you’re paid.</span></h1>
        <p className="hero-explanation">PayTrace lets you request USDC, share a checkout link, and verify that the right payment reached your wallet—with a receipt for you and your customer.</p>
        <div className="hero-network"><span/>Live on Monad testnet · Test USDC only</div>
        <div className="marketing-actions"><Link className="button primary" href="/start">Create a payment request<ArrowUpRight size={18}/></Link><Link href="/verify">Check a transaction →</Link></div>
        <small className="hero-access">Start without an account. Sign in with your wallet when you’re ready to save.</small>
      </div>
      <aside className="marketing-preview hero-flow" aria-label="How a PayTrace payment works">
        <span className="eyebrow">HOW IT WORKS</span>
        <h2>From “please pay”<br/>to proof of payment.</h2>
        <ol>
          <li><span className="hero-step"><Link2 size={19}/></span><div><strong>1. You send a payment link</strong><p>Choose the amount, your receiving wallet and the customer’s wallet.</p></div></li>
          <li><span className="hero-step"><Wallet size={19}/></span><div><strong>2. Your customer pays</strong><p>They open the link and send USDC directly to you. No customer account needed.</p></div></li>
          <li><span className="hero-step"><CheckCircle2 size={19}/></span><div><strong>3. PayTrace checks the transfer</strong><p>The right token, wallets and amount must match before it’s marked received.</p></div></li>
        </ol>
        <div className="hero-outcome"><FileCheck2 size={22}/><div><strong>A verified receipt. A clear payment record.</strong><p>See what’s paid, what’s pending and what needs review.</p></div></div>
      </aside>
    </section>
    <section className="marketing-features" aria-label="Why use PayTrace">
      <article><ShieldCheck/><h2>Stop chasing payment screenshots.</h2><p>Check the actual transfer on Monad and keep the evidence with the payment request.</p></article>
      <article><Wallet/><h2>Payments go straight to your wallet.</h2><p>PayTrace never holds your funds. Your customer approves the transfer in their own wallet.</p></article>
      <article><FileCheck2/><h2>Keep your records in one place.</h2><p>Track requests, add private notes, download receipts and export your payment ledger.</p></article>
    </section>
    <footer><span>paytrace. Clarity in every transfer.</span><span>Testnet only. Test tokens have no monetary value.</span></footer>
  </main>;
}
