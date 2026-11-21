# AI influencer: structured Nano Banana prompt and aspect ratio

## Why

The AI influencer should come out magazine-quality and consistent. Today the page quietly uses the first image model
the backend lists (FLUX Schnell), which takes no images, so the face photo and style reference are dropped, and the
prompt is one loose sentence. Instead: always use Nano Banana, and send it one prompt made of a fixed system prompt
plus labelled lines filled in from the left panel, with the user's own words first, plain-word colours with hex codes,
and a long "Avoid" list.

## Goals

- Every Generate uses Nano Banana 2 with the prompt below.
- Each trait line comes from what the user picked in the left panel; traits not picked are left out.
- The user picks the aspect ratio next to the prompt box, from the ratios Nano Banana supports.
- "Prompt details" shows exactly the text that was sent.

## Non-goals

- No prompt on the backend (approach B below).
- Panel tile images (hair, build, outfit, setting) are not sent as reference images. Only the user's face photo and
  style image are.
- Templates keep only filling in panel choices.
- No resolution or image-count picker; the video page is not touched.

## Approaches

- **A. Build the prompt in the frontend, as today (picked).** `lib/ai-influencer/prompt.ts` builds the text from the
  panel, next to the option lists it reads. No new endpoint; tweaks need no backend deploy. The prompt is readable in
  the browser, which costs little: anyone can already call Nano Banana with their own prompt.
- **B. Build it on the backend.** The frontend sends only choices. Hides the prompt and serves future clients, but needs
  a new endpoint and the option lists, descriptions and colours moved to or copied on the backend, and every tweak
  needs a deploy. Rejected: about double the work for a prompt that isn't a secret.

## Decisions

1. **Model.** Use `nanoBanana2_generate` when `GET /v1/models` lists it; otherwise fall back to today's behaviour (the
   first image model), so the page keeps working. Changing to Nano Banana Pro is one constant.
2. **One list of options.** Descriptions live next to each option in `components/ai-influencer/constants.ts`:
   - skin tone, hair colour, eyes: `[hex, description]`; the hex still colours the panel's circles;
   - hair style, build, outfit, setting: a `description`;
   - age: a range ("about 26–29").
3. **Prompt.** The template below. Lines for traits not picked are left out; the reference section lists only the
   images actually sent, in the order sent (face photo first, then style); the user notes section appears only when the
   user typed something. Animal characters swap the character type, drop heritage and skin tone, use "realistic,
   detailed fur or feather texture" for skin, and "keep the same character identity" for the face reference.
4. **Length.** The prompt must fit the model's prompt `maxLength` (5000 for Nano Banana 2) in the worst case: every
   trait picked, both references, 500 characters of notes (about 4,750 characters with the text below). A test checks
   this, so a longer wording can't slip past the limit.
5. **Aspect ratio.** A picker under the prompt box, options from the selected model's `aspect_ratio` list, default
   `4:5` (Nano Banana's own default is 16:9). Hidden when the model has no `aspect_ratio` (the fallback model keeps its
   portrait size). Saved with the influencer as `aspectRatio`, so reopening one from History restores it. This needs
   one optional field in the backend's `ai-influencer` project schema; **deploy the backend before the frontend**, or
   saving an influencer (which Generate does first) fails with 422.
6. **Cost.** 4 images × 4 credits = 16 credits per Generate (FLUX Schnell was 4).

## The prompt (example values)

