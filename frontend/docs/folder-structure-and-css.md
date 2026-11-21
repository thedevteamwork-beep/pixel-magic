# Folder structure and CSS conventions

Read this before adding a component. The AI influencer feature (`src/components/ai-influencer/`) is the reference
implementation: copy its layout when in doubt.

## Where things live

| What                     | Where                                   | Notes                                                                                                  |
| ------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Routes and page shells   | `src/app/<route>/page.tsx`              | Server components. Keep them thin: metadata plus one feature component.                                |
| Feature components       | `src/components/<feature>/<Component>/` | Folder names are kebab-case (`image-upscaler`), component folders PascalCase.                          |
| Constants (one feature)  | `src/components/<feature>/constants.ts` | Option lists, limits, sample data and validation rules used by one feature.                            |
| Constants (shared)       | `src/constants/<name>.ts`               | Only constants used by two or more features, such as `landing-media.ts`.                               |
| Helpers (pure functions) | `src/lib/<feature>/`                    | Prompt builders, API clients, validators. No React. Tests sit next to the file (`x.test.ts`).          |
| Shared helpers           | `src/helpers/<area>.ts`                 | Small pure helpers used by several features, e.g. `studio.ts` (`cssAspectRatio`). Test next to it.     |
| Generic validators       | `src/lib/validation/validators.ts`      | Reusable `isNotEmpty`, `isTextLength`, `when`, `trimmed`, `validateFields`.                            |
| Types                    | `src/types/<feature>.ts`                | Shared types. Types used by one file stay in that file.                                                |
| Shared UI elements       | `src/ui/`                               | Button, Media, Modal, Badge, Chip, Container, Icon, SectionHeading, LazyVideo, MasonryGrid.            |
| Design tokens            | `src/assets/styles/theme.css`           | Colours, radii, spacing, font sizes.                                                                   |
| Shared CSS helpers       | `src/assets/styles/shared.module.css`   | Repeated class patterns, pulled in with `composes`.                                                    |
| Bundled images           | `src/assets/images/`                    | Raster images, imported from code. Never put images in `public/`; only videos stay in `public/media/`. |
| SVG files                | `src/assets/svg/`                       | Standalone `.svg` files. Inline icon components live in `src/ui/Icon`.                                 |
| Landing page sections    | `src/widgets/<Widget>/index.tsx`        | Rendered from a list by `WidgetRenderer`. See "Landing page widgets" below.                            |

Constants live in one `constants.ts` at the root of the feature folder (`components/<feature>/constants.ts`), not in
each component folder. Helpers and types stay out of component folders.

Pictures that show what an option means (a hairstyle, a body type, a style preset) are real images, not hand-drawn SVG
components. Put them in a subfolder of `src/assets/images/<feature>/` (for example `ai-influencer/hair/`), map them in
the feature's `constants.ts`, and render them with `Media`.

## Landing page widgets

The landing page is built from widgets. A page passes an ordered list of `{ id, type, props }` to `WidgetRenderer`,
which looks each `type` up in `src/widgets/registry.ts` and renders that component with its `props`.

1. **Each widget is a folder** with a plain `index.tsx` (`widgets/HeroBanner/index.tsx`) that exports the component and
   its `Props` type.
2. **Content comes from constants**, not from text written inside the widget. The widget only renders the props it gets.
3. **To add a widget,** add its props to `WidgetPropsMap` in `widgets/types.ts` and its component to `widgetRegistry` in
   `widgets/registry.ts`. TypeScript then checks every list entry's `props` against its `type`.
4. **Unknown types are skipped** with a console warning, so a list from a CMS that is ahead of this build does not break
   the page.

## Validating input

Do not write validation as inline `if` checks in a component. Declare each field's checks as an array of validators from
`src/lib/validation/validators.ts` (`trimmed`, `isNotEmpty`, `isTextLength`, `isInRange`, `isOneOf`, `when`, …) next to
the field's state or in the feature's `constants.ts`. Run them on submit with `runValidators` (one field) or
`validateFields` (a whole form), and show the returned message. Add a new rule to `validators.ts` only if it is generic.

## Shared UI: `src/ui/`

`src/ui/` holds the small, generic building blocks. Pick from here before you write your own, and use `ui/` for any new
element that more than one feature could use.

