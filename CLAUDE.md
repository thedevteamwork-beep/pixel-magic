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
