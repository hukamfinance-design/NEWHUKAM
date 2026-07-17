# HukamBook v2 — Provider Reference & Integration Guide

## Provider Status Matrix (July 2024)

| Provider | Status | Auth | Sports | Odds | Live | Latency | Note |
|----------|--------|------|--------|------|------|---------|------|
| **Stake** | ✅ Working | None | Football + | Yes | Yes | ~500ms | Primary, no IP issues |
| **Reddy66** | ⚠️ IP Blocked | Token | Cricket/Football | Yes | Yes | ~1s | Needs allowed/residential IP |
| **ReddyBook Primary** | ⚠️ CF 403 | None | Cricket/Football | Yes | Yes | N/A | Blocked without allowed IP |
| **ReddyBook Fallback** | ✅ Working | None | Cricket/Football | Yes | Stale | ~800ms | Has 2024 data only |
| **AllPanelExch** | ❌ Not Available | Unknown | Unknown | Unknown | Unknown | N/A | Unavailable, needs mirror/HAR |

---

## Provider 1: Stake (GraphQL) — PRIMARY

### What is it?
Stake.com's real-time sports betting exchange API. Fully public, no authentication.

### Endpoint
```
POST https://stake.com/_api/graphql
```

### Example Request
```bash
curl -X POST https://stake.com/_api/graphql \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "query": "query SportTournamentFixtureList { sportTournamentFixtureList(groups: \"winner\", sport: \"soccer\", marketLimit: 1, type: \"live\", tournamentLimit: 50, fixtureCountLimit: 20) { tournament { name fixtures { id name status startDate homeTeam { name } awayTeam { name } score { home away } } } } }"
  }'
```

### Response Structure
```json
{
  "data": {
    "sportTournamentFixtureList": {
      "tournament": [
        {
          "name": "UEFA Champions League",
          "fixtures": [
            {
              "id": "1234567",
              "name": "Real Madrid v Manchester City",
              "status": "IN_PLAY",
              "startDate": "2024-07-15T19:45:00Z",
              "homeTeam": { "name": "Real Madrid" },
              "awayTeam": { "name": "Manchester City" },
              "score": { "home": 2, "away": 1 }
            }
          ]
        }
      ]
    }
  }
}
```

### Query Parameters (GraphQL variables)
- `sport`: "soccer" (string)
- `type`: "live" | "upcoming" (string)
- `groups`: "winner" (string) — bet type
- `marketLimit`: 1 (int) — number of markets per fixture
- `tournamentLimit`: 50 (int) — number of tournaments to return
- `fixtureCountLimit`: 20 (int) — matches per tournament

### Available Sports
- `"soccer"` ✅ Fully supported
- Cricket, tennis, basketball — likely available but not tested
- Check by trying different sport IDs in the query

### Rate Limiting
- **No documented limit** for unauthenticated requests
- Best practice: cache for 30-60s during live events
- No quota tracking needed

### Error Handling
```json
{
  "errors": [
    {
      "message": "Field \"sportTournamentFixtureList\" doesn't accept argument \"type\""
    }
  ]
}
```

Check `response.errors` before using `response.data`.

### Integration in HukamBook
```javascript
async function fetchFromStake() {
  const query = `query SportTournamentFixtureList { ... }`;
  const res = await fetch(CFG.STAKE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  return data.data?.sportTournamentFixtureList?.tournament || [];
}
```

---

## Provider 2: Reddy66 (REST) — ALTERNATIVE

### What is it?
Betting exchange API via Robuzz catalog proxy. Has live odds but blocks certain IP ranges.

### Endpoints

#### Live Events
```
GET https://catalog.robuzz.lol/catalog/v2/sports-feed/sports/live-events
  ?providerId=BetFair
```

Response: `[{ eventId, name, startTime, ... }]`

#### Date Range Search
```
GET https://catalog.robuzz.lol/catalog/v2/sports-feed/sports/events
  ?startDate=2024-07-15T00:00:00Z
  &endDate=2024-07-16T00:00:00Z
  &providerId=BetFair
```

#### Market Data (Odds)
```
POST https://catalog.robuzz.lol/catalog/v2/sports-feed/sports/markets

{
  "providerId": "BetFair",
  "marketsCriteria": "ALL",
  "eventDetails": [{
    "providerId": "BetFair",
    "sportId": "4",
    "competitionId": "COMPETITION_ID",
    "eventId": "EVENT_ID",
    "marketTime": "2024-07-15T20:00:00Z"
  }]
}
```

#### Text Search
```
GET https://catalog.robuzz.lol/catalog/v2/sports-feed/sports/events:search
  ?providerId=BetFair
  &query=India
```

### Status
⚠️ **VPS IP blocked by Robuzz.** Returns 403 unless you have:
- Residential proxy IP
- Allowed IP whitelist
- Same network as Robuzz servers

