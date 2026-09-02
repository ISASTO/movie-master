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

For an existing database, apply pending migrations before deploying a new Worker:

```bash
npx wrangler d1 migrations apply movie-master-visitors --remote
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
- `POST /game-event` — records a receipted game start or validated completed run.
- `GET /public-leaderboards` — returns Standard and Hardcore all-time/daily boards.
- `POST /leaderboard-profile` — validates and saves a public leaderboard name.
- `GET /mode-leaderboards` — returns the anonymous analytics leaderboard.

Run `npm test` before applying a migration or deploying the Worker.
