# Movie Master unique visitor counter

This Cloudflare Worker stores one anonymous UUID per browser in D1 and returns the total unique-browser count.

## First-time setup

From the `counter-worker` directory:

```bash
npx wrangler login
npx wrangler d1 create movie-master-visitors
```

Copy the returned `database_id` into `wrangler.toml`, replacing `REPLACE_WITH_DATABASE_ID`.

Then initialize the remote database:

```bash
npx wrangler d1 execute movie-master-visitors --remote --file=./schema.sql
```

Deploy the Worker:

```bash
npx wrangler deploy
```

Wrangler will print the Worker URL, typically similar to:

`https://movie-master-visitor-counter.<account-subdomain>.workers.dev`

## Endpoints

- `GET /health` — confirms the Worker is responding.
- `GET /count` — returns `{ "count": N }`.
- `POST /visit` — accepts `{ "visitorId": "<uuid>" }`, inserts it once, and returns `{ "count": N }`.

The public site is intentionally not wired to the Worker until the Worker has been deployed and its URL is known.
