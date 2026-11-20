# Pixel Magic

Pixel Magic is an AI image and video studio: `frontend/` (Next.js) and `backend/` (Express, Postgres, fal). See `frontend/AGENTS.md` and `backend/AGENTS.md` for code conventions.

## Product and UX principles

These apply to every screen and every change, before visual polish.

### 1. Think from the user's side, and never leave them stuck

Before building or changing a screen, walk through it as the user: what did they just do, what do they want next, and is that next step obvious?

- **There is always a next step.** Every state (empty, loading, result, error) shows at least one clear action. After a result, offer what people do next: download, generate again, edit, upscale, animate, start a new one.
- **Don't break the flow.** Keep users on the page they're working in. Don't send them elsewhere to finish a task that belongs here. When work moves to another studio, take their image or settings with it, so they don't have to upload or re-enter anything.
- **Keep their work.** Don't silently discard a prompt, an upload, settings or a result. Carry settings over to the next run, keep drafts through sign-in, and offer Undo for removals.
- **Waiting is never a dead end.** Show what is happening and roughly how long it takes, keep the image or context visible, and say where the result will appear if they leave.
- **Errors say what to do.** Write the fix in plain words ("Choose an image under 20 MB"), and include a Retry or a way out. No bare "Something went wrong" when the cause is known.

### 2. Keep the design simple

A simple screen the user understands beats a clever one they have to learn.

- **One primary action per view**, visually clear. Secondary actions are quieter; rare ones go under "More settings" or a menu.
- **Show only what helps the decision at hand.** Hide advanced options until asked, and leave out labels, badges and stats that don't change what the user does.
- **Use familiar patterns** (upload box, before/after slider, model picker, filmstrip) and the same component for the same job everywhere.
- **Plain, short words.** Name things the way users would, not after internal or provider terms.
- **The main task fits on one screen** on common laptop sizes (1280×720 and up) without page scrolling. Panels may scroll; the primary action stays in view.
- **When unsure, remove rather than add.** Check every new element against principle 1: does it help the user do the next thing?

## Studio layout pattern

Upscale uses this layout, and Video and Influencer already keep their settings on the left. The **Image studio keeps its own layout for now** (prompt bar at the bottom, result details on the right): don't move it to this pattern unless asked.

```
┌ rail ┬─ settings panel (≈340–360px) ─┬───────────── canvas ──────────────┐
│      │ Title                         │ Result bar: what was made · next  │
│      │ Inputs (prompt / upload)      │ steps (Generate again, Animate,   │
│      │ Model, size, count            │ Upscale, Edit, Download, New…)    │
│      │ More settings ▾ (collapsed)   │                                   │
│      │                               │        The result, large          │
│      │ [Primary action · N credits]  │                                   │
│      │  (pinned to the bottom)       │                                   │
└──────┴───────────────────────────────┴───────────────────────────────────┘
```

- **Left: the settings panel.** Everything the user sets before they click goes here: inputs, model and options, with rare options collapsed. The panel's contents don't change after a result. Only its button changes, to "… again" (secondary while the settings match the result, primary once they change).
- **The primary action is pinned at the bottom of the panel**, with its price, and is always visible. The panel body scrolls; the button does not.
- **Right: the canvas.** Everything about what was made lives here. A **result bar above the result** shows what made it in one line (the full prompt and settings open in a dialog) and the next steps: generate again, continue in another studio, download, start a new one. The result fills the rest.
- **Only two columns.** Don't add a third column for result details; it leaves the image too small on a laptop. Use the result bar and a details dialog instead.
- **One screen.** The studio is one viewport tall. The panel and the canvas each scroll on their own; the page does not.
- **Phones:** the result comes first, the settings below, and the primary action sticks to the bottom of the screen.
- **Moving between studios** carries the image along (for example "Animate" opens the video studio with the image as the start frame), so users never upload twice.
