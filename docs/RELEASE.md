# PayTrace testnet release — 2 October 2026

Live app: https://paytrace-tau.vercel.app
Public source: https://github.com/Nailer/paytrace

## Delivered and verified

- Vercel production deployment with remote Turso storage and private operator login.
- 42 automated tests and successful production build; GitHub CI passed for implementation commit afba397.
- Hosted login returns 200, unauthenticated ledger returns 401, cross-origin write returns 403.
- Receiving wallet saved in the hosted database and loaded by the live dashboard.
- Real earlier 1 test USDC transfer verified on the hosted service and saved as historical funding.
- Hosted request creation and public checkout work; customer names and private notes remain hidden.
- Earlier transfer rejected for a newly created request with 422; acceptance request cancelled successfully.
- Desktop dashboard and 390px mobile checkout visually inspected through the live site.
- Production-only database configured after detecting changing database identities in the original integration. Wallet settings, both request records, the historical receipt and the exact checkout token survived a complete redeployment.
- A fresh hosted 1 USDC recording request is awaiting the owner's wallet payment. No transaction was sent by the release process.

## Recording and submission steps

Record the actual wallet approval and resulting hosted receipt using the prepared recording guide, then add the video URL to the submission. The completed earlier payment belongs to the local request; on hosting it is explicitly historical funding, not payment for the new request. Do not mix their request IDs or hashes.

Confirm the official submission portal's exact eligibility, deadline/timezone and required fields. Public listings disagree on the October 12/13 deadline; this release does not certify eligibility or claim entry submission.

## Scope and limits

Independent merchant accounts with one workspace per account; Monad testnet USDC only. No fiat settlement, refunds, team roles, cross-chain support or unattended indexer. Checkout verifies while open and supports manual hash recovery. Verification budgets remain per instance; wider exposure requires platform rate controls. Docker is an alternative packaging option, not the deployed or container-tested route. Merchant password must remain private; arrange judge access separately from public checkout.

## Merchant onboarding release

Adds public landing page, signup, username/password sign-in, private recovery-code reset, workspace naming and wallet setup. The existing owner workspace remains accessible at `/owner`. Additive ownership/account tables preserve existing records. Tests include cross-workspace read/write denial, public checkout ownership resolution, recovery-code rotation and old-session invalidation.

## Guest-first and wallet access release

- `/start` prepares and reviews a real request without authentication; the draft is held in tab-local session storage through sign-in. Publication remains authenticated and requires explicit confirmation after returning.
- `/login` and `/signup` use one wallet-signature flow. SIWE challenges expire after five minutes, bind to the browser and origin, and are consumed atomically once. Existing account access remains at `/password-login` and `/owner`.
- 46 automated tests cover draft validation, wallet ownership, wrong origin/browser/signature, expiry, replay and returning workspace identity, alongside existing ledger checks.
- Wallet access currently requires an injected EOA wallet (extension or wallet browser). Email codes, contract-wallet authentication and account linking are not implemented.
