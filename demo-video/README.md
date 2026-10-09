# Demo video build

Sources used to produce the PayTrace hackathon demo video (2:47, 1080p, narrated with captions).

- `script.json`: narration, one entry per scene.
- `tts2.py`: generates the narration (`vo/*.mp3`) with word timings (`vo/*.json`).
- `cards.html` + `render.cjs`: title cards, step labels and the MetaMask side panel, rendered to `png/`.
- `shoot*.cjs`: screenshots of the live public pages (home, guide, verifier) into `pages/`.
- `build.py`: the edit list. It cuts and zooms the owner's screen recording (`../video/owner.mp4`, not committed), adds the cards, narration and burned-in captions, and writes `paytrace-demo.mp4`.

The recorded payment is real: request `PT-6497119a-0722-4794-9016-d079677cf5a2`, Monad testnet transaction
`0x315740aeba1924a2bc06c74706ec08ea6829cb569193bcfbd02fed7f3f29d97c`.

Fonts come from `node_modules/@fontsource` converted to TTF in `fonts/`. The recording, generated media and fonts are not committed.
