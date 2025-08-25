# Bitcoin Sentiment + DCA Dashboard (MVP)

A ready-to-deploy React (Vite) app that:
- Fetches BTC daily prices (CoinGecko).
- Plans DCA schedules (weekly/bi-weekly/monthly).
- Computes invested, BTC accumulated, current value, and P&L.
- Shows a sentiment score (manual demo now; AI backend later).
- Exports the DCA timeline to CSV.
- Includes a demo news panel (connect RSS/NewsAPI later).

## One‑click deploy (no Terminal)
1) Create a new repo at https://github.com/new (name it `bitcoin-dca-dashboard`).
2) Click **Upload files** and drag all files from this folder into the repo.
3) Go to https://vercel.com → **New Project** → **Import Git Repository** → select your repo → **Deploy**.
4) Open your live URL.

## Optional (local preview)
If you do want to run locally later:
```bash
npm install
npm run dev
```

## Notes
- To wire AI sentiment, create a small backend endpoint that returns a 0–100 score and replace the demo slider.
- To monetize, add Stripe or Lightning and gate real‑time sentiment/alerts behind a paywall.
