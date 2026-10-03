# PayTrace demo video — approximately 3 minutes

Record the working `/` workspace and a real customer checkout. Do not use `/demo` or present unit-test fixtures as transactions.

## Preparation

The wallet payment scene is recorded by the owner; see [Recording the wallet payment segment](DEMO-WALLET-SEGMENT.md) for the shot list and handoff rules.

- Keep the production build running (`npm run build`, then `npm start`).
- Use a browser with your Ethereum-compatible wallet. The in-app preview may not contain a wallet provider.
- Have two accounts: a receiving wallet and a payer wallet with test USDC and enough test MON for gas.
- Save the receiving address. Create a request for 1 test USDC with the payer address before sending anything.
- Open the customer checkout in another tab. Keep the merchant workspace visible in a separate tab.
- Complete a rehearsal using a separate request. For the recording, create a fresh request and fresh transfer.
- Hide unrelated tabs, passwords, recovery phrases and hosting credentials.

## 0:00–0:25 — The problem

“Receiving a blockchain transaction is easy. Knowing which customer request it belongs to, whether the amount is correct and whether it has finalized takes work. PayTrace gives both sides a clear payment trail on Monad.”

Show the merchant workspace and the clean separation between requests and historical funding.

## 0:25–0:55 — A real request

Create a request, explain the amount and expected payer, and open its checkout. Point out that the request details are fixed and internal notes do not appear on the customer page.

“Each payment has a purpose, an expected sender and a precise amount.”

## 0:55–1:40 — Pay and verify

On checkout, click Pay with your wallet. Review and approve the exact testnet transfer yourself. Show the real transaction hash and confirmation progress. If the browser lacks a wallet provider, send the exact transfer through your wallet and use Already sent it? to paste its hash.

“Funds move directly between wallets. PayTrace checks the actual USDC transfer event, the sender and recipient, the amount and finalization.”

Wait for the actual Received result. Never cut to a fabricated result. If the network is delayed, disclose that and demonstrate verification again.

## 1:40–2:15 — Close the loop

Return to the merchant workspace and show the automatically refreshed status. Open the customer receipt, download the evidence or print the receipt. Export the ledger CSV.

“The same transfer can’t pay two requests. Both sides can follow the evidence instead of exchanging payment screenshots.”

## 2:15–2:40 — Explain exceptions

Show Needs review if a genuine failed match exists. Otherwise explain the rule using the in-app guide rather than inventing a problem. Old transfers, incorrect amounts and wrong senders cannot automatically close a request. Acknowledgement does not change payment status.

## 2:40–3:00 — Close honestly

“PayTrace is a noncustodial payment tracking workflow on Monad testnet: request, checkout, verification and receipt. The current release is a single-workspace application; test tokens have no monetary value and bank payouts are outside this demo.”

If hosted, show the actual public URL. If recorded locally, say it is the locally running production build. Do not claim public hosting before deployment.
