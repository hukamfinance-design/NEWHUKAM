# Odds & Scores — Honest Status (v2.2)

This document tells you exactly what is **real** vs **derived** vs **unavailable**
for each provider. No marketing checkmarks — just what the code actually does.

> **v2.2 cross-check pass:** every endpoint, query, and response field in the code was
> re-verified against your source docs. Corrections made in this pass:
> - **ReddyBook/Reddy66 sport detection** was reading the competition *name* for the
>   word "Cricket" — but your sample `"International Twenty20 Matches"` has no such
>   word, so T20 cricket was being mislabeled football. Now uses BetFair
>   `event_type_id` (4=cricket, 1=football, 2=tennis). ✅
> - **Stake `marketLimit`** set back to the spec-verified value `1` (was 3). ✅
> - **FanCode sport** no longer hardcoded to cricket — derived from the tour/sport
>   slug (it also carries football, tennis, kabaddi, hockey, basketball). ✅
> - **SofaScore sport** no longer collapsed to football — tennis/basketball/hockey
>   preserved. ✅
> - **LiveScore parser** hardened for `Stages`/`Leagues` and `Esd` date variants,
>   since your notes confirmed the endpoints but not the response body. ✅

Everything below was verified by (a) unit-testing the parsing logic against mock
API payloads and (b) booting the real server and confirming the fallback chain
calls every endpoint. External APIs themselves could not be reached from the build
environment (network egress is blocked), so live field names on the two exchange
providers still need one real-world confirmation — flagged clearly below.

---

## Summary Table

| Provider | Odds | Scores | Notes |
|----------|------|--------|-------|
| **Stake** | ✅ REAL (1 level) + derived lay | ✅ REAL | Odds parsed by outcome name from same response |
| **FanCode** | ⛔ Unavailable (honest) | ⚠️ Live/not-live only | Streaming feed, no odds, no numeric score in basic query |
| **SofaScore** | ⛔ Unavailable (honest) | ✅ REAL | Score feed; `homeScore.current` parsed |
| **LiveScore** | ⛔ Unavailable (honest) | ⚠️ REAL if field names match | Score feed; field names need live confirm |
| **Reddy66** | 🔶 REAL *if* IP allowed | ⚠️ Live/not-live only | BetFair prices via `/markets`; VPS usually IP-blocked |
| **ReddyBook** | 🔶 REAL *if* reachable | 🔶 REAL cricket score *if* reachable | `/ws/getMarketData` + `/ws/getScoreData` wired up |

Legend: ✅ real & tested · 🔶 real code, needs live field-name confirm · ⚠️ partial · ⛔ deliberately unavailable (not faked)

---

## What Changed From The Previous Version

**Before (v2.1):** Every match from every provider showed identical hardcoded odds
`1.95 / 2.00 / 2.05` with fake `8K / 7K / 6K` liquidity, and the docs claimed these
were "real decimal odds." That was false.

**Now (v2.2):**
- **All fake odds removed.** Grep-confirmed: zero hardcoded `1.95, stake` lines remain.
- **Stake** parses genuine odds from its GraphQL response, mapped to the correct team.
- **Data-only feeds** (FanCode/SofaScore/LiveScore) return `oddsAvailable: false` and
  `back: null` instead of inventing prices. The UI can hide the odds column for these.
- **Exchange feeds** (Reddy66/ReddyBook) now actually call their odds endpoints
  (`/markets`, `/ws/getMarketData`) and their score endpoint (`/ws/getScoreData`),
  parsing real BetFair back/lay prices and real matched liquidity when reachable.
- **Fixed a critical bug:** `/api/matches` still had a leftover `if (!CFG.API_KEY)`
  gate from the old Odds API. It would have returned HTTP 500 forever. Removed.

---

## Per-Provider Detail

