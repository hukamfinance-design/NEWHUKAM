# HukamBook Backend v2.2

Zero-dependency Node.js server (Node 18+). Fetches live matches, scores, and odds
from **6 providers** with an automatic fallback chain. **No API keys required.**

## Run

```bash
node server.js
# or
npm start
```

Then open http://localhost:8787 (serves the frontend from ./public if present).

## Configuration

All optional — copy `.env.example` to `.env` to override. Defaults work with zero config.

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | 8787 | Server port |
| `CACHE_TTL_SECONDS` | 60 | Cache lifetime (normal) |
| `LIVE_CACHE_TTL_SECONDS` | 30 | Cache lifetime during live events |
| `ALLOWED_ORIGIN` | `*` | CORS origin |
| `REDDYBOOK_PRIMARY` | api.dcric99.com | ReddyBook primary base |
| `REDDYBOOK_FALLBACK` | v9.jarvisexch.com | ReddyBook fallback base |
| `REDDY66_PROXY` | (none) | Optional proxy for IP-blocked exchanges |

## Providers & fallback order

1. **Stake** (GraphQL) — football; real decimal odds
2. **FanCode** (GraphQL) — cricket/football/etc; score feed
3. **SofaScore** (REST) — all sports; real scores
4. **LiveScore** (REST) — soccer/cricket/tennis/basketball/hockey; score feed
5. **Reddy66** (REST) — cricket/football; real BetFair odds if IP allowed
6. **ReddyBook** (REST) — cricket/football; real odds+scores if reachable

The chain tries each until one returns data. See `../docs/ODDS_AND_SCORES_STATUS.md`
for the honest per-provider breakdown of what's real vs unavailable.

## Endpoints

- `GET /api/matches` — matches in HukamBook schema. Each match has an
  `oddsAvailable` boolean; when `false`, the odds fields are `null` (never faked).
- `GET /api/health` — active provider, per-provider health, `matchesWithLiveOdds`,
  `matchesScoreOnly`, cache age.

## Notes

- **No `ODDS_API_KEY` anymore.** v1 required a paid Odds API key; v2.2 is key-free.
- Odds are only real where the provider actually publishes them (Stake always;
  the two exchanges when their IP-restricted endpoints are reachable). Score-only
  providers honestly report `oddsAvailable:false` rather than inventing prices.
