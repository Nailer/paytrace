# Functional ledger milestone — 1 October 2026

The default workspace now uses a server-owned SQLite ledger, with no seeded demo records. The earlier prototype remains explicitly separate at `/demo`.

Implemented: receiving wallet settings; payment requests with immutable recipient, expected payer, amount and block checkpoint; exact finalized USDC receipt matching; atomic evidence uniqueness across funding and requests; historical funding import; internal notes; opaque tracking routes that omit customer names and notes; mobile and desktop views; strict loopback/cross-origin API restrictions for local operation.

A real user-supplied transfer of 20 test USDC was verified against the live Monad testnet RPC and saved as historical funding. It is not represented as a paid customer invoice. The database and user evidence are excluded from Git.

Validation: 27 automated tests pass, including a full route-handler flow in an isolated temporary database with deterministic RPC fixtures; restart persistence; duplicate claims; wrong sender, old transfer, nonfinal and mismatched evidence rejection; tracking privacy; origin and request-size controls. The production build and TypeScript checks pass. Desktop and 390px mobile views were inspected; mobile content width equals viewport width.

Remaining: a fresh customer-payment transaction has not yet been signed and exercised end to end onchain; hosted authentication, internet sharing, wallet-assisted sending, background reconciliation and actual payout-provider integration are future work. The current tracking pages run locally and are not public internet links. Do not deploy this unauthenticated local workspace behind a public proxy.

An attempted separate production acceptance server was blocked by automatic approval review's usage limit, not a security determination. Existing-server inspection and isolated route tests remained available.
