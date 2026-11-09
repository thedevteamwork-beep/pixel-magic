# Pixel Magic

A responsive, discovery-first landing page built with Next.js App Router, React, TypeScript, and CSS Modules. This implementation covers the landing page only; it has no studio, prompt editor, generation API, or “Open studio” button.

## Run locally

```sh
cd frontend
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). For a production check, run `npm run build` followed by `npm start`. Run `npx tsc --noEmit` for a type check.

## Change the theme in one place

Edit [`frontend/src/styles/theme.css`](frontend/src/styles/theme.css). The palette feeds semantic variables such as `--primary`, `--primary-foreground`, `--background`, `--surface`, and `--muted`. Buttons, selected filters, focus rings, artwork accents, and banners all use these shared tokens. Spacing, page width, and corner radii live there too. `globals.css` exposes the same tokens to Tailwind and holds only the shared base styles.

To switch the main accent to the violet palette, change `--primary: var(--lime-400)` to `--primary: var(--violet-400)` in that file. Check text contrast when changing foreground/background pairs.

## Structure

- `frontend/src/app/page.tsx` composes the page as a Server Component.
- `frontend/src/components/landing/` contains the carousel, cinematic hero, reusable masonry grid and template cards, collection banners, media previews, and model directory. CSS Modules keep section styles scoped.
- `frontend/src/constants/landing-tools.ts` defines carousel content and landing destinations.
- `frontend/src/constants/landing-templates.ts` defines model names and template collections. Marketing Studio appears before GPT Image 2.
- `frontend/src/constants/landing-media.ts` maps reusable media IDs to local posters and compressed clips in `public/media/landing/`.
- `frontend/src/styles/theme.css` owns all color values and shared design tokens.

`LandingProvider` keeps the motion preference and template filters in separate contexts. Native scroll rails support touch and keyboard input. Masonry positions are calculated in advance for desktop, tablet, and phone layouts, preserving DOM order and reserving space before media loads. Next Image serves responsive, lazy-loaded artwork; clips mount on visibility/interaction, pause offscreen or in hidden tabs, and respect reduced motion. Native dialogs provide preview focus management and Escape dismissal. All calls to action lead to landing sections or media previews.

## Replace the sample media

The checked-in media are compressed visual samples, not generated outputs from the named models. Replace the paths in `landing-media.ts` and the catalog entries when production template media are available. Each video has a lightweight poster, and the image dimensions are reserved by its card layout. No API keys or external runtime media service are required.

Sample media sources on Pexels:

| Asset | Creator | Source |
| --- | --- | --- |
| Desert film | Kelly | [Drone footage of a car driving on desert](https://www.pexels.com/video/drone-footage-of-a-car-driving-on-desert-9318299/) |
| Neon portrait | cottonbro studio | [Woman posing with neon lights](https://www.pexels.com/video/woman-posing-with-neon-lights-7846593/) |
| Product film | Mikhail Nilov | [Perfume bottle on top of a stone](https://www.pexels.com/video/perfume-bottle-on-top-of-a-stone-7815967/) |
| Ocean film | Lucius Crick | [Ocean waves aerial](https://www.pexels.com/video/ocean-waves-aerial-20279053/) |
| Roses | Natalie Bond | [Pink roses](https://www.pexels.com/photo/pink-roses-in-close-up-photography-3782745/) |
| Architecture | Nenyasha Manzvera | [Concrete modern architecture](https://www.pexels.com/photo/concrete-modern-architecture-11312129/) |
| Sneakers | Wayne Lee | [Close-up of sneakers](https://www.pexels.com/photo/close-up-shot-of-a-pair-of-sneakers-12601012/) |