| Need                                | Use                                              | Notes                                                                                                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image or video that covers a box    | `Media` (`@/ui/Media`)                           | Wraps `next/image` and `LazyVideo`. `fill`, `sizes`, `eager`, `plain` (no placeholder background), `className`/`style` for the box, `imageProps` for the image itself.                                                                  |
| Button or link that looks like one  | `Button` / `ButtonWithLink` (`@/ui/Button`)      | Variants `primary`, `secondary`, `ghost`, `outline`; sizes `sm`, `md`, `lg`; `fullWidth`.                                                                                                                                               |
| Dialog over the page                | `Modal` (`@/ui/Modal`)                           | Native `<dialog>`: focus trap, Escape and backdrop click close it. `open`, `onClose`, `title`, `className` for a feature's own width.                                                                                                   |
| Collapsible sections                | `Accordion` / `AccordionItem` (`@/ui/Accordion`) | Items in one `Accordion` share it: opening one closes the open one. For sections that open and close on their own, give each item its own `Accordion` (AI influencer `ControlSection`). `defaultActiveEventKey` opens an item at first. |
| Small label                         | `Badge` (`tone`) and `Chip` (`href`)             |                                                                                                                                                                                                                                         |
| Page width and gutters              | `Container`                                      | `as="main" \| "section" \| …`.                                                                                                                                                                                                          |
| Section title with optional actions | `SectionHeading`                                 | `align`, `tone`, `description`, `actions`.                                                                                                                                                                                              |
| Icon from the shared set            | `Icon` (`name`)                                  | Add a new name to the map in `Icon.tsx` rather than importing icons ad hoc.                                                                                                                                                             |
| Lazy-loaded video                   | `LazyVideo`                                      | Used by `Media`; use `Media` unless you need only video.                                                                                                                                                                                |
| Masonry gallery                     | `MasonryGrid`                                    | Takes `GalleryItem[]` built on `MediaAsset`.                                                                                                                                                                                            |
| Need                                | Use                                              | Notes                                                                                                                                                                                                                                   |
| ----------------------------------- | -------------------------------------------      | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------                                                                  |
| Image or video that covers a box    | `Media` (`@/ui/Media`)                           | Wraps `next/image` and `LazyVideo`. `fill`, `sizes`, `eager`, `plain` (no placeholder background), `className`/`style` for the box, `imageProps` for the image itself.                                                                  |
| Button or link that looks like one  | `Button` / `ButtonWithLink` (`@/ui/Button`)      | Variants `primary`, `secondary`, `ghost`, `outline`; sizes `sm`, `md`, `lg`; `fullWidth`.                                                                                                                                               |
| Dialog over the page                | `Modal` (`@/ui/Modal`)                           | Native `<dialog>`: focus trap, Escape and backdrop click close it. `open`, `onClose`, `title`, `className` for a feature's own width.                                                                                                   |
| Small label                         | `Badge` (`tone`) and `Chip` (`href`)             |                                                                                                                                                                                                                                         |
| Page width and gutters              | `Container`                                      | `as="main" \| "section" \| …`.                                                                                                                                                                                                          |
| Section title with optional actions | `SectionHeading`                                 | `align`, `tone`, `description`, `actions`.                                                                                                                                                                                              |
| Icon from the shared set            | `Icon` (`name`)                                  | Add a new name to the map in `Icon.tsx` rather than importing icons ad hoc.                                                                                                                                                             |
| Lazy-loaded video                   | `LazyVideo`                                      | Used by `Media`; use `Media` unless you need only video.                                                                                                                                                                                |
| Masonry gallery                     | `MasonryGrid`                                    | Takes `GalleryItem[]` built on `MediaAsset`.                                                                                                                                                                                            |
| Loading placeholder                 | `Skeleton` (`@/ui/Skeleton`)                     | A pulsing block; size and shape it with `className`. See "Loading screens" below.                                                                                                                                                       |

Rules:

1. **Images and videos go through `Media`.** Do not import `next/image` directly in a feature component; `ui/Media.tsx`
   is the only file that does. Where a style goes matters, because `Media` puts a box around the image:
   - `className` / `style` go on the **box**: position, `z-index`, transforms, transitions, hover zoom.
   - `imageProps` goes on the **image**: `style` for `objectPosition` or a filter, `className` for `object-fit: contain`,
     and the `next/image` options `preload`, `priority`, `unoptimized`, `loading`, `fetchPriority`.
   - Pass `plain` when the image is layered over something that must show through, so no dark placeholder is painted.
   - CSS written as `.parent > img` no longer matches; write `.parent img`.
     If `Media` still lacks something, add an optional prop to it for everyone instead of bypassing it.
2. **Buttons go through `Button`.** A feature may style a special control (a tile, a tab) in its own
   `main.module.css`, but a plain primary, secondary or ghost button comes from `ui/`.