### Integration Notes
```javascript
async function fetchFromReddy66() {
  const res = await fetch(
    "https://catalog.robuzz.lol/catalog/v2/sports-feed/sports/live-events?providerId=BetFair"
  );
  // Likely 403 from your IP
}
```

If you have a residential proxy:
```env
PROXY_URL=https://your-proxy.example.com
```

---

## Provider 3: ReddyBook (REST) — FALLBACK

### What is it?
Cricket/sports exchange with guest API. Two endpoints:
- **Primary:** `https://api.dcric99.com` (often Cloudflare 403)
- **Fallback:** `https://v9.jarvisexch.com` (working, but stale 2024 data)

### Guest Endpoints (No Auth)

#### Get Events (Live/Upcoming)
```bash
GET https://v9.jarvisexch.com/api/guest/events \
  -H "Accept: application/json"
```

Response:
```json
[
  {
    "event_id": 33780681,
    "name": "South Africa v India",
    "competition_id": 9992899,
    "competition_name": "International Twenty20 Matches",
    "event_type_id": 4,
    "in_play": 1,
    "market_id": "1.235986531",
    "open_date_format": "2024-11-15T15:00:00.000000Z"
  },
  ...
]
```

**Response Fields:**
- `event_id` (int) — unique event identifier
- `name` (string) — "Team A v Team B"
- `competition_name` (string) — league/tournament
- `in_play` (0|1) — is match currently live?
- `open_date_format` (ISO 8601) — start time
- `market_id` (string) — Betfair market ID

#### Get Events List
```bash
GET https://v9.jarvisexch.com/api/guest/event_list
```

Returns: Similar structure to `/events`

#### Get Menu/Navigation
```bash
GET https://v9.jarvisexch.com/api/guest/menu
```

Returns navigation structure and available competitions.

#### Get Single Event
```bash
GET https://v9.jarvisexch.com/api/guest/event?event_id=33780681
POST https://v9.jarvisexch.com/api/guest/event
  -d "event_id=33780681"
```

#### Get Races
```bash
GET https://v9.jarvisexch.com/api/guest/races
```

Horse racing events.

### Market Data Endpoints

#### Get Market Data
```bash
GET https://v9.jarvisexch.com/ws/getMarketData
POST https://v9.jarvisexch.com/ws/getMarketData
  -d "market_ids=1.235986531,1.235986532"
```

Returns odds, liquidity, matched bets for each market.

#### Get Market Data (New)
```bash
GET https://v9.jarvisexch.com/ws/getMarketDataNew
```

Updated version with additional fields.

#### Get Score Data
```bash
POST https://v9.jarvisexch.com/ws/getScoreData
  -d "event_ids=33780681"
```

Returns live score, overs, wickets for cricket events.

### Status & Data Quality
- ✅ Guest endpoints return HTTP 200
- ⚠️ **Data is stale** — showing 2024 events in July 2024
- ⚠️ Primary API (api.dcric99.com) returns 403 Cloudflare
- ✅ **Working fallback** automatically used by v2 server

### Integration in HukamBook
```javascript
async function fetchFromReddyBook() {
  let baseUrl = CFG.REDDYBOOK_PRIMARY;
  try {
    // Try primary, fall back if blocked
    let res = await fetch(`${baseUrl}/api/guest/events`);
    if (!res.ok) baseUrl = CFG.REDDYBOOK_FALLBACK;
    
    res = await fetch(`${baseUrl}/api/guest/events`);
    const events = await res.json();
    return events.map(ev => reddyEventToHukamMatch(ev));
  } catch (e) {
    console.error("[ReddyBook]", e);
    throw e;
  }
}
```

---

## Provider 4: Reddy66 Alternative (Alternative Catalog)

### What is it?
Same as Reddy66 but with different catalog URL.

### Endpoints
```
GET https://catalog2.robuzz.lol/... (if available)
GET https://catalog-v2.robuzz.lol/...
```

### Status
❌ Not tested. Likely also blocked without allowed IP.

---

## Provider 5: AllPanelExch — PENDING

### What is it?
Betting exchange, likely cricket-focused.

### Domains
- `allpanelexch9.co` (redirects to fallback)
- `www.allpanelexch9.co` (Namecheap redirect)
- Fallback: `fallback.testcfsites.com`

### Status
❌ **Currently unavailable.** Returns 403 on all domains.

### To Make It Work
Need one of:
1. **Working mirror domain** (currently offline)
2. **Browser HAR export** (with Authorization headers)
3. **Allowed IP** from the panel's whitelist

### Integration (Future)
```javascript
async function fetchFromAllPanelExch() {
  // TODO: needs mirror or HAR
  // Similar to ReddyBook, would expose REST API
}
```

---

## How to Add a New Provider

