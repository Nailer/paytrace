import { ledger } from '@/lib/ledger';
import { tokenAmount } from '@/lib/payments';
import { MONAD_TESTNET } from '@/lib/chain-types';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = { title: 'Payment tracking · PayTrace', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function Tracking({ params }: { params: Promise<{token:string}> }) {
  const { token } = await params, row = ledger().tracking(token);
  if (!row) notFound();
  return <div className="verify-shell"><header className="verify-header"><span className="verify-brand">paytrace.</span><span>Payment tracking · Monad testnet</span></header><main className="live-tracking"><div className="eyebrow">EVERY STEP, IN VIEW</div><h1>{row.status === 'received' ? 'Payment received.' : 'Your payment request.'}</h1><p>{row.description}</p><section className="card"><strong className="live-tracking-amount">{tokenAmount(row.amount)}<small>test USDC</small></strong><span className={`live-status ${row.status}`}>{row.status === 'received' ? 'Verified onchain' : 'Awaiting payment'}</span><dl><dt>Send on</dt><dd>Monad Testnet · chain {MONAD_TESTNET.chainId}</dd><dt>Supported USDC contract</dt><dd><code>{MONAD_TESTNET.usdc}</code></dd><dt>Receiving wallet</dt><dd><code>{row.recipient}</code></dd><dt>Provider payout</dt><dd>Not connected</dd></dl>{row.transactionHash ? <a href={`${MONAD_TESTNET.explorer}/tx/${row.transactionHash}`} target="_blank" rel="noreferrer">View verified transaction ↗</a> : <p>Send the exact amount from the payer wallet agreed with the requester. Share the transaction hash with them so they can verify and record it.</p>}</section><p>Test tokens have no monetary value. This page updates when the requester verifies a transfer. Reload to see the latest status.</p></main></div>;
}
