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

## Next milestones

Server-owned persistent ledger and authentication, real Monad testnet receipt verification, signed provider webhooks, secure public tracking links, deployment and hackathon materials. Provider credentials and signing keys are never committed.