3. **Put new generic elements in `ui/`, not in a feature.** If you are about to copy a component between two features,
   move it to `src/ui/<Name>.tsx` first. Keep `ui/` free of feature knowledge: no context, no constants from a feature,
   props only.
4. **`ui/` components use Tailwind** with the theme tokens and `cn()` from `@/lib/cn`, so a caller can override with
   `className`. Feature components use CSS Modules (see below).

## Loading screens

A studio page never shows loading text. Its `<Suspense fallback>` is a skeleton of the screen that is about to
appear, built from `ui/Skeleton` blocks: `<Feature>Skeleton/` next to the workspace (`UpscaleSkeleton`,
`VideoSkeleton`, `InfluencerSkeleton`; `image-generator/ImageSkeleton.tsx` in the feature-root layout). Match the real
layout's grid, padding and main blocks so nothing jumps when it loads, and give the wrapper `role="status"` with an
`aria-label` such as "Opening your video studio".

## Component folders

Every component is a folder with an `index.tsx`:

```
components/ai-influencer/ReferenceUpload/
  index.tsx            ← the component. Imported as "../ReferenceUpload".
  UploadDropzone.tsx   ← sub-component used only by this one
  AttachedPhoto.tsx    ← sub-component used only by this one
  main.module.css      ← styles for index.tsx and every sub-component in this folder
```

Rules:

1. **One folder per component, `index.tsx` is the entry.** Import the folder, never the file inside it:
   `import { ReferenceUpload } from "../ReferenceUpload"`.
2. **Sub-components live flat in the parent folder** (`UploadDropzone.tsx`), not in their own folders. They share the
   parent's `main.module.css`.
3. **A component used by two or more parents gets its own folder** next to them (`layout/Logo/`, `video-generator/MotionPicker/`). If it is generic and used across features, it
   belongs in `src/ui/` instead (`ui/Modal`).
4. **Only `index.tsx` talks to context, state and routing.** Sub-components get props and return JSX, which keeps them
   easy to read and reuse. Callbacks go down as props, for example `onSelect`, `onRemove`.
5. **A hook used by one component sits in its folder** (`UpscaleWorkspace/useUpscale.ts`). A hook used by several goes
   in `src/lib/` or the nearest shared folder.
6. **Components without styles have no CSS file** (`InfluencerContext/index.tsx`).
7. **File names:** components `PascalCase.tsx`, hooks `useThing.ts`, helpers `camelCase.ts`.

### A feature's main screen

The component a route renders (the "workspace") may use either of two layouts. Both are allowed; pick one per feature.

```
Own folder                              Feature root
video-generator/                        image-generator/
  VideoWorkspace/                         index.tsx          ← the workspace
    index.tsx       ← the workspace       main.module.css
    main.module.css                       CreativePanel.tsx  ← flat sub-components
  DirectorPanel/    ← sibling folders     ImageResults.tsx
  VideoFeed/                              useImageJobs.ts
  constants.ts                            constants.ts
```

- **Own folder** (`ai-influencer`, `image-upscaler`, `video-generator`): `<feature>/<Name>Workspace/index.tsx`. Do not
  nest the workspace's pieces inside it; each piece is its own component folder next to it. The page imports
  `@/components/<feature>/<Name>Workspace`.
- **Feature root** (`image-generator`): the feature folder is the workspace. `index.tsx`, flat sub-components, hooks and
  one `main.module.css` sit directly in `<feature>/`. The page imports `@/components/<feature>`.

### `"use client"`

Put `"use client"` at the top of a file only if it uses state, effects, refs, context or browser APIs. Files that just
receive props and return JSX do not need it. They run in the client bundle anyway when a client component imports them,
and they are still rendered on the server first. `page.tsx` files stay server components so `metadata` works.

## CSS

### One `main.module.css` per component folder

- Import it as `import styles from "./main.module.css"`.
- Class names are short and scoped by the module, so `.card` in two folders never clashes. **Inside one folder they
  can:** every sub-component shares the file, so give classes distinct names (`.toolbar`, `.canvas`, `.strip`) rather
  than a second `.title`.
- Name classes after what they are (`.thumb`, `.tileLabel`), not how they look.
- State goes in data attributes, not extra classes: `data-selected="true"`, `data-dragging={dragging}`,
  `aria-pressed`. Style them with `.tile[data-selected="true"]`.
- Keep the cascade shallow. A parent class plus one descendant (`.attached img`) is fine; long chains are not.
- Start each rule with layout (`display`, `position`), then box (`width`, `padding`, `border`), then paint (`color`,
  `background`), then motion (`transition`). One declaration per line.
