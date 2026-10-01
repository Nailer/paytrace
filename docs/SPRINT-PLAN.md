# PayTrace → LaunchProof sprint plan

Owner: Nailer. Start: October 1, 2026. PayTrace is built first; LaunchProof implementation starts after PayTrace acceptance.

## Product promise

PayTrace connects a payment request, a Monad transfer and a provider payout record. It tells operators what is known, what is unknown and what needs action. Onchain settlement never implies bank receipt.

## Design direction

Warm ivory surfaces, ink navigation, teal actions, generous spacing, DM Sans body and Manrope headings. Status includes text and icon as well as color. Desktop sidebar and compact mobile navigation; tables turn into compact records. Payment details use a side sheet, full-screen on mobile. Keyboard interaction, visible focus, reduced-motion support, no hidden essentials on small screens. Charts represent actual selected demo records, never invented performance claims.

## Sprint 1: interface and workflow prototype

- [ ] Responsive overview, payment list, exception inbox, activity, connections.
- [ ] Create payment request with validation and local persistence.
- [ ] Search, status filtering, time range, CSV export.
- [ ] Detail timeline and customer tracking preview.
- [ ] Explicitly simulated receipt/payout scenarios; duplicate-event protection.
- [ ] Desktop and mobile browser verification, build, typecheck and domain tests.

Acceptance: request → simulated transfer → amount match or exception → simulated payout → tracking view. Every demo surface identifies sample data. Refresh preserves records. No wallet needed.

## Sprint 2: persistent service and Monad receipts

Server-owned relational ledger; authentication and tenant isolation before public write access; payment amounts as integer token units; immutable, idempotent event ingestion; transaction + log index uniqueness. Verify chain ID, successful receipt, allowlisted token contract, recipient, amount and confirmations. Explicit manual transaction linking first, then bounded indexing with checkpoints. No arbitrary RPC URL from the browser. Add testnet transaction evidence without exposing signing keys.

Acceptance: a real testnet transfer can be matched once to the correct request. Wrong recipient/token/network and repeated transaction evidence cannot falsely settle another request. Pending/failed RPC reads show unknown, not zero or success.

## Sprint 3: provider integration

Choose a provider only after confirming access and supported Monad routes. Use sandbox credentials, verify webhook signatures and timestamps, deduplicate event IDs, handle out-of-order events and payout returns. Add second adapter only after one is real. Simulation remains isolated from genuine records. Credentials stay server-side; customer details stay out of public URLs and onchain metadata.

User checkpoint: provider account approval or credentials, only when code is ready to use them. Supply exact beginner instructions then. Never ask for seed phrases or private keys.

## Sprint 4: release

Authenticated hosted operator workspace, unguessable read-only customer tracking tokens, data minimization, persistent managed database, integration tests, accessibility/mobile review, loading/error/empty states, deployment verification, demo recording, architecture and limitation documentation. Hackathon deadline listed as Oct 13; exact submission cutoff and eligibility still need portal verification. No claim that sandbox completion proves bank receipt.

## Sprint 5: LaunchProof

Separate repository. Begin with one known OpenZeppelin proxy/ownership pattern. User-specified expected owner and upgrade authority → block-specific chain reads → passed/failed/unsupported checks → saved report → drift comparison. Include two demonstrator contracts (unsafe configuration and corrected configuration), timelock/admin checks within supported scope. Unsupported is not safe; a passing configuration report is not a security audit. Read-only checks first; signing/deployment checkpoint later.

## Working agreement

Perform routine setup, coding and checks autonomously. Pause only for necessary user-only access, wallet signatures, account approvals or product decisions that cannot safely be inferred. Explain the precise action, why it is needed, and how to verify success in beginner-friendly steps. Keep both repositories private initially. Do not modify the existing BNB project in the original workspace.
