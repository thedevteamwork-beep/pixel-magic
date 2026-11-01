# Pixel Magic backend

Requires Node 22 (`nvm use`).

```bash
cp .env.example .env
npm install
npm run db:up        # local Postgres
npm run migrate
npm run seed
npm run dev:api      # or npm run dev:worker
npm test
```
