# Recording the wallet payment segment

This is the one part of the demo video that must be recorded on the owner's computer, because it needs a real wallet extension and a real Monad testnet transfer. Every other scene is recorded separately and edited around this clip, so follow the framing and handoff rules below to keep the cuts invisible.

## Where it sits in the final video

| Time | Scene | Recorded by |
|---|---|---|
| 0:00–0:25 | Problem and merchant workspace overview | Claude |
| **0:25–1:45** | **Create request → checkout → wallet approval → Received → merchant status updates** | **Owner** |
| 1:45–2:15 | Receipt download, print view, CSV export, public verifier for the same transaction | Claude |
| 2:15–2:40 | Exception rules (review inbox, guide) | Claude |
| 2:40–3:00 | Close and live URL | Claude |

The owner's clip is one continuous story about **one request**, so judges see the same reference, amount and payer from creation through to "Received". Claude then reuses that same request for the receipt and verifier scenes.

## Before recording

1. **Two accounts in the wallet.** A receiving wallet and a payer wallet. The payer holds at least 2 test USDC and some test MON for gas.
2. **Monad Testnet already added** to the wallet (chain 10143), and the payer account already selected. This avoids a chain-switch prompt mid-take.
3. **Rehearse once** with a separate request for 1 USDC. Note how long finalization takes so the wait is not a surprise. Do not reuse the rehearsal request in the recording.
4. **Clean browser.** Use a fresh browser profile or guest window with only the wallet extension installed. Hide the bookmarks bar, close other tabs, and turn off notifications (Do Not Disturb / Focus).
5. **Sign in** to the hosted workspace at <https://paytrace-tau.vercel.app> before you start recording, so no password entry is captured.
6. **Two tabs only.** Tab 1: merchant workspace. Tab 2 will be the checkout, opened during the take.

## Recording settings

- **Capture the whole screen, not a single window.** The wallet approval popup is a separate window; window-only capture often misses it. OBS Studio (Display Capture), macOS `Cmd+Shift+5` → Record Entire Screen, or Windows `Win+Alt+R` with the browser full screen all work.
- 1920×1080, 30 fps, MP4 (H.264). If the screen is larger, still record at 16:9.
- Browser zoom 100% (110% if the text looks small at 1080p). Keep the same zoom for the whole take.
- Light/dark theme: keep whatever the system uses, just don't change it during the take.
- **Audio optional.** Silent is fine: captions and narration are added in editing. If you narrate, use the lines below and record in a quiet room.
- Move the mouse slowly and pause on anything you want judges to read. Pauses are easy to trim; rushed motion cannot be fixed.

## Shot list

Start and end each beat on a still frame for about 2 seconds. Those stills are the cut points.

1. **Merchant workspace** (still, 2s). Start on the dashboard, mouse at rest.
2. **Create the request.** Customer such as `Acme Studio`, description such as `Website audit — October`, amount `1` test USDC, the payer wallet as expected payer, your receiving wallet. Add an internal note such as `Client: Acme (internal only)`. Submit. Pause on the new row showing *Awaiting*.
   > "Each payment has a purpose, an expected sender and an exact amount."
3. **Open its checkout** in tab 2. Pause so the amount, reference and receiving wallet are readable. Move the mouse over the description and amount, and say that the customer name and internal note are **not** shown on the customer page.
4. **Click "Pay with your wallet".** Let the wallet popup appear and **hold for 3 seconds** on the recipient, amount and gas before approving. This is the most important frame of the video.
   > "Funds move directly between wallets. PayTrace never holds keys and needs no token allowance."
5. **Confirming.** Keep recording through "Confirming onchain…". Do not stop the recording if it takes a while; long waits will be sped up in editing and labelled as such.
   > "PayTrace checks the actual USDC transfer event, sender, recipient, amount and finalization."
6. **Received.** Hold 3 seconds on *Received. Verified. Recorded.* Do not click download or print yet; those are covered in the next scene.
7. **Back to tab 1.** Wait for the merchant row to change to *Received* on its own (refresh is every 15 seconds; do not reload the page). Hold 3 seconds. Stop recording.

Target length is 1:20 after trimming; a raw take of 2–4 minutes is fine.

## If something goes wrong

- **Wallet error or rejection:** stop, cancel that request in the workspace, create a new one and record again. Never edit a failed payment into a success.
- **Slow finalization:** keep recording. The real wait stays in the video, sped up and labelled.
- **Wrong account selected:** the transfer will land in *Needs review*. That is real evidence for the exceptions scene, so keep the clip and tell Claude, then record a clean take.

## Send back

- The MP4 file (upload it to this session or a shared drive link).
- The request reference shown on the checkout (starts with `PT-`).
- The transaction hash.
- The checkout link for that request.

Never send seed phrases, private keys or the workspace password in chat. If Claude needs workspace access for its own scenes, provide the password as an environment secret.
