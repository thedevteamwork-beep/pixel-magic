# Generation loader and one-portrait influencer result

## Why

Generating should look like hinata: the gradient video with the Lottie animation in the frame where the image will
appear. The AI influencer result should show one influencer at a time, and while the backend isn't deployed the
design should be visible without spending credits.

## Goals

- One shared `GenerationLoader`, ported from hinata (`src/common/Loader/GenerationLoader.js`), used while an image is
  being made in the image studio and in AI influencer.
- AI influencer, after Generate: one portrait, large, framed in the selected aspect ratio. No strip of variations.
- Generate again while a portrait is showing: the loader replaces it, in a frame shaped like the selected aspect ratio,
  with a Cancel button; the new portrait takes its place when ready.
- A refresh opens the influencer main page (Explore). Past influencers stay in History.
- Sample portraits instead of real generation while a flag is on.

## Non-goals

- Sample results are not saved and don't appear in History (History is server data).
- No new History design; the video page is not touched.

## Approaches (for the sample portraits)

- **A. A flag in the Generate step (picked).** `USE_SAMPLE_PORTRAITS` in the influencer constants. While it's on,
  Generate skips the backend, shows the loader for a few seconds, then shows a sample portrait from the app's own
  images. Least code, and removed by flipping the flag once the backend is live.
- **B. A fake backend in the app** answering save, job and History requests from memory. More realistic (History
  works until refresh) but about three times the work, all thrown away later.
- **C. A frontend demo route** like the video page's. B with extra plumbing, and the same pattern that let the video
  page skip credit checks.

## Decisions

1. **Loader.** `ui/GenerationLoader.tsx`: a muted, looping `<video>` of the gradient filling its box, the Lottie
   animation centred at 30% of the box (min 16px, max 100px), like hinata. hinata's `Video` wrapper only rewrites its
   CDN links, so a plain `<video>` is used. Assets copied from hinata: the animation (450 KB) and `gradient.webm`
   (1 MB). `lottie-react@3.1.2` (hinata's 2.4.0 doesn't support React 19). The component is loaded with
   `next/dynamic` so the assets download only when something is generating. It respects `prefers-reduced-motion`
   (no video autoplay, animation paused).
2. **Image studio.** The "Creating image N" cards in the grid and the canvas placeholder show the loader, each card
   shaped by the ratio picked for that generation; the text under it stays.
3. **AI influencer result.** The canvas shows the newest portrait in a frame with `aspect-ratio` set from the job's
   ratio (the selected one while generating), fitted to the available height. The name and summary stay above it.
   The variation strip goes.
4. **One image per Generate.** `VARIATION_COUNT` becomes 1: 4 credits instead of 16.
5. **Refresh.** The page stops writing `?project=` into the address bar after a Generate. A link that has it still
   opens that influencer.
6. **Sample portraits.** `USE_SAMPLE_PORTRAITS = true` for now. A sample Generate waits about 3 seconds (the loader
   shows), then picks a portrait: the template's image when the influencer came from a template, else the character
   type's image (Kitty → kitty), else one of the human template images chosen from the traits so the same traits give
   the same picture. Nothing is saved, no credits are spent, and the result says it's a sample.

## Tests

- Sample portrait choice: template → its image; animal character → its image; human traits → a stable pick.
- One image: the job input asks for `num_images: 1`.
- Ratio frame: the frame's aspect ratio comes from the selected ratio ("9:16" → 9 / 16).
- In the browser: the loader in both studios, the frame shape changing with the ratio, refresh landing on Explore.

## Left to the builder

The exact sizes and spacing of the frame, the "sample" label's wording and place, and the sample wait's length
(about 3 seconds).
