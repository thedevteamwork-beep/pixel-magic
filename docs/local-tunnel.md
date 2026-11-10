# Local tunnel for webhooks (ngrok)

Paddle and fal tell the backend about payments and finished generations
through webhooks. They cannot reach `localhost`, so when you run the backend on
your machine you give the API a public address with an ngrok tunnel.

This is only for local development. Deployed, the API has a public Cloud Run
URL and no tunnel is needed.

The team shares one ngrok account and one fixed domain:

```
https://encroach-bubbling-unloving.ngrok-free.dev
```

The Paddle sandbox already points at it, so you only install ngrok and start
the tunnel.

## Only one developer at a time

One domain can have only one tunnel online. While someone else's tunnel is
running, yours is refused with "endpoint is already online"
(`ERR_NGROK_334`). Tell the team when you start and stop it.

Webhooks go to whoever has the tunnel open. A payment or generation you start
while someone else's tunnel is online sends its webhook to their machine, and
yours never hears about it.

## What needs the tunnel

Only the API. Everything else stays on `localhost`.

| Caller       | Calls                                                          | Tunnel? |
| ------------ | -------------------------------------------------------------- | ------- |
| Paddle       | API `/webhooks/paddle`                                         | yes     |
| fal          | API `/webhooks/fal?jobId=...`                                  | yes     |
| The API      | worker `/tasks/generate`, `/tasks/finalize` (via `WORKER_URL`) | no      |
| Your browser | API `/v1/...` (via `NEXT_PUBLIC_API_URL`)                      | no      |
| The worker   | fal and Supabase (outgoing requests)                           | no      |

Without a tunnel the app still runs, but:

- a Paddle payment never switches the plan on (the `transaction.completed`
  webhook never arrives);
- generated images stay `submitted` until you run the reconciler by hand:
  `curl -X POST localhost:8081/tasks/reconcile`.

## One-time setup

1. Ask the ngrok account owner for the team's **authtoken**. It is shared
   privately; never commit it.
2. Install ngrok with `brew install ngrok`. (An npm-installed `ngrok` lives
   under one Node version and disappears from `PATH` after `nvm use`.)
3. Add the authtoken:
   ```bash
   ngrok config add-authtoken <team-authtoken>
   ```
4. Set the public URL in `backend/.env`, with no trailing slash:
   ```bash
   API_PUBLIC_URL=https://encroach-bubbling-unloving.ngrok-free.dev
   ```
   The worker builds fal's webhook URL from this value. Nothing to set in fal
   itself: the webhook URL is sent with every request.
5. Ask for the Paddle sandbox values too, also shared privately:
   `PADDLE_API_KEY` and `PADDLE_WEBHOOK_SECRET` for `backend/.env`, and
   `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` for `frontend/.env.local`.

Leave `WORKER_URL`, `TASKS_MODE`, `CORS_ORIGINS` and the frontend's
`NEXT_PUBLIC_API_URL` on their `localhost` values.

## Every time you work locally

Start the tunnel to your API's port, which is `PORT` in `backend/.env`
(8080 unless you changed it):

```bash
ngrok http 8080 --url=https://encroach-bubbling-unloving.ngrok-free.dev
```

Older ngrok versions use `--domain=encroach-bubbling-unloving.ngrok-free.dev`
instead of `--url=`. Keep this terminal open, and stop it with `Ctrl+C` when
you are done so the next developer can start theirs.

Start the API and the worker as described in `backend/README.md`. Run
`set -a; source .env; set +a` first in each terminal; after changing `.env`,
restart **both**.

Check that the tunnel reaches your API:

```bash
curl https://encroach-bubbling-unloving.ngrok-free.dev/_readyz   # {"status":"ok"}
```

The ngrok web interface at <http://127.0.0.1:4040> lists every request that
came through the tunnel. You can inspect a webhook's body and replay it from
there.

## How the Paddle sandbox is set up

Already done; listed so you know what to check if webhooks stop arriving.

| Where                                               | Value                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| Checkout > Checkout settings > Default payment link | `https://encroach-bubbling-unloving.ngrok-free.dev/checkout`        |
| Developer tools > Notifications > destination       | `https://encroach-bubbling-unloving.ngrok-free.dev/webhooks/paddle` |

The destination is subscribed to the **Transaction** and **Subscription**
groups only: the backend acts on `transaction.*` and `subscription.*`.

Paddle does not accept `localhost` as the default payment link. The frontend
never opens that link (it opens its own `/checkout?_ptxn=...` page), but
Paddle needs one before it creates a transaction, so the ngrok domain fills
the field.

The sandbox is shared too. Each developer has their own local database, so a
webhook for a payment someone else made reaches your backend as an unknown
subscription or price, and the backend logs it as an error. Those log lines
are expected while sharing.

## Troubleshooting

| Symptom                                    | Cause and fix                                                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `ERR_NGROK_334`, "endpoint already online" | Someone else's tunnel is running. Ask them to stop it.                                                                        |
| `502 Bad Gateway`, `ERR_NGROK_8012`        | Your API isn't running on that port. Start it, or check the port. If it still fails, use `ngrok http 127.0.0.1:8080`.         |
| Paddle webhooks answer `401`               | `PADDLE_WEBHOOK_SECRET` doesn't match the destination. Ask for the current secret and restart the API.                        |
| Payment done but the plan doesn't change   | The webhook didn't reach you. Check the request list at <http://127.0.0.1:4040>; another tunnel may have been online instead. |
| Jobs stay `submitted`                      | The worker started before `API_PUBLIC_URL` was set. Restart the worker, or run `curl -X POST localhost:8081/tasks/reconcile`. |
