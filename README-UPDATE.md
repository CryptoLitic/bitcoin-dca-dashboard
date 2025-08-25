# Update: Live Sentiment + News (No Keys Needed)

This update adds a Vercel serverless function at `/api/sentiment` that:
- Fetches Bitcoin-related RSS feeds
- Computes a simple sentiment score (0–100) using keyword heuristics
- Returns the latest ~20 headlines for the dashboard

## How to apply (no Terminal)
1) In your GitHub repo (`bitcoin-dca-dashboard`), click **Add file → Upload files**.
2) Drag in the **`api/sentiment.js`** file (create an `api` folder if you don't have one), and **replace** `src/App.jsx` & `package.json` with the ones from this archive.
3) Commit changes.
4) Vercel will auto-redeploy. Open your site and switch **Sentiment** to **Auto** (or leave it; Auto fetches by default on load).

## Notes
- This version uses public RSS feeds and a simple keyword model (no API keys).
- You can later swap the heuristic for an LLM-based model by calling OpenAI/Claude from the same API route.
- The endpoint is cached for 10 minutes to keep it fast and friendly.
