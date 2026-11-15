# Pixel Magic frontend

Next.js App Router, React, TypeScript, CSS Modules, and Supabase authentication.

## Run locally

1. Copy `.env.example` to `.env.local` and fill in the Supabase project URL, publishable key, and backend API URL. Keep secret keys on the backend.
2. Install dependencies with `npm install`, then run `npm run dev`.
3. Open `http://localhost:3000` for the landing page, `/sign-in` to log in, or `/sign-up` to create an account.
4. To use generation, credits, and billing, also start the API and worker described in `../backend/README.md`.

`NEXT_PUBLIC_SUPABASE_ENABLED=false` disables authentication requests. Account pages still display their layout with an availability message and disabled controls. Restart or rebuild after changing public environment variables.

## Account pages

| Route              | Purpose                                                            |
| ------------------ | ------------------------------------------------------------------ |
| `/sign-in`         | Email/password and Google login                                    |
| `/sign-up`         | Account creation, immediate-session or email-confirmation handling |
| `/forgot-password` | Request a password recovery email                                  |
| `/reset-password`  | Verify the recovery session and set a new password                 |
| `/auth/callback`   | Exchange the PKCE code and return to the requested page            |

The default destination after login or signup is the landing page (`/`). The `next` parameter follows visitors through login, signup, confirmation, and recovery when they were opening a specific page. `safeNext` restricts destinations to local paths. Failed callbacks return to the relevant form without losing the destination. Confirmation emails can be resent with a cooldown; password recovery responses avoid revealing whether an email is registered. Login accepts existing passwords without applying the new-account length requirement. New and reset passwords require at least eight characters; Supabase can enforce additional rules.

Supabase Email and Google providers must be configured in the project. Keep the Site URL and permitted callback URLs in Auth → URL Configuration aligned with the frontend origin, including `localhost` versus `127.0.0.1`. Google redirects back through the existing `/auth/callback` route. Recovery emails use the same callback with `flow=recovery`; open confirmation and recovery links in the browser that requested them. See the [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls) and the existing setup notes in `../backend/README.md`.

## Structure and theme

New components follow the conventions in [docs/folder-structure-and-css.md](docs/folder-structure-and-css.md): one folder per component, one `main.module.css` per folder, shared tokens and helpers in `src/assets/styles/`.

- `src/components/auth/AuthPage/AuthShell` provides the standalone account-page layout and editorial artwork.
- `src/components/auth/AuthPage/AuthForm` shares accessible fields, validation, pending/error/success states, and password visibility controls across account pages.
- `src/lib/auth/actions` contains provider calls, independent of form state; `messages` and `paths` handle validation, display messages, and callback destinations.
- `src/components/layout/SiteChrome` selects the landing/application header and footer or the standalone auth shell while preserving server-rendered page content.
- `src/components/layout/Header/HeaderAccount` keeps public navigation, login/signup actions, and the signed-in account/credits menu responsive.
- `src/assets/styles/theme.css` is the shared source for colors and design tokens. Changing `--primary` recolors the landing and account pages together.
- Local preview images are bundled from `src/assets/images/landing/`; the clips stay in `public/media/landing/`.

The protected generation, account, checkout, creations, and test routes keep their existing authentication checks. The internal `/test` functionality remains available by direct URL and is absent from public navigation.

## Verification

```sh
npm test
npx tsc --noEmit
npm run build
```

The tests cover provider contracts and redirects without creating live accounts or sending email. Real Google, confirmation, and reset flows also depend on your Supabase provider and mail settings.

## Image studio UI preview

Open `/image?model=gpt_image_2`, or choose **Image** in the header. This is an isolated interface preview. The existing `/generate` route still uses the real generation workflow; this preview never imports its submission client, uploads to Supabase, or charges credits.

The image studio uses a simplified Creative Canvas. Create opens four lightly labeled inspiration cards, with a single heading and a Browse templates action; after a mock request, the canvas shows one large uncropped sample and a keyboard-accessible variation strip. A single Create/History switch opens the canvas or full library; the duplicate side navigation has been removed. The compact composer starts as one line and grows only as the user types. The bar follows the supplied Higgsfield screenshot: upload/mentions, model, aspect ratio, quality, resolution, image count, and Generate. All five output controls stay directly available on mobile and wrap according to the composer width. The broad Settings dialog has been removed; quality is limited to Low, Medium, and High. Queue, seed, negative prompt, enhancement, privacy, file-format, background, and manual Create/Edit switches are not user-facing preferences. Reference inputs automatically choose the edit request mode; without references the request uses create mode. Unexposed request fields retain fixed transport defaults for compatibility with the mock endpoint. The composer is hidden in History, where an empty library displays a single Create action without templates, search, or empty filters. Its band is reserved below the canvas so it cannot cover the selected artwork. Desktop uses a collapsible side panel; smaller screens use a native dialog. Preview results last for the current page visit and are capped at 60.

