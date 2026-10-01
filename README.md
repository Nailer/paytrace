# PayTrace

Every payment, accounted for.

A Monad testnet payment ledger with a responsive interface, persistent SQLite storage and real USDC receipt verification. Built for the Metropolis payment-operations project.

## Working today

- `/` is the functional workspace. It starts empty; no fictional customers or receipts are seeded.
- Save a receiving wallet, create payment requests with an expected payer and exact USDC amount, add internal notes, and open per-request tracking pages.
- Verify a payment transaction against Circle’s test USDC contract, recipient, payer, exact amount, receipt success, canonical block and finalized block coverage.
- Only transfers in blocks after a request’s creation checkpoint can pay it. Each transfer event can be assigned once across payment requests and historical funding receipts.
- Import historical funding independently. This does not mark a customer request paid.
- Requests, notes, receipts and duplicate claims survive restarts in `.data/paytrace.sqlite`. Browser storage is not the ledger.
- `/verify` is a standalone read-only inspector. `/demo` preserves the earlier, explicitly simulated design prototype.

A user-supplied real 20 test USDC transfer has been verified and imported into the local database. User-specific wallet addresses and transaction evidence are not committed to this repository.

## Run locally

Use Node **24+** (built-in `node:sqlite`) and npm:

```sh
npm ci
npm run dev
```

Open [PayTrace](http://127.0.0.1:3100). Production build for local operation:

```sh
npm run build
npm start
```

Validation:

```sh
npm test
npm run typecheck
npm run build
```

Set `PAYTRACE_DB_PATH` to an absolute file path to use another persistent database location. Stop the app before copying the database and its WAL sidecars for a file-level backup. Do not commit these files. An ephemeral/serverless filesystem is not suitable for this storage architecture.

## Access and current boundaries

This is a **single-operator local application**, not yet a hosted service. Development and production scripts bind to loopback. The ledger API rejects non-loopback Host headers and cross-origin browser requests. Do not place it behind a public proxy: authentication, tenant isolation and deployment controls remain to be implemented. Host checks are defense in depth, not user authentication.

Tracking URLs are generated with 192-bit random tokens; anyone with the link can read the requested amount, description, receiving wallet and payment status. They do not expose customer names or internal notes. Links currently work on the same computer; they are not internet-accessible customer links yet.

Payment verification is initiated by pasting a transaction hash. There is no background wallet indexer or wallet signing flow yet. An onchain receipt means **received onchain**, not provider payout completion or bank receipt. Bank/fiat provider integrations are not connected, and live screens provide no simulated settlement buttons. Test USDC has no monetary value.

Evidence is checked against the configured public RPC, not independently validated by a consensus client. Public rate limits can delay checks; failures leave payments unchanged. Multiple incoming events require review and are not automatically summed.

## Next sprint

Hosted authentication and persistent deployment; wallet-assisted test payments; background reconciliation; signed provider webhook adapters once a real provider sandbox is available; shareable customer tracking and operational monitoring. LaunchProof remains the second project, after PayTrace's working flow is complete.

References: [Monad documentation](https://docs.monad.xyz/ai/current-facts), [Circle’s Monad USDC announcement](https://www.circle.com/blog/now-available-usdc-cctp-wallets-and-contracts-on-monad), [initial sprint plan](docs/SPRINT-PLAN.md).
