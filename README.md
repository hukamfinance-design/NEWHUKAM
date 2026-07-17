# HukamBook Backend v2.2 — 6-Provider System

Upgrades the backend from the old paid Odds API to a **key-free, multi-provider**
system with an automatic fallback chain. No API keys, no monthly cost.

## Files

```
server.js                    ← the backend (replace your old one)
.env.example                 ← optional config (works with zero config)
README.md                    ← this file
QUICK_START.md               ← 30-second setup
ODDS_AND_SCORES_STATUS.md    ← ⭐ HONEST per-provider odds/scores breakdown — read this
PROVIDER_REFERENCE.md        ← API endpoint specs for each provider
API_TESTING_GUIDE.md         ← curl commands to test each API yourself
MIGRATION_GUIDE_v2.md        ← migrating from the old Odds API
DEPLOYMENT_CHECKLIST.md      ← pre/post deployment checks
```

## What changed vs v1

| Item | Old (v1) | New (v2.2) |
|------|----------|-----------|
| Cost | $29–49/month | $0 |
| API keys | Required | None |
| Providers | 1 | 6 with automatic fallback |
| Fallback if a provider is down | None | Automatic |

## The 6 providers & the fallback chain

Tried in this order until one returns data:

1. **Stake** (GraphQL) — football; **real odds** parsed from the response
2. **FanCode** (GraphQL) — cricket/football; score feed, no odds
3. **SofaScore** (REST) — all sports; **real scores**, no odds
4. **LiveScore** (REST) — soccer/cricket/tennis/basketball/hockey; score feed
5. **Reddy66** (REST) — cricket/football; real BetFair odds **if IP allowed**
6. **ReddyBook** (REST) — cricket/football; real odds+scores **if reachable**

## ⚠️ Important: odds are NOT the same across providers

Earlier drafts of this package claimed every provider returned "real odds." **That
was wrong and has been fixed.** The truth:

- **Stake** returns genuine decimal odds (one back level + a derived lay). ✅
- **FanCode / SofaScore / LiveScore** are score/data feeds with **no betting odds**.
  These now honestly report `oddsAvailable: false` and `back: null` — they never
  invent numbers.
- **Reddy66 / ReddyBook** can return real BetFair odds and real liquidity, but their
  odds endpoints are usually IP-blocked from a VPS. The code calls them and parses
  real prices when reachable; otherwise those matches show odds as unavailable.

**Read `ODDS_AND_SCORES_STATUS.md` for the full, honest, per-provider breakdown.**

Every match now carries an `oddsAvailable` boolean. When it's `false`, the odds
fields are `null` (not fake). The frontend can hide the odds column for those.

## Quick start

```bash
cp server.js your-backend/server.js
node server.js
```

Then:

```bash
curl http://localhost:8787/api/health | jq
#   matchesWithLiveOdds → how many matches have real odds
#   matchesScoreOnly    → how many are score-only

curl http://localhost:8787/api/matches | jq '.[] | {provider, oddsAvailable, back}'
```

No `.env` is required; defaults work. See `.env.example` to tune cache TTLs or add a
proxy for the IP-blocked exchange providers.

## Endpoints

- `GET /api/matches` — matches in HukamBook schema (with `oddsAvailable` flag)
- `GET /api/health` — active provider, per-provider health, odds counts, cache age

## Notes on this build

- Verified: server boots, all 6 providers are called in order, the fallback chain
  handles each failure without crashing, and the odds/score parsers pass unit tests
  against mock API payloads.
- Fixed a critical bug: `/api/matches` had a leftover `if (!CFG.API_KEY)` gate from
  the old Odds API that would have returned HTTP 500 forever. Removed.
- Not confirmable from the build environment (network egress blocked): the exact JSON
  field names inside the Reddy66/ReddyBook odds & score endpoints. The parser handles
  common shapes and degrades safely; paste one real response and it can be made exact.