### Stake — odds are REAL ✅
- Query requests `fixtureMarkets { name odds { name price } }`.
- Transform maps each outcome to home/draw/away **by name** (falls back to position
  for numeric-only feeds), so the price next to a team is that team's price.
- Only one real back level exists in this feed, so we show one level — we do **not**
  pad a fake 3-deep ladder. Lay = back + one tick (clearly derived).
- Score read from `score.home` / `score.away`.
- **Tested:** 3-way named, 2-way numeric, and no-odds cases all pass. See test output
  in the build log.

### FanCode — odds unavailable (honest) ⛔
- FanCode is a streaming/score platform. Its public GraphQL doesn't expose betting
  odds, so `oddsAvailable: false`, all ladders `null`, `markets: 0`.
- Basic live query returns match status but not a numeric scoreline, so score shows
  "In progress" while live. Adding real scores would need FanCode's per-match
  scorecard query (not currently wired).

### SofaScore — scores REAL, odds unavailable ⛔/✅
- `homeScore.current` / `awayScore.current` parsed for live scores — this is real.
- SofaScore does have a separate odds API, but it's a different endpoint and often
  region-gated; not wired. Odds marked unavailable rather than faked.

### LiveScore — scores real if fields match ⚠️
- Reads `Home.Score` / `Away.Score` and `Home.Name` / `Away.Name`. These field names
  are based on LiveScore's public CDN shape but were **not** confirmable against a
  live response here. If your live payload differs, scores need a field-name tweak.
- No odds (score feed). Marked unavailable.

### Reddy66 — real BetFair odds if IP allowed 🔶
- `enrichReddy66Odds()` POSTs to `/catalog/v2/sports-feed/sports/markets` for the top
  live events and parses `availableToBack` / `availableToLay` (real price + size).
- **Tested** against a mock BetFair payload: real prices and real liquidity parse
  correctly; unrecognised payloads don't crash and don't fake.
- **Caveat:** Robuzz hard-blocks most VPS IPs (you documented this). Without a
  residential proxy / allowed IP you'll get 403 and the matches stay odds-unavailable.
  Set `REDDY66_PROXY` if you have one.

### ReddyBook — real odds + cricket score if reachable 🔶
- `enrichReddyBookData()` batches market IDs to `/ws/getMarketData` for odds and calls
  `/ws/getScoreData` per live event for cricket runs/wickets/overs.
- Uses the same tested BetFair parser for odds; cricket score parser handles common
  `runs/wickets/overs` shapes.
- **Caveat:** Primary `api.dcric99.com` is Cloudflare-blocked from your VPS; fallback
  `v9.jarvisexch.com` serves stale 2024 data. Exact `/ws/*` response field names
  couldn't be confirmed live, so the score/odds field mapping may need one small
  adjustment once you see a real response.

---

## The One Thing I Still Need From You

For **Reddy66** and **ReddyBook**, the odds/score *endpoints are wired and the parser
is tested*, but the exact JSON field names inside `/ws/getMarketData` and
`/ws/getScoreData` (and Robuzz `/markets`) weren't confirmable from here because I
can't reach those hosts. If you paste one real response from any of them, I'll tune
the field mapping so it's exact rather than best-effort. Until then the parser tries
the common shapes and safely shows "odds unavailable" if it doesn't recognise the data
— it will never invent numbers.

---

## How To Verify Yourself

```bash
node server.js
# In another terminal:
curl http://localhost:8787/api/health | jq
#   → matchesWithLiveOdds tells you how many have real odds
#   → matchesScoreOnly tells you how many are score-only

curl http://localhost:8787/api/matches | jq '.[] | {provider, oddsAvailable, teamA: .teamA.name, back}'
#   → oddsAvailable:true  = real odds parsed
#   → oddsAvailable:false = score-only provider or odds endpoint unreachable
#   → back is null (never fake numbers) when odds unavailable
```

If `back` is ever a number for a match where `oddsAvailable` is false, that's a bug —
report it. By design those two always agree.
