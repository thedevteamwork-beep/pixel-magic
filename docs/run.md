# Run the backend locally

Copy-paste commands to run the backend on your machine. The backend is two
processes, each in its own terminal: the **API** (port `PORT` from
`backend/.env`, 8080 by default) and the **worker** (port 8081).

Command lines below have no `#` comments on purpose: zsh doesn't treat `#` as
a comment when you paste, and passes it on as arguments.

## Before the first run

You need [nvm](https://github.com/nvm-sh/nvm), Docker (or OrbStack) and a
filled-in `backend/.env`:

```bash
cd backend
cp .env.example .env
nvm install 22
nvm use
npm ci
```

Then fill in `backend/.env` (Supabase, fal and Paddle values; see
`backend/README.md`).

Start the database and set it up:

```bash
cd backend
nvm use
npm run db:up
set -a; source .env; set +a
npm run migrate
npm run seed
```

`npm run db:up` starts Postgres in Docker on port 54329. If another Postgres
container already uses that port, start that one instead
(`docker start <container-name>`); two on the same port clash.

## Every time

**Terminal 1: API**

```bash
cd backend
nvm use
set -a; source .env; set +a
npm run dev:api
```

**Terminal 2: worker**

```bash
cd backend
nvm use
set -a; source .env; set +a
PORT=8081 npm run dev:worker
```

The worker must run on 8081, the port in `WORKER_URL`. Both restart by
themselves when you edit code. After changing `.env`, stop both (`Ctrl+C`),
run `set -a; source .env; set +a` again and start them again.

**Terminal 3: tunnel (only for Paddle and fal webhooks)**

```bash
ngrok http 8080 --url=https://encroach-bubbling-unloving.ngrok-free.dev
```

Use the port from `PORT` in your `.env`. See [local-tunnel.md](local-tunnel.md)
for the one-time setup and the one-developer-at-a-time rule.

## Check that it runs

Use your API port if it isn't 8080:

```bash
curl localhost:8080/_readyz
curl localhost:8081/_healthz
```

Both answer `{"status":"ok"}`.

## Useful commands

Run from `backend/` after `nvm use` and `set -a; source .env; set +a`.

| What                                                      | Command                                              |
| --------------------------------------------------------- | ---------------------------------------------------- |
| Finish jobs stuck in `submitted` (no tunnel)              | `curl -X POST localhost:8081/tasks/reconcile`        |
| Give a user credits                                       | `npm run credits:grant -- <userId> <credits> <days>` |
| Apply new migrations (after pulling)                      | `npm run migrate`                                    |
| Re-seed the catalog (plans, add-ons)                      | `npm run seed`                                       |
| Install packages (after `package.json` changes)           | `npm ci`                                             |
| Lint, type-check and test (all must pass before a commit) | `npm run lint`, `npm run typecheck`, `npm test`      |

## Stop

`Ctrl+C` in each terminal. The database keeps running in Docker; stop it with
`docker compose stop db` if you want.

## Common errors

| Error                                                                                       | Fix                                                                                                                                                |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Node.js detected but native WebSocket not found`, or "Node.js 20 and below are deprecated" | The terminal is on an old Node. Run `nvm use` and check that `node -v` prints `v22`.                                                               |
| `version ".nvmrc" is not yet installed`                                                     | A `#` comment was pasted after `nvm use`. Run `nvm use` on its own.                                                                                |
| `EADDRINUSE` (address already in use)                                                       | Something already runs on that port. Stop it, or find it with `lsof -nP -iTCP:8080 -sTCP:LISTEN`.                                                  |
| `Free plan missing; run npm run seed`                                                       | The catalog is empty. Run `npm run seed`.                                                                                                          |
| `relation "..." already exists` during `npm run migrate`                                    | The database was migrated before knex's records moved from `public` to `app_migrations`. Copy them over (below), then run `npm run migrate` again. |
| Config error naming a missing variable at startup                                           | `.env` isn't loaded in this terminal. Run `set -a; source .env; set +a`.                                                                           |

### Copy old migration records

Only for the `relation "..." already exists` error above. It copies knex's
records from the old `public` schema; no app data is touched. With the
`npm run db:up` database:

```bash
cd backend
docker compose exec db psql -U postgres -d pixel_magic -c "INSERT INTO app_migrations.knex_migrations (name, batch, migration_time) SELECT name, batch, migration_time FROM public.knex_migrations ORDER BY id;"
```

For another container, use `docker exec <container-name> psql ...` with the
same SQL.
