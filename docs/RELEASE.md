# PayTrace release candidate

## Implemented

Merchant ledger and customer checkout; exact direct USDC wallet transfer; supported-network switching and expected-account validation; manual hash fallback; pending-verification retries; responsive checkout journey; shared server-owned payment status; review inbox; cancellation; private notes; downloadable evidence; printable receipt; CSV export; hosted single-operator authentication; security headers; consistent database backup; Docker packaging; user guide and demo walkthrough.

## Verified

- 37 automated tests, including public checkout API and privacy, wrong wallet, cancelled requests, immutable evidence, exact amounts, persistence, session tampering and expiry, origin protections, review acknowledgement and CSV safety.
- Production build and TypeScript checks.
- Existing real 20 test USDC funding evidence retained across the production-server restart.
- Isolated production HTTP flow against the live Monad RPC: request creation; checkout read; rejection of a pre-request real transfer; review item creation; request remains unpaid; cancellation closes checkout.

## Release gates still open

- Real-payment verification has passed: the prepared 1 test USDC request is Received and its transaction was rechecked against the live RPC. Actual wallet-popup footage and receipt-download visual acceptance remain to be captured.
- Visual acceptance of final checkout and updated merchant screens. Browser automation hit a blocked internal error page after the server restart; this must be checked after the user reopens the HTTP app.
- Public hosting. The owner currently has no hosting account. Docker configuration is prepared, not deployed or container-tested.

## Deliberate scope

Monad testnet USDC, one merchant workspace, one persistent Node process. No fiat settlement, provider payouts, automated refunds, multi-tenant accounts, cross-chain assets or unattended chain indexer. Verification retries occur while checkout is open, and do not continue as a background server worker. The former `/demo` route is archived prototype work, not operational data.

Do not call the release fully accepted or publicly deployed until the open gates have evidence.