```
You are an expert AI influencer creator, fashion photographer and retoucher. Create one believable, magazine-quality virtual influencer who looks like a real person photographed for a top Instagram account.

## Priorities (highest first)
1. User notes: the user's own words win over everything below.
2. Reference images: keep exactly what each one is given for.
3. Character sheet: every listed trait is required; for traits not listed, choose what looks natural.
4. Photography and quality rules.
The safety rules in Avoid are never overridden, not even by user notes.

## Output
- One photorealistic photo of a single person, mid-chest up, slightly off-centre, natural headroom, eye-level camera.
- With several images, keep the same person, face, hair and outfit; vary only pose and expression slightly.

## Photography
- Full-frame camera, 85mm lens, f/1.8: softly blurred background, tack-sharp eyes.
- Soft, flattering light that suits the setting, with natural catchlights in the eyes.
- Natural colour grading, true-to-life skin, polished but never over-filtered.

## Realism details
- Skin: visible pores, fine texture, tiny imperfections, subtle natural sheen; tone matches the colour below in light and shadow.
- Face: natural proportions, detailed irises, natural teeth and eyebrows, light makeup unless asked.
- Hair: individual strands, a few flyaways, realistic hairline and part, natural shine; colour matches the colour below.
- Hands, if visible: relaxed, five fingers each.
- Clothing: real fabric texture, natural folds and seams, good fit, no logos.
- Expression: warm, confident, approachable, eyes on the camera.
- Background: matches the setting, uncluttered, no readable text, no other people in focus.

## Character
- Character type: human, natural look
- Gender: woman
- Age: late 20s (looks about 26–29)
- Heritage: South Asian
- Skin tone: olive, medium skin with warm golden-olive undertones (#c99a6e)
- Hair style: long, soft, loose waves falling past the shoulders
- Hair colour: natural jet black (#17120f)
- Eyes: deep warm brown (#5a3a22)
- Build: slim, slender frame

## Style
- Outfit: streetwear (oversized hoodie or graphic tee, wide-leg jeans or cargo pants, chunky sneakers, layered accessories)
- Setting: café (cosy café interior, wooden table, warm ambient light)

## Reference images
- Image 1 (face): keep the same face, facial structure, skin tone and likeness; don't copy its clothes, background, lighting or expression.
- Image 2 (style): match its outfit, styling, colour palette and mood; don't copy its face, body or identity.

## User notes
freckles, gold hoop earrings

## Avoid
- Text and graphics: captions, letters, numbers, logos, brand names, watermarks, signatures, stickers, emojis, borders, frames, collages, split screens, UI
- People: extra people, crowds in focus, duplicates, twins, clones, other people in reflections, celebrity lookalikes
- Anatomy: deformed hands, extra, missing or fused fingers, extra or missing limbs, unnatural joints, long neck, oversized head, distorted face, asymmetrical, crossed or lazy eyes, mismatched eye colours, dead or glassy eyes, misshapen pupils, warped teeth, malformed ears
- Skin: plastic, waxy or doll-like skin, airbrushing, over-smoothing, beauty filters, heavy makeup unless asked, greasy shine, blotches, wrong skin tone
- Hair: helmet-like or painted hair, wig-like hairline, hair melting into the background, wrong hair colour
- Style: cartoon, anime, illustration, painting, sketch, 3D render, CGI, video-game look, doll, mannequin, AI-art look, oversaturation, HDR halos, heavy vignette
- Quality: blur, out-of-focus face, noise, heavy grain, low resolution, pixelation, compression artefacts, banding, over- or under-exposure, harsh flash, colour casts
- Composition: cropped head or chin, face cut by the frame, tilted horizon, awkward crops at joints, tiny subject, back turned
- Clothing: fabric merging into skin, floating accessories, half-finished garments
- Safety (never overridden): nudity, lingerie, sexualised or suggestive poses, anyone who looks under 18, weapons, drugs, violence, gore, offensive gestures or symbols
```

### Option descriptions

