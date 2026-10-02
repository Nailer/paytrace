# Sprint 2 checkpoint: real chain evidence

Implemented a separate read-only `/verify` page and `/api/verify` endpoint. Demo records are untouched by chain evidence. The verifier checks network ID, receipt status, canonical block identity, finalized range, Circle test USDC contract, indexed recipient and exact amount. It returns each transfer’s unique chain/transaction/log-index identifier. Multiple candidates require review, and mints are identified rather than presented as customer payments.

## Validation

- 19 automated tests pass.
- TypeScript and production build pass.
- Public RPC returned chain ID `0x279f` (10143).
- Public log queries enforce a 100-block range; the smoke script respects that limit.
- A bounded scan of 2,000 recent blocks found no suitable public transfer; no positive live verification is claimed.
- Local API rejects malformed input with HTTP 400 and no-store response headers.
- Browser prototype previously demonstrated the complete simulated request/receipt/payout/return/notes journey and persistence across refresh.

## User checkpoint

Receive test USDC on Monad testnet using https://faucet.circle.com. Select USDC and Monad Testnet, paste an address from a wallet you control, and request test tokens. Share the transaction hash (or explorer link), recipient address and received amount. This gives the verifier actual evidence to check. No seed phrase, private key, paid asset or mainnet transfer is needed.

## Remaining work

Positive live acceptance test, authenticated persistent invoice ledger, evidence assignment with replay prevention, provider sandbox access and signed webhooks, hosted tracking, public deployment and release preparation. LaunchProof remains planning-only until PayTrace is accepted. A verified testnet transfer is not a fiat payout, proof of invoice ownership or bank receipt.
