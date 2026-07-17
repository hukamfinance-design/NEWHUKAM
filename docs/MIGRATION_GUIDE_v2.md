# HukamBook Backend v2 — Migration Guide

## What Changed?

**Old System (v1):**
- Single provider: The Odds API
- Required API key ($29-49/month)
- Credit-based quota system
- Limited to configured sports

**New System (v2):**
- **Multi-provider** with smart fallback chain
- **Zero API keys required** for primary source (Stake)
- No quota limits or monthly bills
- Automatic provider switching on failure
- Better support for cricket & sports exchanges

---

## Providers in v2

### 1. **Stake** ✅ PRIMARY (WORKING)
- **API:** `https://stake.com/_api/graphql`
- **Sport:** Football (soccer) + emerging markets
- **Auth:** None required
- **Live Odds:** Real decimal odds parsed from Stake's response (one back level + derived lay). Other providers vary — see ODDS_AND_SCORES_STATUS.md for the honest per-provider breakdown.
- **Status:** Fully working, no IP blocking
- **Response Time:** ~500ms

```bash
curl -X POST https://stake.com/_api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { sportTournamentFixtureList(sport:\"soccer\",type:\"live\",tournamentLimit:50,fixtureCountLimit:20) { tournament { name fixtures { id name status startDate score { home away } } } } }"
  }'
```

### 2. **ReddyBook** 🔄 FALLBACK
- **Primary:** `https://api.dcric99.com` (often Cloudflare-blocked)
- **Fallback:** `https://v9.jarvisexch.com` (working but stale 2024 data)
- **Sport:** Cricket + Football
- **Auth:** Guest endpoints (`/api/guest/*`)
- **Guest Routes Available:**
  - `GET /api/guest/events` — live & upcoming events
  - `GET /api/guest/event_list` — event list
  - `GET /api/guest/menu` — menu structure
  - `GET /api/guest/event` — single event details
  - `GET /api/guest/races` — race events
  - `POST /api/guest/event` — event with body params
- **Odds:** Market data at `/ws/getMarketData`
- **Status:** Partial (fallback has stale 2024 events)
- **Note:** Needs allowed IP or working proxy for primary API

---

## Migration from v1 → v2

### Step 1: No Action Needed
Your existing `.env` file will still load, but these keys are now **ignored:**
```env
ODDS_API_KEY=xyz          # ← Ignored in v2
ODDS_API_BASE=...         # ← Ignored in v2
ODDS_REGIONS=uk           # ← Ignored in v2
QUOTA_RESERVE=25          # ← Ignored in v2
```

### Step 2: Update `.env` (Optional)
Copy the new settings from `.env.example`:

```env
PORT=8787
CACHE_TTL_SECONDS=60
LIVE_CACHE_TTL_SECONDS=30
ALLOWED_ORIGIN=*

# Optional: If you have a proxy for ReddyBook's primary API
# PROXY_URL=https://your-proxy.com
```

### Step 3: No Rebuild Needed
Just restart the backend:
```bash
npm install  # (if node_modules missing)
node server.js
```

You'll see:
```
═══════════════════════════════════════════════════════════════
HukamBook Backend v2 (Multi-Provider) on http://localhost:8787
═══════════════════════════════════════════════════════════════
Providers (in order):
  1. Stake (GraphQL) — https://stake.com/_api/graphql
  2. ReddyBook → https://api.dcric99.com
     Fallback → https://v9.jarvisexch.com
Cache TTL: 60s (30s live)
...
```

---

## API Endpoints (Unchanged)

### `GET /api/matches`
**Returns:** Array of matches in HukamBook format

```json
{
  "id": "event_123",
  "sport": "football",
  "league": "International Twenty20 Matches • LIVE",
  "teamA": {
    "name": "South Africa",
    "short": "RSA",
    "flag": "🇿🇦",
    "score": "156/8",
    "overs": "20.0"
  },
  "teamB": {
    "name": "India",
    "short": "IND",
    "flag": "🇮🇳",
    "score": "158/2",
    "overs": "18.3"
  },
  "status": "live",
  "time": "Live now",
  "info": "🔴 Match in progress",
  "back": [
    { "odds": 1.95, "stake": "5K" },
    { "odds": 2.00, "stake": "4K" },
    { "odds": 2.05, "stake": "3K" }
  ],
  "lay": [...],  // back odds + 1 tick
  "backB": [...],
  "layB": [...],
  "draw": [...],  // null for cricket
  "markets": 1,
  "fancy": [],
  "provider": "Stake"
}
```

### `GET /api/health`
**Returns:** System health & provider status