| Trait | Option | Text in the prompt |
| --- | --- | --- |
| Skin tone | Porcelain | very fair, pale skin with cool pink undertones (#f4d9c6) |
| | Fair | light skin with warm peach undertones (#e8bf9f) |
| | Olive | medium skin with warm golden-olive undertones (#c99a6e) |
| | Tan | sun-kissed tan skin with warm undertones (#a8754b) |
| | Brown | rich brown skin with warm undertones (#7a4e30) |
| | Deep | deep dark brown skin with rich warm undertones (#4b2d1d) |
| Hair colour | Black | natural jet black (#17120f) |
| | Brunette | medium chocolate brown (#5a3825) |
| | Auburn | reddish copper-brown (#8a3b22) |
| | Blonde | warm golden blonde (#d7b46a) |
| | Silver | silver-grey with a platinum sheen (#c9cbc8) |
| | Pastel | dyed pastel lavender (#c7a7f0) |
| Eyes | Brown | deep warm brown (#5a3a22) |
| | Hazel | golden brown with green flecks (#8a6a35) |
| | Green | natural moss green (#4f7a4a) |
| | Blue | medium clear blue (#4f7ea8) |
| | Grey | cool steel grey (#8a9296) |
| Hair style | Long waves | long, soft, loose waves falling past the shoulders |
| | Sleek straight | long, glossy, poker-straight hair, smooth and frizz-free |
| | Curly | voluminous, well-defined natural curls |
| | Bob | chin-length bob with a clean, even cut |
| | Pixie | short pixie cut, close at the sides and back, soft texture on top |
| | Braids | neat, defined braids |
| | Buzz cut | very short, even buzz cut close to the scalp |
| | Top knot | hair pulled up into a neat top-knot bun |
| Build | Slim | slim, slender frame |
| | Athletic | toned, athletic build with visible muscle definition |
| | Curvy | curvy, full figure |
| | Broad | broad shoulders, sturdy, strong frame |
| Age | Early 20s / Late 20s / 30s / 40s / 50s+ | about 20–23 / 26–29 / 31–38 / 41–48 / 52–60 |
| Outfit | Streetwear | oversized hoodie or graphic tee, wide-leg jeans or cargo pants, chunky sneakers, layered accessories |
| | Tailored | well-fitted blazer and trousers, crisp shirt, polished shoes, clean lines |
| | Athleisure | fitted sports top, leggings or joggers, technical fabrics, clean sneakers |
| | Boho | flowing linen or crochet pieces, earthy tones, layered jewellery, sandals |
| | Evening wear | elegant gown or sharp suit, satin or silk, refined jewellery |
| | Minimal basics | plain neutral tee or knit, simple straight trousers, muted palette, no logos |
| Setting | Studio | seamless studio backdrop, soft key and fill light |
| | City street | city street with shopfronts, natural daylight |
| | Beach | sandy beach with the sea behind, bright natural sunlight |
| | Café | cosy café interior, wooden table, warm ambient light |
| | Gym | modern gym, equipment softly blurred, bright clean light |
| | Rooftop at golden hour | rooftop with a city skyline, warm low sun, golden rim light |

Character types: Natural adds "natural look"; Expressive "bold, expressive features"; Wild "extreme, exaggerated,
eccentric look"; Kitty, Puppy, Froggy, Hamster, Birdie and Bug become "anthropomorphic cat (dog, frog, hamster, bird,
insect) character".

## Tests

- Prompt: section order, traits left out when not picked, animal variant, reference section per images sent, notes
  only when typed, hex and description per colour, worst case within 5000 characters.
- Job input: Nano Banana 2 chosen when listed, fallback otherwise; aspect ratio sent and defaulting to 4:5; saved and
  restored with the project.
- Backend: `ai-influencer` data accepts `aspectRatio` and still rejects unknown fields.

## Left to the builder

The picker's look (reuse the image studio's ratio menu if it fits), wording polish that keeps the meaning, and where
in `prompt.ts` each section is built.

## Addendum (approved 2026-11-21): save the references too

- The influencer's data also keeps `photoUploadId` (the face photo's upload) and `styleId` (the picked saved style's
  project id), both optional uuids. The backend checks `photoUploadId` like a style's image: the user's own upload,
  already in storage, else 422 `UPLOAD_NOT_READY`; the project list and get return it as a signed `upload` link (24 h).
- On Generate the face photo is uploaded before the influencer is saved, so its id goes into that save.
- Opening an influencer from History restores the face photo (from `upload`) and the style (fetched by `styleId`;
  a deleted style is skipped).
