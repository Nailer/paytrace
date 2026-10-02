# PayTrace — engineering and judge-perspective review

Review date: 2 October 2026. This is the builder assistant's evidence-based review, not an official hackathon score or independent security audit.

## Verdict

A functioning testnet MVP with real payment evidence; not yet a finished, judge-accessible submission or a production payments service. The real-payment verification gate is now satisfied. Delivery and operational gaps should be closed before calling it done.

## Evidence checked

Reviewed the current README, release/deployment/demo materials, CI definition, Docker packaging, wallet transfer flow, checkout behavior, verification logic, SQLite ledger and public/operator APIs and session controls. Re-ran the test suite. Inspected GitHub repository visibility, default branch, pull request and CI result through GitHub CLI. Checked the prepared request through the running API and independently verified its new 1 test USDC transaction against the live Monad RPC.

The review is not exhaustive verification of every runtime/platform combination. Final visual acceptance, wallet-extension compatibility and container/host execution are not certified by passing unit tests.

## Submission blockers, highest priority first

1. **Judge access:** at review time the repository is private and the working implementation lives in draft PR #1 on `codex/testnet-verification`. `main` still opens the old simulated workspace and describes the project as a local demonstration. A default-branch link misrepresents the deliverable; unauthenticated judges cannot inspect the private repository. Finish acceptance and merge the correct branch; arrange judge access or explicitly choose public visibility. No visibility or merge changes were made by this review.
2. **Demo evidence:** the prepared 1 USDC payment is Received, and its wallets, exact amount and finalized receipt verify. However, wallet-popup footage and the final customer/merchant visual walkthrough have not been inspected. A generated success animation is not a substitute.
3. **Public accessibility:** no hosted URL exists. A local production build can be demonstrated in a video, but an external judge cannot click its localhost link. A deployed service or clearly agreed evaluation route is needed; the official portal's precise requirements are not yet verified.
4. **Rules and submission completeness:** the official Metropolis page was inaccessible to this web reader. The Rise In listing describes the Consumer Products & Payments track, but its date card says October 12 while its body says October 13. Confirm the exact deadline, timezone, eligibility and required assets inside the official portal. Do not infer these from a generic historical hackathon page.

## Code and product observations

- **Strength:** server-owned payment state, integer amounts, allowlisted token verification, expected sender/recipient, successful canonical finalized receipt, block checkpoint and unique event claims. These are meaningful safeguards against a misleading “payment received” label.
- **Strength:** funding and customer receipts are separate. Review acknowledgement does not change payment status. Private notes and customer labels stay out of public checkout responses.
- **Fixed during this review:** the review snapshot previously returned only the latest 100 records, including resolved ones. That could hide older unresolved items. It now includes every unresolved item plus bounded resolved history; a 120-item regression test protects this behavior.
- **Before public hosting:** the sign-in attempt counter is global to the process (`src/app/api/session/route.ts`, lines 5–8). Five failures from one visitor can temporarily deny all operators login. Use trusted-edge/client-specific throttling before wide exposure. In-memory throttling also resets with the process and is not distributed.
- **Recovery limitation:** post-submission polling runs in the customer's open page, not a durable background worker. Local storage helps resume a known hash, but a dropped client or RPC outage can require manual verification. Describe this honestly as bounded checkout verification.
- **Scope limitation:** expected payer is mandatory and must be known before request creation. Multiple-event transactions are rejected as ambiguous; smart-account/batched payment compatibility is not established. This is a narrower product than a general payment gateway.
- **Operational limitation:** one workspace, one Node process and SQLite. No multi-tenant isolation, hosted backup service, production monitoring or fiat payout adapter has been demonstrated. Docker configuration exists but has not been container-tested.
- **Maintainability:** many React components and route handlers are compressed into very long lines. Formatting and component extraction would improve reviewer comprehension; passing tests does not address maintainability.

## As a judge

- Problem clarity: good. Request-to-transfer reconciliation is concrete and easy to demonstrate.
- Functional evidence: good for an MVP. The real 1 USDC payment and repeatable verification are stronger than a dashboard alone.
- Differentiation: moderate. Payment links and receipts are common. Emphasize exception handling, exact evidence and duplicate prevention; do not claim an exclusive invention without competitor research.
- Monad relevance: implemented directly on Monad testnet. No measured advantage from throughput, fees or parallel execution has been demonstrated. Do not claim a benchmark or necessity that the code does not prove.
- Presentation: coherent branding and a clear flow are prepared. Final visual footage and judge-accessible delivery are still missing.

I would assess it as a credible hackathon MVP, not yet a submission I could independently evaluate end to end from the default GitHub link.

## Recommended completion order

1. Capture or reuse actual wallet/payment footage using the synchronized recording scripts.
2. Inspect the final desktop and mobile checkout, receipt download and merchant refresh.
3. Finish release acceptance and merge the current implementation to the submission/default branch.
4. Arrange repository and runnable-product access for judges without exposing credentials or operator data.
5. Verify official portal requirements and submit the real video and accurate project summary.

Sources: [Metropolis official entry](https://www.monad.xyz/developers/hackathons/metropolis), [Rise In listing](https://www.risein.com/monad/monad-metropolis-hackathon). The official portal remains the authority for exact rules.