```json
{
  "ok": true,
  "provider": "Stake",
  "providerHealth": {
    "stake": {
      "ok": true,
      "timestamp": 1689123456789,
      "matchCount": 8
    },
    "reddybook": {
      "ok": false,
      "error": "ReddyBook HTTP 403",
      "timestamp": 1689123456000
    }
  },
  "cacheAgeSeconds": 12,
  "cachedMatches": 8,
  "lastUpdated": "2024-07-17T10:30:45.123Z",
  "effectiveTtlSeconds": 60
}
```

---

## Troubleshooting

### No matches appearing?

**Check provider status:**
```bash
curl http://localhost:8787/api/health | jq
```

Look for:
- `"provider": "Stake"` — working
- `"ok": true` in providerHealth — both passed

**If Stake fails:**
- Check internet: `curl https://stake.com/_api/graphql -X POST`
- Check your Node.js version: `node -v` (18+ required)

**If ReddyBook primary fails:**
- This is normal — primary API is often Cloudflare-blocked
- Fallback endpoint (`v9.jarvisexch.com`) is tried automatically
- But fallback has stale 2024 data

### Getting old/stale matches?

**ReddyBook fallback shows 2024 events.** This is because:
- Primary API (`api.dcric99.com`) is blocked without allowed IP
- Fallback (`v9.jarvisexch.com`) hasn't been updated
- Solution: Get an allowed IP or working proxy for primary API

**To use primary ReddyBook API:**
```env
PROXY_URL=https://your-residential-proxy.com
```

Or configure firewall rules to whitelist your VPS IP on `api.dcric99.com`.

### High latency on first request?

v2 tries **Stake first** (usually ~500ms), then **ReddyBook** if needed (~2s). Cache kicks in after first success, keeping response <100ms after that.

---

## Performance Notes

| Metric | v1 | v2 |
|--------|----|----|
| Cost/month | $29+ | $0 |
| API Keys | 1 required | 0 required |
| First response | ~600ms | ~500ms (Stake) |
| Cached response | ~50ms | ~50ms |
| Provider count | 1 | 2+ |
| Fallback on failure | ❌ | ✅ |
| Live odds | Stake only (rest score-only) | Stake real; exchanges real if reachable |
| Cricket support | ✅ | ✅ (ReddyBook) |
| No monthly quota | ❌ | ✅ |

---

## Adding More Providers

Want to add Reddy66, AllPanelExch, or others?

**Pattern:**
```javascript
async function fetchFromNewProvider() {
  try {
    const res = await fetch("https://api.example.com/events");
    const events = await res.json();
    
    const matches = events.map(ev => eventToHukamMatch(ev));
    cache.providerHealth.newprovider = { ok: true, matchCount: matches.length };
    return matches;
  } catch (e) {
    cache.providerHealth.newprovider = { ok: false, error: String(e) };
    throw e;
  }
}

function eventToHukamMatch(event) {
  return {
    id: event.id,
    sport: "cricket",
    league: event.competition,
    teamA: { name: event.team1, ... },
    teamB: { name: event.team2, ... },
    status: event.live ? "live" : "upcoming",
    // ... rest of HukamBook schema
    provider: "NewProvider"
  };
}
```

Then add to `providers` array in `refreshCache()`.

---

## Frontend Changes

**None needed.** The frontend still calls:
- `GET /api/matches` → same response schema
- `GET /api/health` → enhanced with `provider` field

The frontend already handles matches with a `provider` field (it's just displayed as metadata).

---

## Backend Architecture

```
Request → /api/matches
    ↓
Is cache fresh? (< TTL)
    ├─ YES → return cached data ✓
    └─ NO  → refreshCache()
            ↓
        Try Stake (GraphQL)
            ├─ Success → cache + return ✓
            └─ Timeout/Error
                ↓
            Try ReddyBook Primary
                ├─ Success → cache + return ✓
                └─ Timeout/Error
                    ↓
                Try ReddyBook Fallback
                    ├─ Success → cache + return ✓
                    └─ All failed → serve stale cache or error
```

---

## Glossary

- **HIT:** Cache was valid, no API call made
- **MISS:** Cache expired, fresh API call made
- **STALE:** Provider failed, but cached data from before failure is served (marked stale in headers)
- **TTL:** Time To Live — how long cached data is served before refreshing

---

## Questions?

Check `server.js` for inline comments on the provider implementations. Each provider has:
- Fetch function with error handling
- Transform function to HukamBook schema
- Health tracking in `cache.providerHealth`

---

**v2 Release:** July 2024  
**Maintainer:** HukamBook Team