### Step 1: Create Fetch Function
```javascript
async function fetchFromMyProvider() {
  try {
    const res = await fetch("https://api.example.com/events");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    const matches = data.map(ev => myProviderToHukamMatch(ev)).filter(Boolean);
    
    cache.providerHealth.myprovider = {
      ok: true,
      timestamp: Date.now(),
      matchCount: matches.length
    };
    
    return matches;
  } catch (e) {
    cache.providerHealth.myprovider = {
      ok: false,
      error: String(e.message),
      timestamp: Date.now()
    };
    throw e;
  }
}
```

### Step 2: Create Transform Function
```javascript
function myProviderToHukamMatch(event) {
  // Must return object matching HukamBook schema:
  return {
    id: event.id,
    sport: "cricket" || "football",
    league: event.league,
    teamA: {
      name: event.team1,
      short: shortName(event.team1),
      flag: flagFor(event.team1, "cricket"),
      score: event.score1 || "—",
      overs: event.overs1 || ""
    },
    teamB: {
      name: event.team2,
      short: shortName(event.team2),
      flag: flagFor(event.team2, "cricket"),
      score: event.score2 || "—",
      overs: event.overs2 || ""
    },
    status: event.live ? "live" : "upcoming",
    time: event.live ? "Live now" : istTime(event.startTime),
    info: event.live ? "🔴 Match in progress" : `Starts ${istTime(event.startTime)}`,
    back: [
      { odds: event.odds1 || 1.95, stake: "5K" },
      { odds: event.odds2 || 2.00, stake: "4K" },
      { odds: event.odds3 || 2.05, stake: "3K" }
    ],
    lay: [
      { odds: 1.96, stake: "5K" },
      { odds: 2.02, stake: "4K" },
      { odds: 2.08, stake: "3K" }
    ],
    backB: [...],
    layB: [...],
    draw: event.sport === "football" ? [...] : null,
    markets: 1,
    fancy: [],
    provider: "MyProvider"
  };
}
```

### Step 3: Register in Refresh Chain
In `refreshCache()`:
```javascript
const providers = [
  { name: "Stake", fetch: fetchFromStake },
  { name: "ReddyBook", fetch: fetchFromReddyBook },
  { name: "MyProvider", fetch: fetchFromMyProvider },  // ← Add here
];
```

### Step 4: Test
```bash
node server.js
curl http://localhost:8787/api/matches
curl http://localhost:8787/api/health
```

Check logs for provider being used and health status.

---

## HukamBook Schema (Reference)

Every match must conform to this schema:

```typescript
interface HukamMatch {
  id: string;
  sport: "cricket" | "football" | "tennis";
  league: string;
  teamA: {
    name: string;
    short: string;     // 3-char abbreviation
    flag: string;      // emoji
    score: string;     // "120" or "—" or "In progress"
    overs: string;     // "20.0" for cricket
  };
  teamB: HukamTeam;
  status: "live" | "upcoming";
  time: string;        // "Live now" or "HH:MM IST"
  info: string;        // description
  back: Array<{
    odds: number;      // decimal odds
    stake: string;     // "5K" pseudo-liquidity
  }>;
  lay: Array<{ odds, stake }>;
  backB: Array<{ odds, stake }>;
  layB: Array<{ odds, stake }>;
  draw: null | Array<{ odds, stake, side: "back"|"lay" }>;
  markets: number;     // count of real bookmakers/exchanges
  fancy: Array<any>;   // session/fancy markets (cricket)
  provider: string;    // "Stake" | "ReddyBook" etc.
}
```

---

## Troubleshooting Provider Failures

### Stake fails with 500 error
- Check GraphQL query syntax (stringification issues)
- Verify node_modules installed: `npm install`
- Stake API may be temporarily down (rare)

### ReddyBook Primary always 403
- Normal! Cloudflare blocks non-whitelisted IPs
- Fallback `v9.jarvisexch.com` is tried automatically
- To use primary: add your IP to whitelist or use proxy

### Provider X returns empty array
- Likely no live events at that moment
- Check `/api/health` for error messages
- Look at server logs for full error

### Cache never updates
- Check if `CACHE_TTL_SECONDS` is very high
- Monitor `cacheAgeSeconds` in `/api/health`
- Logs should show "[refresh]" on each update

---

## Testing New Providers (Locally)

```bash
# 1. Test provider API directly
curl https://api.example.com/events -H "Accept: application/json"

# 2. Check response schema
curl ... | jq '.[0]'

# 3. Add provider to server.js
# (follow steps above)

# 4. Restart and test
node server.js
curl http://localhost:8787/api/health | jq '.providerHealth'

# 5. Check match output
curl http://localhost:8787/api/matches | jq '.[0]'
```

---

**Provider Reference v2.0** | Last Updated: July 2024
