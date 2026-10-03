# PayTrace submission copy

## One sentence

PayTrace connects a Monad USDC payment request to a customer checkout and a verifiable receipt, helping operators distinguish confirmed payments from mismatches.

## The problem

A wallet transaction does not by itself explain which customer request it pays. Operators must check the token, sender, recipient, amount and finalization, and avoid accidentally counting the same transfer twice. Customers need a clear result rather than a screenshot exchange.

## What we built

A merchant creates an immutable request with an expected payer and receiving wallet. The customer sends directly through a compatible wallet or submits a transaction hash. The server checks the actual test USDC event and finalized chain evidence before recording the payment. The merchant can inspect exceptions, keep private notes, cancel unpaid requests and export the ledger. Customers can view their status and download or print a receipt.

## Monad integration

The app uses Monad Testnet RPC and Circle's test USDC contract, verifies chain ID 10143 and checks canonical/finalized block evidence. Transfers go directly between user-controlled wallets. No PayTrace smart contract or token approval is required.

## What has been demonstrated

A real historical funding receipt and a fresh 1 test USDC request payment have been verified against the live network. Exact amounts, event uniqueness, sender checks, cancellation, API privacy and other behaviors have automated coverage. See the release checklist for the current acceptance status.

## Current scope

Guest-first request preparation and password-free wallet sign-in with isolated workspaces, Monad testnet payments, persistent Turso storage and an injected-wallet checkout. Each account has one workspace; team roles, account linking and email recovery are not included. This is not a fiat settlement service or unattended indexer. Verification retries while checkout is open; a manual hash fallback supports recovery. Deployed on Vercel with persistent Turso storage: https://paytrace-tau.vercel.app. Public source: https://github.com/Nailer/paytrace.

## Add only after verified

- Final video URL.
- Exact official track and submission fields.

Never replace missing assets with invented URLs, adoption numbers or performance claims.