- Put a blank line between rules and wrap `@media` blocks around the whole rule group, at the bottom of the file.
- Always honour `@media (prefers-reduced-motion: reduce)` for transitions and animations.

### Tokens: `src/assets/styles/theme.css`

Never hard-code colours, radii or font sizes in a component. Use the variables:

- Colour: `var(--primary)`, `var(--surface)`, `var(--surface-raised)`, `var(--foreground)`, `var(--muted)`,
  `var(--border)`, `var(--danger)`. Mix with `color-mix(in srgb, var(--primary) 12%, var(--surface))`.
- Radius: `var(--radius-sm)`, `var(--radius-card)`, `var(--radius-panel)`.
- Font size: `var(--fs-2xs)` 10px, `--fs-xs` 11px, `--fs-sm` 12px, `--fs-md` 13px, `--fs-base` 14px, `--fs-lg` 15px,
  `--fs-xl` 17px, `--fs-2xl` 22px, `--fs-3xl` 26px. Use `clamp()` for large display headings.
- Display font: `font-family: var(--font-display), sans-serif`.

The `--fs-` prefix is deliberate. Tailwind already owns `--text-*`, and reusing that prefix would change `text-sm` on
other pages.

To add a token, add it to `theme.css` once. Do not add a global utility class such as `.text-sm`: it bypasses module
scoping and fights with Tailwind.

### Shared helpers: `src/assets/styles/shared.module.css`

CSS Modules have no mixins. For a class pattern that repeats across components, define it once in `shared.module.css`
and pull it in with `composes`:

```css
.spinner {
  composes: spinner from "../../../assets/styles/shared.module.css";
}
```

Put `composes` first in the rule. The path is three levels up from `components/<feature>/<Component>/main.module.css`.
Available helpers: `srOnly` (visually hidden), `spinner` (rotating icon), `thinScroll` (themed scrollbar),
`mediaShade` (dark gradient under text on a photo). Add one only when the same block is already copied in two or more
files.

### A stylesheet shared by several components

If two components in one folder need the same large stylesheet, or a stylesheet whose class names are chosen at
runtime (`motion[preset.id]`), do not merge it into `main.module.css`. Merging can force a class rename, which breaks
dynamic names. Keep it as its own module in `src/assets/styles/` and import it with the alias, for example
`import motion from "@/assets/styles/camera-motion.module.css"` in the video generator.

### Tailwind

Tailwind v4 is installed and the root layout uses it, so utility classes are allowed. Use them for small one-off layout
and spacing (`className="flex gap-2"`) and in places that already use Tailwind. Put anything with states, pseudo
selectors, animation or a repeated design in `main.module.css`. Keep one component on one approach: do not style the
same element with both a module class and a long utility string.

## Formatting

Prettier (`.prettierrc`: 2 spaces, double quotes, width 120) covers `src/**/*.{ts,tsx,css}`:

```
npm run format        # rewrite files
npm run format:check  # check only, for CI
```

Prettier keeps blank lines but does not add them, so leave one empty line between CSS rules yourself.

## Lint on push

`.githooks/pre-push` runs ESLint in `frontend/` and `backend/` before every `git push`, and a lint error stops the
push. `npm install` in `frontend/` turns it on (the `prepare` script runs `git config core.hooksPath .githooks`). To
turn it on by hand, run that command once from the repo root. `git push --no-verify` skips it, for emergencies only.
CI runs `npm run lint` as well.

## Checklist for a new component

1. Create `components/<feature>/<Name>/index.tsx`. Add `"use client"` only if it needs it.
2. Put the feature's option lists and limits in `components/<feature>/constants.ts`, pure logic in `src/lib/<feature>/`,
   shared types in `src/types/<feature>.ts`. A constant that a second feature starts to need moves to `src/constants/`.
3. Add `main.module.css` next to it. Use tokens and `composes`, not literals and copies.
4. Split a sub-component out as a flat `.tsx` file when `index.tsx` grows past one screen or part of it repeats.
   Keep context and state in `index.tsx`.
5. Run `npm run format`, `npx tsc --noEmit`, `npm run lint` and `npm test`.

## Migration status

**UI primitives:** every `<Image>` in `app/`, `widgets/` and `src/components/` goes through `ui/Media`. Plain buttons in
some feature components still use their own styles and can move to `ui/Button` when next touched.

**Folder structure:**

Every component folder (`ai-influencer`, `auth`, `image-generator`, `image-upscaler`, `landing`, `layout`,
`video-generator`) follows this structure. `image-generator` uses the feature-root layout for its workspace; the others
use their own folder.
