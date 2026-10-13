# PayTrace pitch video — under 2 minutes

Brief: introduce the team, the problem, and why you are building it. Speak at a natural pace (about 130 words per minute); the script below is about 255 words, roughly 1:55. Replace `[Your name]` before recording. Add real fintech or hackathon names only if you want to; the script works without them.

## 0:00–0:25 — Who you are (on camera)

“Hi, I’m [Your name], founder and builder of PayTrace. I’m a full-stack blockchain developer with over five years of experience and a Computer Science degree. I’ve won multiple hackathons, worked as a senior developer at two fintech companies, and I’m an entrepreneur. I’m building PayTrace on my own, and I’ve shipped every layer of it: the verification logic, the checkout and the merchant workspace.”

## 0:25–0:55 — The problem (on camera, then cut to the merchant workspace)

“Here’s what I kept seeing in fintech. Receiving a blockchain payment is easy. Knowing what it *means* is hard. Which customer was it for? Was the amount exact? Was it the right token, from the right sender, and has it actually finalized? Today that means screenshots, block explorers and spreadsheets, and a single mistake can mean counting one transfer twice, or marking an invoice paid when it isn’t.”

## 0:55–1:30 — The solution (screen: request, checkout, receipt)

“PayTrace fixes that. A merchant creates a payment request with an exact amount and expected payer. The customer pays straight from their own wallet on Monad. PayTrace never holds funds or asks for token approvals. Then our server checks the real onchain USDC transfer: the sender, the recipient, the exact amount, and finalization. Only then does the request become paid, and both sides get a receipt with the evidence. One transfer can never pay two requests, and anything that doesn’t match goes to a review inbox instead of being silently accepted.”

## 1:30–1:50 — Why you are building it (on camera)

“I’m building this because I’ve worked on the money side of fintech, and I know trust comes from a clear trail, not a promise. Stablecoin payments are growing, and merchants need accounting they can rely on, not guesswork.”

## 1:50–2:00 — Close (on camera, show URL)

“PayTrace: every payment, accounted for. It’s live on Monad testnet today at paytrace-tau.vercel.app. Thank you.”

## Accuracy notes

- Say “Monad testnet” and “test USDC”; there are no real-money payouts, fiat conversion or bank settlement.
- “Solo” is stated because the repo shows one builder. If you have advisors or teammates, add one line to the intro.
- Do not add user numbers, revenue or partnerships unless they are real.
