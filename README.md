# PayTrace

Every payment, accounted for.

A UI-first Monad payment operations workspace, built for Metropolis. PayTrace links requests, transfers and payout evidence so operators can understand exceptions and customers can follow their payments.

## Current milestone

Local demonstration workspace. All initial customers, transfers, providers and payouts are fictional. Data is stored on this browser/device. Creating a request does not send an email or move funds. Provider completion is not independent confirmation of recipient bank receipt. This is not yet a hosted multi-user payments service.

## Run

Node 22+ and npm:

```sh
npm ci
npm run dev
```

Open http://localhost:3100.

```sh
npm test
npm run typecheck
npm run build
```

See [the sprint plan](docs/SPRINT-PLAN.md). Payment amounts are reconciled using integer token units, demo transitions are validated and duplicate event IDs are ignored. Status charts and summaries are derived from the current records.

## Read-only testnet verification

Open `/verify` to inspect a real Circle test USDC transaction on Monad testnet. Supply a transaction hash, expected recipient and expected amount. The server verifies chain ID 10143, receipt success, canonical block hash, finalized-block coverage, the supported token contract and exact ERC-20 transfer evidence. It does not assign invoices or alter demo records. Mints are labelled; multiple candidate events require review. Missing receipts remain unknown.

The public RPC endpoint was reached successfully. A positive live USDC verification is still awaiting a test transaction; no suitable transfer was found in a bounded scan of 2,000 recent blocks. Nineteen automated tests and the production build pass. Invalid input was verified to return HTTP 400.

Network reference: [Monad developer documentation](https://docs.monad.xyz/ai/current-facts). Token reference: [Circle’s Monad USDC announcement](https://www.circle.com/blog/now-available-usdc-cctp-wallets-and-contracts-on-monad).

## Next milestones

Complete live receipt acceptance testing, then add a server-owned persistent ledger and authentication, signed provider webhooks, secure public tracking links, deployment and hackathon materials. Provider credentials and signing keys are never committed. The verifier’s in-memory request budget needs distributed rate limiting before a public production deployment.