**Creative options:** reference images can be marked Subject or Style. Four optional style presets, lighting, and color palettes compile into visible prompt additions, with the typed brief taking precedence over conflicting suggestions. These are application-level prompt guidance, not native provider parameters or guarantees of exact color/product preservation. The typed brief remains separate from these additions; reusing a result restores its selected style/light/palette without appending stale instructions. Catalogs live in `src/components/image-generator/constants.ts`; composition is isolated in `src/lib/image-generator/guidance.ts`. Each mock request validates the combined prompt length. The preview still selects existing local photographs and does not apply those instructions to pixels.

History retains search, favorites, grid/list views, multi-selection, deletion with undo, prompt/settings reuse, references, details, and original sample-file downloads.

Reference files remain in browser memory. Use **+**, drop images onto the composer, or paste them into the composer. The **@** picker inserts local `@image1` references at the prompt cursor; removing a reference updates these mentions. Reference roles become ordered image instructions in the composed prompt. Only bounded ID/type/size descriptors accompany the preview request; pixels, filenames, remote URLs, and data URIs are not sent. Uploaded object URLs are released on removal and unmount. The configurable limits in `src/constants/image-generator.ts` are prototype choices pending production model capabilities. In particular, the 16-reference limit remains a configurable preview limit rather than a guarantee for every model.

**Sample request:** the UI calls `POST /api/demo/image-generation` through `src/lib/image-generator/client.ts` using native fetch with cancellation. The exact endpoint bypasses auth refresh, validates all settings and reference descriptors, limits the body to 128 KiB, and returns known local sample JPEG paths with `demo: true` and `creditsCharged: 0`. It does not generate or edit pixels. Requested quality and resolution are UI/request settings; downloads stay the original sample JPEGs. The server does not store requests or contact an image provider.

To integrate a real provider later, update the model capability catalog and replace the dedicated preview transport/API adapter. Keep credentials on the server. Shared colors continue to live in `src/assets/styles/theme.css`.

### Reference and UX research

The supplied screenshot of Higgsfield’s [requested generator page](https://higgsfield.ai/ai/image?model=gpt_image_2) confirms the canvas, welcome collage, View control, floating composer, upload/@ affordances, visible output controls, and 9:16/High/2K/1-of-4 selection. The current Creative Canvas evolves that reference into an original workspace with inspiration templates, a selected-image stage, a reserved composer band, and optional art-direction controls. The screenshot does not reveal the complete dropdown menus or reference-mention syntax; those remain local prototype choices rather than claims of exact parity. Higgsfield’s [GPT Image 2 page](https://higgsfield.ai/gpt-2) documents text prompting, optional references, image editing, downloads, and output up to 4K. Its [Unlimited guide](https://higgsfield.ai/blog/higgsfield-all-unlimited-explained) documents queue selection and a 2K/High Unlimited ceiling for GPT Image 2. The local preview applies a conservative queue limit; it does not claim live plan eligibility or pricing.

The layout uses [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): the brief and common controls stay visible, while style guidance and finer output controls open on demand. Other design choices preserve the prompt on errors/cancellation, reveal new results when filters could hide them, use explicit sample labels, keep keyboard shortcuts out of dialogs, and move mobile users to completed previews.

## Compact header and inspiration artwork

The shared header is 56px on desktop, with no bottom divider, a measured sliding navigation pill, compact motion control, and an avatar menu for signed-in users. On screens up to 760px it uses two compact rows totaling 88px. Header dimensions use the shared theme token, so sticky panels and scroll offsets stay aligned.

Generator welcome cards and the template browser use the approved artwork in `src/assets/images/image-studio/`, mapped in `src/components/image-generator/constants.ts`. The matching prompt starters have also been updated. [Artwork paths and generation prompts](docs/image-template-artwork.md) document the built-in image-generation workflow.
