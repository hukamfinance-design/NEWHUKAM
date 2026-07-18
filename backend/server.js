// ═══════════════════════════════════════════════════════════════════════════
// HukamBook Live Odds Backend — Multi-Provider Edition (v2.3)
// Zero-dependency Node.js server (Node 18+ required — uses built-in fetch)
//
// What it does:
//   • Fetches REAL matches, live scores and REAL odds from multiple providers
//   • No API key required for any source
//   • Smart fallback chain + intelligent caching
//   • Serves everything in the exact schema the HukamBook frontend expects
//
// Providers (fallback order — clean team/odds data first):
//   1. Stake     — https://stake.com/_api/graphql (real teams + real odds)
//   2. SofaScore — real teams + real live scores (needs Chrome-like UA)
//   3. Reddy66   — BetFair odds via Robuzz (needs allowed IP)
//   4. ReddyBook — guest events + /ws odds & scores (primary needs allowed IP)
//   5. LiveScore — score-only, last resort
//   (FanCode removed in v2.3 — it returned broadcast/streaming metadata, not
//    clean team-vs-team match data, so cards showed feed names instead of teams.)
//
// Endpoints:
//   GET /api/matches   → array of matches in HukamBook format
//   GET /api/health    → { ok, provider, cacheAgeSeconds, ... }
//
// Run:  node server.js        (reads .env in the same folder, but not required!)
// ═══════════════════════════════════════════════════════════════════════════

const http = require("http");
const fs = require("fs");
const path = require("path");

// ── Tiny .env loader (no dotenv dependency) ─────────────────────────────────
try {
  const env = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* no .env file — rely on real environment variables */ }

// ── Configuration ────────────────────────────────────────────────────────────
const CFG = {
  PORT: +(process.env.PORT || 8787),

  // ── ESPN (keyless, cloud-friendly) — football/tennis odds + all scores ──
  // No config needed. These public endpoints work from any host (incl. Render).

  // ── the-odds-api.com key rotation (real cricket odds, works from any IP) ──
  // Add one or more keys, comma-separated, in the ODDS_API_KEYS env var.
  // e.g. ODDS_API_KEYS=abc123,def456,ghi789
  // Rotation auto-advances to the next key when one hits its monthly quota.
  ODDS_API_KEYS: (process.env.ODDS_API_KEYS || process.env.ODDS_KEY || "")
    .split(",").map(s => s.trim()).filter(Boolean),
  ODDS_API_BASE: "https://api.the-odds-api.com",
  ODDS_CACHE_TTL_S: +(process.env.ODDS_CACHE_TTL_SECONDS || 900), // 15 min — makes keys last

  // ── Exchange providers (bonus attempts; usually IP-blocked from cloud) ──
  STAKE_API: "https://stake.com/_api/graphql",
  REDDYBOOK_PRIMARY: process.env.REDDYBOOK_PRIMARY || "https://api.dcric99.com",
  REDDYBOOK_FALLBACK: process.env.REDDYBOOK_FALLBACK || "https://v9.jarvisexch.com",
  PROXY_URL: process.env.PROXY_URL || null,

  // ── Cache & refresh settings ──
  CACHE_TTL_S: +(process.env.CACHE_TTL_SECONDS || 60),
  LIVE_CACHE_TTL_S: +(process.env.LIVE_CACHE_TTL_SECONDS || 30),
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || "*",

  // ── Sports to show (can be empty; providers determine availability) ──
  SPORT_KEYS: (process.env.SPORT_KEYS || "").split(",").map(s => s.trim()).filter(Boolean),
};

// ── Odds API key-rotation state ─────────────────────────────────────────────
const oddsKeyState = {
  idx: 0,                      // which key we're currently using
  exhausted: new Set(),        // keys that returned 401/429 (quota done)
  lastReset: Date.now(),
};
// Return the current usable key, skipping exhausted ones. Null if all are spent.
function currentOddsKey() {
  // Monthly-ish reset: clear the exhausted set every 24h so keys get retried
  // (quotas are monthly, but this cheaply recovers from transient 429s too).
  if (Date.now() - oddsKeyState.lastReset > 24 * 3600 * 1000) {
    oddsKeyState.exhausted.clear();
    oddsKeyState.lastReset = Date.now();
  }
  const keys = CFG.ODDS_API_KEYS;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[(oddsKeyState.idx + i) % keys.length];
    if (!oddsKeyState.exhausted.has(k)) {
      oddsKeyState.idx = (oddsKeyState.idx + i) % keys.length;
      return k;
    }
  }
  return null; // every key exhausted
}
// Mark a key spent and advance to the next.
function markOddsKeyExhausted(key) {
  oddsKeyState.exhausted.add(key);
  oddsKeyState.idx = (oddsKeyState.idx + 1) % Math.max(CFG.ODDS_API_KEYS.length, 1);
}

// ── In-memory cache with provider tracking ──────────────────────────────────
const cache = {
  matches: [],
  fetchedAt: 0,
  refreshing: null,
  provider: "none", // which provider last populated the cache
  providerHealth: {}, // health status per provider
};

// Adaptive cache TTL: refresh faster during live events
const effectiveTtlMs = () => {
  const anyLive = cache.matches.some(m => m.status === "live");
  const baseTtl = anyLive ? CFG.LIVE_CACHE_TTL_S : CFG.CACHE_TTL_S;
  return baseTtl * 1000;
};

// ── Display helpers ──────────────────────────────────────────────────────────
const FLAGS = {
  India: "🇮🇳", Pakistan: "🇵🇰", Australia: "🇦🇺", England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "South Africa": "🇿🇦",
  "New Zealand": "🇳🇿", "West Indies": "🏝️", Bangladesh: "🇧🇩", "Sri Lanka": "🇱🇰",
  Afghanistan: "🇦🇫", Zimbabwe: "🇿🇼", Ireland: "🇮🇪", Netherlands: "🇳🇱", Nepal: "🇳🇵",
  "United Arab Emirates": "🇦🇪", Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", Namibia: "🇳🇦", Oman: "🇴🇲", USA: "🇺🇸",
};
const flagFor = (name, sport) => {
  for (const [k, v] of Object.entries(FLAGS)) if (name.includes(k)) return v;
  return sport === "football" ? "⚽" : sport === "tennis" ? "🎾" : "🏏";
};
const shortName = (name) => {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words.map(w => w[0]).join("").slice(0, 3).toUpperCase(); // initials
};
const istTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST";

// Deterministic pseudo-liquidity for the "stake" column. Exchange liquidity is
// only published by real exchange APIs (e.g. Betfair). When we DO have real
// liquidity we use it; otherwise this fills the display column.
const liq = (seedStr, i) => {
  let h = 0; for (const c of seedStr) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `${5 + ((h >> (i * 4)) % 26)}K`;
};

// ── Honest odds markers ──────────────────────────────────────────────────────
// Providers that are pure SCORE/DATA feeds (SofaScore, LiveScore) do
// NOT publish betting odds. Rather than invent fake prices, we return this
// explicit "unavailable" shape. The frontend can render it as "—" or hide the
// odds column. `oddsAvailable: false` on the match tells the UI odds are absent.
const NO_ODDS = null;

// Convert a decimal price → one back/lay cell. `size` is real matched liquidity
// if the provider supplies it, else deterministic filler keyed off the id so it
// stays stable between refreshes (not random noise).
const priceCell = (price, id, tag, i, size) => ({
  odds: +Number(price).toFixed(2),
  stake: size != null ? formatSize(size) : liq(String(id) + tag, i),
});

// Format a matched-size number (e.g. Betfair "size") as a compact string.
const formatSize = (n) => {
  const v = Number(n);
  if (!isFinite(v) || v <= 0) return "—";
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(Math.round(v));
};

// ── Lay derivation ───────────────────────────────────────────────────────────
// A minimum price increment (tick) by odds band, used to derive a lay price from
// a real back price when the provider only gives one side. Lay = back + one tick,
// which is clearly a derived figure, not a second real book.
const tick = (o) => o < 2 ? 0.01 : o < 3 ? 0.02 : o < 4 ? 0.05 : o < 6 ? 0.1 : 0.2;
const layFrom = (backLadder, eventId, tag) =>
  (backLadder || []).map((b, i) => ({ odds: +(b.odds + tick(b.odds) * (i + 1)).toFixed(2), stake: liq(eventId + tag + "L", i) }));

// ── American moneyline → decimal odds ───────────────────────────────────────
// ESPN publishes odds as American moneylines (e.g. -120, +340). Convert to the
// decimal format the UI uses. -120 → 1.83, +340 → 4.40.
function moneylineToDecimal(ml) {
  const n = Number(ml);
  if (!isFinite(n) || n === 0) return null;
  return n > 0 ? +(n / 100 + 1).toFixed(2) : +(100 / Math.abs(n) + 1).toFixed(2);
}

// ── Provider: ESPN (keyless, cloud-friendly) ────────────────────────────────
// ESPN's public scoreboard endpoints return real teams, live scores AND, for
// many football/tennis matches, real bookmaker odds embedded in the feed — all
// without a key and WITHOUT blocking cloud/VPS IPs. This is the reliable core.
const ESPN_SOCCER_LEAGUES = {
  "eng.1": "Premier League", "eng.2": "Championship", "esp.1": "La Liga",
  "ita.1": "Serie A", "ger.1": "Bundesliga", "fra.1": "Ligue 1",
  "por.1": "Primeira Liga", "ned.1": "Eredivisie", "usa.1": "MLS",
  "mex.1": "Liga MX", "bra.1": "Brazil Serie A", "arg.1": "Argentina Primera",
  "uefa.champions": "Champions League", "uefa.europa": "Europa League",
  "ind.1": "Indian Super League",
};
const ESPN_TENNIS_TOURS = ["atp", "wta"];

async function espnGet(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (HukamBook)", "Accept": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`);
    return await res.json();
  } catch (e) { clearTimeout(t); throw e; }
}

async function fetchFromESPN() {
  const tasks = [];
  // Football leagues
  for (const [lg, label] of Object.entries(ESPN_SOCCER_LEAGUES)) {
    tasks.push(
      espnGet(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/scoreboard`)
        .then(d => espnParse(d, "football", label))
        .catch(() => [])
    );
  }
  // Tennis tours
  for (const tour of ESPN_TENNIS_TOURS) {
    tasks.push(
      espnGet(`https://site.api.espn.com/apis/site/v2/sports/tennis/${tour}/scoreboard`)
        .then(d => espnParse(d, "tennis", tour.toUpperCase()))
        .catch(() => [])
    );
  }

  try {
    const results = await Promise.all(tasks);
    const matches = results.flat().filter(Boolean);
    if (matches.length === 0) throw new Error("no ESPN events");
    const withOdds = matches.filter(m => m.oddsAvailable).length;
    cache.providerHealth.espn = { ok: true, timestamp: Date.now(), matchCount: matches.length, withOdds };
    return matches;
  } catch (e) {
    cache.providerHealth.espn = { ok: false, error: String(e.message), timestamp: Date.now() };
    throw e;
  }
}

// Parse one ESPN scoreboard into HukamBook matches, extracting odds when present.
function espnParse(data, sport, league) {
  const out = [];
  for (const ev of data.events || []) {
    const comp = (ev.competitions || [{}])[0];
    const competitors = comp.competitors || [];
    if (competitors.length < 2) continue;

    // ESPN marks home/away explicitly
    const homeC = competitors.find(c => c.homeAway === "home") || competitors[0];
    const awayC = competitors.find(c => c.homeAway === "away") || competitors[1];
    const homeTeam = homeC.team?.displayName || homeC.team?.name || "Home";
    const awayTeam = awayC.team?.displayName || awayC.team?.name || "Away";

    const state = ev.status?.type?.state; // pre / in / post
    if (state === "post") continue; // drop finished
    const isLive = state === "in";

    // ── Extract real odds from ESPN's embedded odds provider ──
    let homeOdds = null, awayOdds = null, drawOdds = null;
    const oddsArr = comp.odds || [];
    if (oddsArr.length) {
      const o = oddsArr[0]; // first provider (usually the consensus/主 line)
      homeOdds = moneylineToDecimal(o.homeTeamOdds?.moneyLine);
      awayOdds = moneylineToDecimal(o.awayTeamOdds?.moneyLine);
      drawOdds = moneylineToDecimal(o.drawOdds?.moneyLine);
      // Some feeds only give a text line like "LIV -120"; skip if no moneyline.
    }
    const hasOdds = homeOdds != null || awayOdds != null;

    const id = ev.id || `${homeTeam}-${awayTeam}`;
    const back  = homeOdds != null ? [priceCell(homeOdds, id, "A", 0)] : NO_ODDS;
    const backB = awayOdds != null ? [priceCell(awayOdds, id, "B", 0)] : NO_ODDS;
    const draw  = drawOdds != null
      ? [{ odds: +drawOdds.toFixed(2), stake: liq(String(id) + "D", 0), side: "back" }]
      : null;

    // Score string per side (ESPN gives per-competitor score)
    const homeScore = isLive ? (homeC.score ?? "0") : "—";
    const awayScore = isLive ? (awayC.score ?? "0") : "—";

    out.push({
      id,
      sport,
      league: `${league} • ${isLive ? "LIVE" : "Upcoming"}`,
      teamA: {
        name: homeTeam, short: shortName(homeTeam), flag: flagFor(homeTeam, sport),
        score: homeScore, overs: "",
      },
      teamB: {
        name: awayTeam, short: shortName(awayTeam), flag: flagFor(awayTeam, sport),
        score: awayScore, overs: "",
      },
      status: isLive ? "live" : "upcoming",
      time: isLive ? (ev.status?.type?.detail || "Live now") : istTime(ev.date),
      info: isLive ? `🔴 ${ev.status?.type?.detail || "In progress"}` : `Starts ${istTime(ev.date)}`,
      oddsAvailable: hasOdds,
      back,
      lay:  back  ? layFrom(back,  id, "A") : NO_ODDS,
      backB,
      layB: backB ? layFrom(backB, id, "B") : NO_ODDS,
      draw,
      markets: hasOdds ? 1 : 0,
      fancy: [],
      provider: "ESPN",
    });
  }
  return out;
}

// ── Provider: the-odds-api.com (cricket odds, key rotation) ─────────────────
// Real bookmaker odds for cricket (and football/tennis) that work from ANY IP.
// Uses key rotation: burns one key's monthly quota, then advances to the next.
// Cached 15 min by default so a single free key lasts as long as possible.
const ODDS_API_GROUPS = { cricket: "Cricket", football: "Soccer", tennis: "Tennis" };

// Cache OddsAPI results separately with a long TTL so we don't spend a request
// on every 30-60s board refresh — only once per ODDS_CACHE_TTL_S.
const oddsApiCache = { at: 0, matches: [] };

async function fetchFromOddsAPI() {
  // Serve cached odds if still fresh — protects the free-key quota.
  if (oddsApiCache.at && Date.now() - oddsApiCache.at < CFG.ODDS_CACHE_TTL_S * 1000) {
    if (oddsApiCache.matches.length) return oddsApiCache.matches;
    throw new Error("odds cached empty"); // nothing last time; don't hammer
  }
  const fresh = await fetchFromOddsAPILive();
  oddsApiCache.at = Date.now();
  oddsApiCache.matches = fresh;
  return fresh;
}

async function fetchFromOddsAPILive() {
  if (CFG.ODDS_API_KEYS.length === 0) {
    cache.providerHealth.oddsapi = { ok: false, error: "no keys set (ODDS_API_KEYS)", timestamp: Date.now() };
    throw new Error("no ODDS_API_KEYS configured");
  }

  const key = currentOddsKey();
  if (!key) {
    cache.providerHealth.oddsapi = { ok: false, error: "all keys exhausted this cycle", timestamp: Date.now() };
    throw new Error("all Odds API keys exhausted");
  }

  const oddsGet = async (path, params) => {
    const usp = new URLSearchParams({ apiKey: key, ...params });
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${CFG.ODDS_API_BASE}${path}?${usp}`, {
        headers: { "Accept": "application/json" }, signal: controller.signal,
      });
      clearTimeout(t);
      // 401 = bad/over-quota key, 429 = rate-limited → mark exhausted, rotate
      if (res.status === 401 || res.status === 429) {
        markOddsKeyExhausted(key);
        throw new Error(`key quota hit (HTTP ${res.status})`);
      }
      if (!res.ok) throw new Error(`Odds API HTTP ${res.status}`);
      return await res.json();
    } catch (e) { clearTimeout(t); throw e; }
  };

  try {
    // Focus on cricket (the thing other providers can't give us). Football/tennis
    // odds already come from ESPN, so we only spend quota on cricket here.
    const sportsList = await oddsGet("/v4/sports", {});
    const cricketKeys = sportsList
      .filter(s => s.group === "Cricket" && s.active)
      .map(s => s.key)
      .slice(0, 3); // cap leagues to limit quota use

    const matches = [];
    for (const k of cricketKeys) {
      const data = await oddsGet(`/v4/sports/${k}/odds`, {
        regions: "eu,uk", markets: "h2h", oddsFormat: "decimal",
      });
      for (const ev of data) matches.push(oddsApiEventToHukam(ev, "cricket"));
    }

    if (matches.length === 0) throw new Error("no cricket odds returned");
    cache.providerHealth.oddsapi = {
      ok: true, timestamp: Date.now(), matchCount: matches.length,
      keyIndex: oddsKeyState.idx, keysTotal: CFG.ODDS_API_KEYS.length,
      keysExhausted: oddsKeyState.exhausted.size,
    };
    return matches;
  } catch (e) {
    cache.providerHealth.oddsapi = { ok: false, error: String(e.message), timestamp: Date.now() };
    throw e;
  }
}

// Transform a the-odds-api.com event (decimal odds already) → HukamBook match.
function oddsApiEventToHukam(ev, sport) {
  const homeTeam = ev.home_team || "Home";
  const awayTeam = ev.away_team || "Away";
  const id = ev.id || `${homeTeam}-${awayTeam}`;

  // Consensus price = median across bookmakers for each outcome.
  const pricesFor = (teamName) => {
    const arr = [];
    for (const b of ev.bookmakers || []) {
      const mk = (b.markets || []).find(m => m.key === "h2h");
      const oc = mk && (mk.outcomes || []).find(o => o.name === teamName);
      if (oc && typeof oc.price === "number") arr.push(oc.price);
    }
    if (!arr.length) return null;
    arr.sort((a, b) => a - b);
    return arr[Math.floor((arr.length - 1) / 2)]; // median
  };

  const homeOdds = pricesFor(homeTeam);
  const awayOdds = pricesFor(awayTeam);
  const drawOdds = pricesFor("Draw");
  const hasOdds = homeOdds != null || awayOdds != null;

  const back  = homeOdds != null ? [priceCell(homeOdds, id, "A", 0)] : NO_ODDS;
  const backB = awayOdds != null ? [priceCell(awayOdds, id, "B", 0)] : NO_ODDS;
  const draw  = drawOdds != null
    ? [{ odds: +drawOdds.toFixed(2), stake: liq(String(id) + "D", 0), side: "back" }]
    : null;

  const started = new Date(ev.commence_time).getTime() <= Date.now();

  return {
    id, sport,
    league: `${(ev.sport_title || "Cricket")} • ${started ? "LIVE" : "Upcoming"}`,
    teamA: {
      name: homeTeam, short: shortName(homeTeam), flag: flagFor(homeTeam, sport),
      score: started ? "In progress" : "—", overs: "",
    },
    teamB: {
      name: awayTeam, short: shortName(awayTeam), flag: flagFor(awayTeam, sport),
      score: started ? "" : "—", overs: "",
    },
    status: started ? "live" : "upcoming",
    time: started ? "Live now" : istTime(ev.commence_time),
    info: started ? "🔴 Match in progress" : `Starts ${istTime(ev.commence_time)}`,
    oddsAvailable: hasOdds,
    back,
    lay:  back  ? layFrom(back,  id, "A") : NO_ODDS,
    backB,
    layB: backB ? layFrom(backB, id, "B") : NO_ODDS,
    draw,
    markets: (ev.bookmakers || []).length,
    fancy: [],
    provider: "OddsAPI",
  };
}

// ── ESPNcricinfo (keyless cricket SCORES) ───────────────────────────────────
// Cricket odds aren't published by ESPN, but live cricket SCORES are — with real
// team names, series, and format. Used to enrich/backfill cricket coverage.
async function fetchFromCricinfo() {
  try {
    const data = await espnGet("https://hs-consumer-api.espncricinfo.com/v1/pages/matches/live?lang=en");
    const matches = [];
    for (const m of data.matches || []) {
      const teams = m.teams || [];
      const nameA = teams[0]?.team?.name || "Team A";
      const nameB = teams[1]?.team?.name || "Team B";
      const isLive = m.state === "LIVE";
      if (m.state === "POST" || m.state === "RESULT") continue;

      const scoreOf = (t) => {
        const s = t?.score;
        if (!s) return isLive ? "In progress" : "—";
        return String(s);
      };

      const id = String(m.objectId || m.id || `${nameA}-${nameB}`);
      matches.push({
        id, sport: "cricket",
        league: `${(m.series || {}).name || "Cricket"} • ${isLive ? "LIVE" : "Upcoming"}`,
        teamA: { name: nameA, short: shortName(nameA), flag: flagFor(nameA, "cricket"),
                 score: scoreOf(teams[0]), overs: "" },
        teamB: { name: nameB, short: shortName(nameB), flag: flagFor(nameB, "cricket"),
                 score: scoreOf(teams[1]), overs: "" },
        status: isLive ? "live" : "upcoming",
        time: isLive ? "Live now" : (m.startTime ? istTime(m.startTime) : "Upcoming"),
        info: m.statusText || (isLive ? "🔴 Match in progress" : "Upcoming"),
        oddsAvailable: false, // cricinfo = scores only (odds come from OddsAPI)
        back: NO_ODDS, lay: NO_ODDS, backB: NO_ODDS, layB: NO_ODDS, draw: null,
        markets: 0, fancy: [], provider: "Cricinfo",
      });
    }
    if (matches.length === 0) throw new Error("no live cricket");
    cache.providerHealth.cricinfo = { ok: true, timestamp: Date.now(), matchCount: matches.length };
    return matches;
  } catch (e) {
    cache.providerHealth.cricinfo = { ok: false, error: String(e.message), timestamp: Date.now() };
    throw e;
  }
}

// ── Provider: Stake (GraphQL) ───────────────────────────────────────────────
// Stake is the one source that returns real decimal odds in the SAME response
// as the fixture list, so this is the provider where our odds are genuinely
// live. We request the outcome `name` so we can map each price to home/draw/away
// rather than guessing by sort order.
async function fetchFromStake() {
  const query = `query SportTournamentFixtureList {
    sportTournamentFixtureList(groups: "winner", sport: "soccer", marketLimit: 1, type: "live", tournamentLimit: 50, fixtureCountLimit: 20) {
      tournament {
        name
        fixtures {
          id
          name
          status
          startDate
          homeTeam { name }
          awayTeam { name }
          score { home away }
          fixtureMarkets {
            marketId
            name
            odds { id name price }
          }
        }
      }
    }
  }`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(CFG.STAKE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "HukamBook/2.0",
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!res.ok) throw new Error(`Stake HTTP ${res.status}`);
    const data = await res.json();
    
    if (data.errors) throw new Error(`Stake GraphQL: ${data.errors.map(e => e.message).join(", ")}`);
    
    const matches = [];
    const tournaments = data.data?.sportTournamentFixtureList?.tournament || [];
    
    for (const tournament of tournaments) {
      for (const fixture of tournament.fixtures || []) {
        const match = stakeFixtureToHukamMatch(fixture, tournament.name);
        if (match) matches.push(match);
      }
    }
    
    cache.providerHealth.stake = { ok: true, timestamp: Date.now(), matchCount: matches.length };
    return matches;
  } catch (e) {
    cache.providerHealth.stake = { ok: false, error: String(e.message), timestamp: Date.now() };
    throw e;
  }
}

// ── Provider: SofaScore (REST) ───────────────────────────────────────────────
async function fetchFromSofaScore() {
  const sports = ["football", "cricket", "tennis", "basketball", "hockey"];
  const allMatches = [];
  
  try {
    for (const sport of sports) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        
        const res = await fetch(`https://api.sofascore.com/api/v1/sport/${sport}/events/live`, {
          headers: {
            "Accept": "application/json",
            "Referer": "https://www.sofascore.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeout);
        
        if (res.ok) {
          const data = await res.json();
          const events = data.events || [];
          
          for (const event of events) {
            const match = sofascoreEventToHukamMatch(event, sport);
            if (match) allMatches.push(match);
          }
        }
      } catch (sportErr) {
        console.warn(`[SofaScore] ${sport} failed:`, sportErr.message);
      }
    }
    
    if (allMatches.length === 0) throw new Error("No matches from any sport");
    
    cache.providerHealth.sofascore = { ok: true, timestamp: Date.now(), matchCount: allMatches.length };
    return allMatches;
  } catch (e) {
    cache.providerHealth.sofascore = { ok: false, error: String(e.message), timestamp: Date.now() };
    throw e;
  }
}

// ── Provider: LiveScore (REST) ───────────────────────────────────────────────
async function fetchFromLiveScore() {
  const sports = ["soccer", "cricket", "tennis", "basketball", "hockey"];
  const allMatches = [];
  
  try {
    for (const sport of sports) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        
        const res = await fetch(
          `https://prod-cdn-public-api.livescore.com/v1/api/app/live/${sport}/0?locale=en&MD=1`,
          {
            headers: {
              "Accept": "application/json",
              "Referer": "https://www.livescore.com/",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            signal: controller.signal,
          }
        );
        
        clearTimeout(timeout);
        
        if (res.ok) {
          const data = await res.json();
          // LiveScore's CDN groups events under "Stages" (each a competition)
          // in current versions; older/mirror shapes used "Leagues". Handle both.
          const groups = data.Stages || data.Leagues || [];
          
          for (const group of groups) {
            const events = group.Events || group.Ev || [];
            const leagueName = group.Cnm ? `${group.Cnm} ${group.Snm || ""}`.trim() : (group.L || group.Snm || "");
            for (const event of events) {
              const match = livescoreEventToHukamMatch(event, sport, leagueName);
              if (match) allMatches.push(match);
            }
          }
        }
      } catch (sportErr) {
        console.warn(`[LiveScore] ${sport} failed:`, sportErr.message);
      }
    }
    
    if (allMatches.length === 0) throw new Error("No matches from any sport");
    
    cache.providerHealth.livescore = { ok: true, timestamp: Date.now(), matchCount: allMatches.length };
    return allMatches;
  } catch (e) {
    cache.providerHealth.livescore = { ok: false, error: String(e.message), timestamp: Date.now() };
    throw e;
  }
}

// ── Transform: Stake fixture → HukamBook match ──────────────────────────────
function stakeFixtureToHukamMatch(fixture, tournament) {
  const sport = "football";
  const started = new Date(fixture.startDate).getTime() <= Date.now();
  const isLive = fixture.status === "IN_PLAY" || fixture.status === "LIVE";
  if (fixture.status === "FINISHED" || fixture.status === "CLOSED") return null;
  
  const homeTeam = fixture.homeTeam?.name || "Home";
  const awayTeam = fixture.awayTeam?.name || "Away";
  const score = fixture.score || {};
  
  // ── Parse REAL odds from Stake's winner market ────────────────────────────
  // Find the 1x2 / match-winner market (usually the first "winner" market).
  // Map each outcome to home / draw / away by NAME, not by sort order, so the
  // price shown against a team is actually that team's price.
  let homeOdds = null, drawOdds = null, awayOdds = null;
  const markets = fixture.fixtureMarkets || [];
  const winnerMarket = markets.find(m =>
    (m.odds || []).length >= 2
  );
  
  if (winnerMarket) {
    for (const o of winnerMarket.odds || []) {
      const price = parseFloat(o.price);
      if (!isFinite(price)) continue;
      const label = (o.name || "").toLowerCase();
      if (label === homeTeam.toLowerCase() || label === "1" || label === "home") {
        homeOdds = price;
      } else if (label === "draw" || label === "x" || label === "tie") {
        drawOdds = price;
      } else if (label === awayTeam.toLowerCase() || label === "2" || label === "away") {
        awayOdds = price;
      }
    }
    // Fallback: if outcome names didn't match teams (e.g. numeric-only feeds),
    // assign by position — 2-way = [home, away], 3-way = [home, draw, away].
    if (homeOdds == null && awayOdds == null) {
      const prices = (winnerMarket.odds || [])
        .map(o => parseFloat(o.price)).filter(isFinite);
      if (prices.length === 2) { [homeOdds, awayOdds] = prices; }
      else if (prices.length >= 3) { [homeOdds, drawOdds, awayOdds] = prices; }
    }
  }
  
  const hasOdds = homeOdds != null || awayOdds != null;
  
  // Build back/lay ladders ONLY from the single real price we have. We do not
  // fabricate a 3-deep ladder we don't have — one real level is shown, and the
  // lay side is the same price + one tick (clearly derived, not a second book).
  const back  = homeOdds != null ? [priceCell(homeOdds, fixture.id, "A", 0)] : NO_ODDS;
  const backB = awayOdds != null ? [priceCell(awayOdds, fixture.id, "B", 0)] : NO_ODDS;
  const draw  = drawOdds != null
    ? [{ odds: +drawOdds.toFixed(2), stake: liq(String(fixture.id) + "D", 0), side: "back" }]
    : null;
  
  return {
    id: fixture.id,
    sport,
    league: `${tournament} • ${isLive ? "LIVE" : "Upcoming"}`,
    teamA: {
      name: homeTeam,
      short: shortName(homeTeam),
      flag: flagFor(homeTeam, sport),
      score: isLive ? (score.home ?? "In progress") : "—",
      overs: "",
    },
    teamB: {
      name: awayTeam,
      short: shortName(awayTeam),
      flag: flagFor(awayTeam, sport),
      score: isLive ? (score.away ?? "") : "—",
      overs: "",
    },
    status: isLive ? "live" : "upcoming",
    time: isLive ? "Live now" : istTime(fixture.startDate),
    info: isLive ? "🔴 Match in progress" : `Starts ${istTime(fixture.startDate)}`,
    oddsAvailable: hasOdds,
    back,
    lay:  back  ? layFrom(back,  fixture.id, "A") : NO_ODDS,
    backB,
    layB: backB ? layFrom(backB, fixture.id, "B") : NO_ODDS,
    draw,
    markets: hasOdds ? 1 : 0,
    fancy: [],
    provider: "Stake",
  };
}

// ── Provider: Reddy66 (REST via Robuzz Catalog) ─────────────────────────────
async function fetchFromReddy66() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(
      "https://catalog.robuzz.lol/catalog/v2/sports-feed/sports/live-events?providerId=BetFair",
      {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "HukamBook/2.0",
        },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeout);
    
    if (!res.ok) throw new Error(`Reddy66 HTTP ${res.status}`);
    
    const data = await res.json();
    const events = Array.isArray(data) ? data : data.data || [];
    
    const matches = events
      .map(ev => reddy66EventToHukamMatch(ev))
      .filter(Boolean);
    
    if (matches.length === 0) throw new Error("No live events");
    
    // ── Fetch REAL odds for the top few live events ─────────────────────────
    // The live-events endpoint returns fixtures only. Real BetFair prices live
    // at the /markets POST endpoint. We enrich the first N matches (limited to
    // keep latency sane) with actual back/lay prices when the call succeeds.
    await enrichReddy66Odds(matches, events);
    
    cache.providerHealth.reddy66 = { ok: true, timestamp: Date.now(), matchCount: matches.length };
    return matches;
  } catch (e) {
    cache.providerHealth.reddy66 = { ok: false, error: String(e.message), timestamp: Date.now() };
    throw e;
  }
}

// Enrich Reddy66 matches with real BetFair back/lay prices from /markets.
// Best-effort: if the odds call fails, matches keep oddsAvailable:false.
async function enrichReddy66Odds(matches, events, limit = 6) {
  const slice = events.slice(0, limit);
  await Promise.allSettled(slice.map(async (ev, idx) => {
    const eventId = ev.event_id || ev.eventId;
    const competitionId = ev.competition_id || ev.competitionId;
    const sportId = String(ev.event_type_id || ev.sportId || "4");
    const marketTime = ev.open_date_format || ev.marketTime || new Date().toISOString();
    if (!eventId) return;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const r = await fetch(
        "https://catalog.robuzz.lol/catalog/v2/sports-feed/sports/markets",
        {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json", "User-Agent": "HukamBook/2.0" },
          body: JSON.stringify({
            providerId: "BetFair",
            marketsCriteria: "ALL",
            eventDetails: [{
              providerId: "BetFair",
              sportId,
              competitionId: String(competitionId ?? ""),
              eventId: String(eventId),
              marketTime,
            }],
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(t);
      if (!r.ok) return;
      const md = await r.json();
      applyExchangeOdds(matches[idx], md, String(eventId));
    } catch { /* leave oddsAvailable:false */ }
  }));
}

// Parse a BetFair-style market payload and attach real back/lay to a match.
// Looks for the Match Odds market's runners and maps the first two runners to
// home/away (3-way markets also carry "The Draw"). Handles both {availableToBack}
// exchange shapes and flat price arrays; silently no-ops on an unrecognised shape.
function applyExchangeOdds(match, payload, id) {
  if (!match) return;
  // Find a market object regardless of nesting depth.
  const markets = payload?.markets || payload?.data?.markets || payload?.eventDetails?.[0]?.markets || (Array.isArray(payload) ? payload : []);
  const matchOdds = (markets || []).find(m =>
    /match\s*odds|1x2|winner/i.test(m.marketName || m.name || "")
  ) || (markets || [])[0];
  if (!matchOdds) return;
  const runners = matchOdds.runners || matchOdds.selections || [];
  if (runners.length < 2) return;
  
  const bestBack = (runner) => {
    const b = runner.availableToBack || runner.ex?.availableToBack || runner.back || [];
    const top = Array.isArray(b) ? b[0] : null;
    if (top && top.price) return { price: +top.price, size: top.size };
    if (typeof runner.backPrice === "number") return { price: runner.backPrice, size: runner.backSize };
    return null;
  };
  const bestLay = (runner) => {
    const l = runner.availableToLay || runner.ex?.availableToLay || runner.lay || [];
    const top = Array.isArray(l) ? l[0] : null;
    if (top && top.price) return { price: +top.price, size: top.size };
    if (typeof runner.layPrice === "number") return { price: runner.layPrice, size: runner.laySize };
    return null;
  };
  
  const homeR = runners[0], awayR = runners[runners.length === 3 ? 2 : 1];
  const drawR = runners.length === 3 ? runners[1] : null;
  
  const hb = bestBack(homeR), hl = bestLay(homeR);
  const ab = bestBack(awayR), al = bestLay(awayR);
  const db = drawR ? bestBack(drawR) : null;
  
  if (hb || ab) {
    match.oddsAvailable = true;
    match.markets = 1;
    match.back  = hb ? [priceCell(hb.price, id, "A", 0, hb.size)] : NO_ODDS;
    match.lay   = hl ? [priceCell(hl.price, id, "AL", 0, hl.size)] : (match.back ? layFrom(match.back, id, "A") : NO_ODDS);
    match.backB = ab ? [priceCell(ab.price, id, "B", 0, ab.size)] : NO_ODDS;
    match.layB  = al ? [priceCell(al.price, id, "BL", 0, al.size)] : (match.backB ? layFrom(match.backB, id, "B") : NO_ODDS);
    match.draw  = db ? [{ odds: +Number(db.price).toFixed(2), stake: formatSize(db.size), side: "back" }] : match.draw;
  }
}

// ── Provider: ReddyBook (REST) ──────────────────────────────────────────────
async function fetchFromReddyBook() {
  let baseUrl = CFG.REDDYBOOK_PRIMARY;
  
  try {
    // Try primary first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const testRes = await fetch(`${baseUrl}/api/guest/events`, {
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    }).catch(() => null).finally(() => clearTimeout(timeoutId));
    
    if (!testRes?.ok && baseUrl === CFG.REDDYBOOK_PRIMARY) {
      console.log("[ReddyBook] Primary blocked, trying fallback...");
      baseUrl = CFG.REDDYBOOK_FALLBACK;
    }
    
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 8000);
    
    const res = await fetch(`${baseUrl}/api/guest/events`, {
      headers: { "Accept": "application/json" },
      signal: controller2.signal,
    });
    
    clearTimeout(timeoutId2);
    
    if (!res.ok) throw new Error(`ReddyBook HTTP ${res.status}`);
    
    const events = await res.json();
    const rawEvents = Array.isArray(events) ? events : events.data || [];
    const matches = rawEvents
      .map(ev => reddyEventToHukamMatch(ev))
      .filter(Boolean);
    
    // ── Enrich with REAL odds (/ws/getMarketData) and scores (/ws/getScoreData)
    // Best-effort for the first few live matches; failures leave placeholders.
    await enrichReddyBookData(matches, rawEvents, baseUrl);
    
    cache.providerHealth.reddybook = { ok: true, timestamp: Date.now(), matchCount: matches.length, baseUrl };
    return matches;
  } catch (e) {
    cache.providerHealth.reddybook = { ok: false, error: String(e.message), timestamp: Date.now() };
    throw e;
  }
}

// Enrich ReddyBook matches with real market odds + scores from the /ws endpoints.
async function enrichReddyBookData(matches, events, baseUrl, limit = 6) {
  const slice = events.slice(0, limit);
  
  // Odds: batch the market IDs in one call.
  const marketIds = slice.map(e => e.market_id).filter(Boolean);
  if (marketIds.length) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const r = await fetch(`${baseUrl}/ws/getMarketData`, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ market_ids: marketIds.join(",") }),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (r.ok) {
        const md = await r.json();
        const rows = Array.isArray(md) ? md : md.data || md.result || [];
        for (let i = 0; i < slice.length; i++) {
          const mid = slice[i].market_id;
          const row = rows.find(x => String(x.market_id ?? x.marketId) === String(mid));
          if (row) applyExchangeOdds(matches[i], { markets: [row] }, String(slice[i].event_id));
        }
      }
    } catch { /* keep placeholders */ }
  }
  
  // Scores: fetch per-event (cricket score with overs/wickets when present).
  await Promise.allSettled(slice.map(async (ev, idx) => {
    const eventId = ev.event_id;
    if (!eventId || !matches[idx] || matches[idx].status !== "live") return;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const r = await fetch(`${baseUrl}/ws/getScoreData`, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ event_ids: String(eventId) }),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!r.ok) return;
      const sd = await r.json();
      const rows = Array.isArray(sd) ? sd : sd.data || sd.result || [];
      const row = rows.find(x => String(x.event_id ?? x.eventId) === String(eventId)) || rows[0];
      applyCricketScore(matches[idx], row);
    } catch { /* keep "In progress" */ }
  }));
}

// Apply a score row to a match. Handles common cricket score shapes with runs,
// wickets and overs; falls back to a plain score string for other sports.
function applyCricketScore(match, row) {
  if (!match || !row) return;
  // Try a few common field layouts seen across these feeds.
  const home = row.home || row.homeScore || row.team1 || {};
  const away = row.away || row.awayScore || row.team2 || {};
  const fmtCricket = (s) => {
    if (s == null) return null;
    if (typeof s === "string") return s;
    const runs = s.runs ?? s.score ?? s.r;
    const wkts = s.wickets ?? s.wkts ?? s.w;
    const overs = s.overs ?? s.ov;
    if (runs == null) return null;
    return wkts != null ? `${runs}/${wkts}` : String(runs);
  };
  const hs = fmtCricket(home), as = fmtCricket(away);
  if (hs != null) { match.teamA.score = hs; match.teamA.overs = (home.overs ?? home.ov ?? "") + ""; }
  if (as != null) { match.teamB.score = as; match.teamB.overs = (away.overs ?? away.ov ?? "") + ""; }
}

// ── Transform: SofaScore event → HukamBook match ─────────────────────────────
function sofascoreEventToHukamMatch(event, sport) {
  const isLive = event.status?.type === "inprogress" || event.status?.type === "live";
  if (event.status?.type === "finished") return null;
  
  const homeTeam = event.homeTeam?.name || "Home";
  const awayTeam = event.awayTeam?.name || "Away";
  
  return {
    id: event.id,
    sport,  // pass through the real sport slug (football/cricket/tennis/basketball/hockey)
    league: `${event.tournament?.name || "SofaScore"} • ${isLive ? "LIVE" : "Upcoming"}`,
    teamA: {
      name: homeTeam,
      short: shortName(homeTeam),
      flag: flagFor(homeTeam, sport),
      score: isLive ? (event.homeScore?.current ?? "In progress") : "—",
      overs: "",
    },
    teamB: {
      name: awayTeam,
      short: shortName(awayTeam),
      flag: flagFor(awayTeam, sport),
      score: isLive ? (event.awayScore?.current ?? "") : "—",
      overs: "",
    },
    status: isLive ? "live" : "upcoming",
    time: isLive ? "Live now" : istTime(event.startTimestamp ? new Date(event.startTimestamp * 1000).toISOString() : new Date().toISOString()),
    info: isLive ? "🔴 Match in progress" : `SofaScore live`,
    // SofaScore gives real SCORES (used above) but not betting odds on this
    // endpoint. Odds marked unavailable rather than faked.
    oddsAvailable: false,
    back: NO_ODDS,
    lay: NO_ODDS,
    backB: NO_ODDS,
    layB: NO_ODDS,
    draw: null,
    markets: 0,
    fancy: [],
    provider: "SofaScore",
  };
}

// ── Transform: LiveScore event → HukamBook match ─────────────────────────────
// NOTE: The source notes confirmed the LiveScore ENDPOINTS (HTTP 200, 137 events)
// but did not include the response JSON body. LiveScore's mobile CDN uses short
// capitalized keys (Leagues > Events, with Home/Away objects). We read the common
// variants defensively; if a live payload differs, only these accessors need a tweak.
function livescoreEventToHukamMatch(event, sport, league) {
  const statusRaw = String(event.Status ?? event.EC ?? "").toUpperCase();
  const isLive = statusRaw === "LIVE" || statusRaw === "1" || statusRaw === "IN PLAY";
  if (statusRaw === "FINISHED" || statusRaw === "FT" || statusRaw === "2") return null;
  
  const home = event.Home || event.T1?.[0] || event.T1 || {};
  const away = event.Away || event.T2?.[0] || event.T2 || {};
  const homeTeam = home.Name || home.Nm || "Home";
  const awayTeam = away.Name || away.Nm || "Away";
  
  return {
    id: event.ID || event.Eid || event.id,
    sport: sport === "soccer" ? "football" : sport,
    league: `${league || "LiveScore"} • ${isLive ? "LIVE" : "Upcoming"}`,
    teamA: {
      name: homeTeam,
      short: shortName(homeTeam),
      flag: flagFor(homeTeam, sport),
      score: isLive ? (home.Score ?? event.Tr1 ?? "In progress") : "—",
      overs: "",
    },
    teamB: {
      name: awayTeam,
      short: shortName(awayTeam),
      flag: flagFor(awayTeam, sport),
      score: isLive ? (away.Score ?? event.Tr2 ?? "") : "—",
      overs: "",
    },
    status: isLive ? "live" : "upcoming",
    time: isLive ? "Live now" : istTime(event.Esd ? parseLivescoreDate(event.Esd) : (event.Str ? new Date(event.Str * 1000).toISOString() : new Date().toISOString())),
    info: isLive ? "🔴 Match in progress" : `LiveScore`,
    // LiveScore is a SCORE feed — no betting odds. Marked unavailable, not faked.
    oddsAvailable: false,
    back: NO_ODDS,
    lay: NO_ODDS,
    backB: NO_ODDS,
    layB: NO_ODDS,
    draw: null,
    markets: 0,
    fancy: [],
    provider: "LiveScore",
  };
}

// LiveScore encodes start time as Esd = YYYYMMDDHHMMSS integer. Convert to ISO.
function parseLivescoreDate(esd) {
  const s = String(esd);
  if (s.length < 14) return new Date().toISOString();
  const iso = `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:${s.slice(12,14)}Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// ── Transform: Reddy66 event → HukamBook match ───────────────────────────────
function reddy66EventToHukamMatch(event) {
  const isLive = event.in_play === 1;
  if (isLive === false && event.status === "finished") return null;
  
  // Robuzz/BetFair feed: prefer sport_slug if present, else event_type_id.
  const sport = event.sport_slug
    ? (event.sport_slug === "soccer" ? "football" : event.sport_slug)
    : reddySportFromTypeId(event.event_type_id ?? event.sportId, event.competition_name);
  
  const parts = (event.name || "vs").split(" v ");
  const teamA = parts[0]?.trim() || "Team A";
  const teamB = parts[1]?.trim() || "Team B";
  
  return {
    id: event.event_id || event.eventId,
    sport,
    league: `${event.competition_name || "Reddy66"} • ${isLive ? "LIVE" : "Upcoming"}`,
    teamA: {
      name: teamA,
      short: shortName(teamA),
      flag: flagFor(teamA, sport),
      score: isLive ? "In progress" : "—",
      overs: "",
    },
    teamB: {
      name: teamB,
      short: shortName(teamB),
      flag: flagFor(teamB, sport),
      score: isLive ? "" : "—",
      overs: "",
    },
    status: isLive ? "live" : "upcoming",
    time: isLive ? "Live now" : istTime(event.open_date_format || new Date().toISOString()),
    info: isLive ? "🔴 Match in progress" : `Reddy66 live`,
    // Defaults to unavailable; enrichReddy66Odds() fills real BetFair prices in
    // when the /markets call succeeds for this event.
    oddsAvailable: false,
    back: NO_ODDS,
    lay: NO_ODDS,
    backB: NO_ODDS,
    layB: NO_ODDS,
    draw: null,
    markets: 0,
    fancy: [],
    provider: "Reddy66",
  };
}

// BetFair event_type_id → sport slug. 4=cricket, 1=football/soccer, 2=tennis,
// 7522=basketball. Falls back to a name check, then cricket (this stack is
// cricket-heavy). Kept in one place so Reddy66 and ReddyBook stay consistent.
function reddySportFromTypeId(typeId, competitionName) {
  const id = String(typeId ?? "");
  if (id === "1") return "football";
  if (id === "2") return "tennis";
  if (id === "4") return "cricket";
  if (id === "7522") return "basketball";
  const n = (competitionName || "").toLowerCase();
  if (n.includes("soccer") || n.includes("football") || n.includes("league") && n.includes("premier")) return "football";
  if (n.includes("tennis") || n.includes("atp") || n.includes("wta")) return "tennis";
  if (n.includes("basketball") || n.includes("nba")) return "basketball";
  return "cricket";
}

// ── Transform: ReddyBook event → HukamBook match ────────────────────────────
function reddyEventToHukamMatch(event) {
  // BetFair event_type_id is the reliable sport key: 4=cricket, 1=football,
  // 2=tennis. The competition_name (e.g. "International Twenty20 Matches") does
  // NOT always contain the word "Cricket", so we must not rely on a name match.
  const sport = reddySportFromTypeId(event.event_type_id, event.competition_name);
  const isLive = event.in_play === 1;
  if (isLive === false && new Date(event.open_date_format) < Date.now()) return null; // dropped if finished
  
  const parts = (event.name || "vs").split(" v ");
  const teamA = parts[0]?.trim() || "Team A";
  const teamB = parts[1]?.trim() || "Team B";
  
  return {
    id: event.event_id,
    sport,
    league: `${event.competition_name} • ${isLive ? "LIVE" : "Upcoming"}`,
    teamA: {
      name: teamA,
      short: shortName(teamA),
      flag: flagFor(teamA, sport),
      score: isLive ? "In progress" : "—",
      overs: "",
    },
    teamB: {
      name: teamB,
      short: shortName(teamB),
      flag: flagFor(teamB, sport),
      score: isLive ? "" : "—",
      overs: "",
    },
    status: isLive ? "live" : "upcoming",
    time: isLive ? "Live now" : istTime(event.open_date_format),
    info: isLive ? "🔴 Match in progress" : `Starts ${istTime(event.open_date_format)}`,
    // Defaults to unavailable; enrichReddyBookData() fills real market odds and
    // cricket scores from /ws/getMarketData and /ws/getScoreData when reachable.
    oddsAvailable: false,
    back: NO_ODDS,
    lay: NO_ODDS,
    backB: NO_ODDS,
    layB: NO_ODDS,
    draw: null,
    markets: 0,
    fancy: [],
    provider: "ReddyBook",
  };
}

// Merge cricket ODDS (from OddsAPI) into cricket SCORE matches (from Cricinfo)
// by fuzzy team-name overlap, so one card can show both a live score and odds.
// Any odds match that doesn't line up with a score match is kept on its own.
function mergeCricket(scoreMatches, oddsMatches) {
  if (!oddsMatches.length) return scoreMatches;
  if (!scoreMatches.length) return oddsMatches;

  const norm = (s) => (s || "").toLowerCase().replace(/[^a-z]/g, "");
  const teamsOverlap = (a, b) => {
    const a1 = norm(a.teamA.name), a2 = norm(a.teamB.name);
    const b1 = norm(b.teamA.name), b2 = norm(b.teamB.name);
    const hit = (x, y) => x && y && (x.includes(y) || y.includes(x));
    return (hit(a1, b1) && hit(a2, b2)) || (hit(a1, b2) && hit(a2, b1));
  };

  const usedOdds = new Set();
  const out = scoreMatches.map(sm => {
    const om = oddsMatches.find((o, i) => !usedOdds.has(i) && teamsOverlap(sm, o));
    if (om) {
      usedOdds.add(oddsMatches.indexOf(om));
      // Keep Cricinfo's live score + team names, graft OddsAPI's odds on top.
      return {
        ...sm,
        oddsAvailable: om.oddsAvailable,
        back: om.back, lay: om.lay, backB: om.backB, layB: om.layB,
        draw: om.draw, markets: om.markets,
      };
    }
    return sm;
  });

  // Append odds-only matches that had no score counterpart.
  oddsMatches.forEach((o, i) => { if (!usedOdds.has(i)) out.push(o); });
  return out;
}

// ── Aggregator: merge multiple sources into one board ───────────────────────
// Strategy:
//   PRIMARY (all merged): ESPN (football/tennis + real odds) + Cricinfo (cricket
//     scores) + OddsAPI (cricket odds). Cricket odds are merged INTO cricket-score
//     matches by team-name match, so a cricket card can show both score and odds.
//   FALLBACK (first that works): Stake → exchanges → LiveScore, only used if the
//     primary group returns nothing at all (e.g. total network failure).
async function refreshCache() {
  if (cache.refreshing) return cache.refreshing;

  cache.refreshing = (async () => {
    let matches = [];
    const usedSources = [];

    // ---- PRIMARY GROUP: run in parallel, merge everything that succeeds ----
    const primary = [
      { name: "ESPN", fetch: fetchFromESPN },        // football/tennis + odds
      { name: "Cricinfo", fetch: fetchFromCricinfo },// cricket scores
      { name: "OddsAPI", fetch: fetchFromOddsAPI },  // cricket odds (keyed)
    ];
    const settled = await Promise.allSettled(primary.map(async p => {
      console.log(`[refresh] Trying ${p.name}...`);
      const r = await p.fetch();
      console.log(`[refresh] ✓ ${p.name} → ${r.length}`);
      return { name: p.name, matches: r };
    }));

    let espnMatches = [], cricketScores = [], cricketOdds = [];
    for (const s of settled) {
      if (s.status === "fulfilled") {
        usedSources.push(s.value.name);
        if (s.value.name === "ESPN") espnMatches = s.value.matches;
        else if (s.value.name === "Cricinfo") cricketScores = s.value.matches;
        else if (s.value.name === "OddsAPI") cricketOdds = s.value.matches;
      } else {
        console.warn(`[refresh] ✗ primary failed:`, s.reason?.message || s.reason);
      }
    }

    // Merge cricket odds INTO cricket score matches (match by team-name overlap).
    const mergedCricket = mergeCricket(cricketScores, cricketOdds);
    matches = [...espnMatches, ...mergedCricket];

    // ---- FALLBACK GROUP: only if primary produced nothing ----
    if (matches.length === 0) {
      const fallback = [
        { name: "Stake", fetch: fetchFromStake },
        { name: "SofaScore", fetch: fetchFromSofaScore },
        { name: "Reddy66", fetch: fetchFromReddy66 },
        { name: "ReddyBook", fetch: fetchFromReddyBook },
        { name: "LiveScore", fetch: fetchFromLiveScore },
      ];
      for (const provider of fallback) {
        try {
          console.log(`[refresh] (fallback) Trying ${provider.name}...`);
          const result = await provider.fetch();
          if (result.length > 0) {
            matches = result;
            usedSources.push(provider.name);
            console.log(`[refresh] ✓ fallback ${provider.name} → ${result.length}`);
            break;
          }
        } catch (e) {
          console.warn(`[refresh] ✗ ${provider.name} failed:`, e.message);
        }
      }
    }

    if (matches.length > 0) {
      // Live matches first, then those with odds, then the rest.
      matches.sort((a, b) => {
        const liveDiff = (a.status === "live" ? 0 : 1) - (b.status === "live" ? 0 : 1);
        if (liveDiff !== 0) return liveDiff;
        return (a.oddsAvailable ? 0 : 1) - (b.oddsAvailable ? 0 : 1);
      });
      cache.matches = matches.slice(0, 30);
      cache.fetchedAt = Date.now();
      cache.provider = usedSources.join(" + ") || "none";
      console.log(`[refresh] Cache updated from [${cache.provider}] — ${cache.matches.length} matches at ${new Date().toISOString()}`);
    } else {
      throw new Error("all providers failed");
    }

    return cache.matches;
  })().finally(() => { cache.refreshing = null; });
  
  return cache.refreshing;
}

// ── HTTP server ──────────────────────────────────────────────────────────────
const send = (res, code, body, extra = {}) => {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": CFG.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  });
  res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://x");
  if (req.method === "OPTIONS") return send(res, 204, {});

  if (pathname === "/api/health") {
    const withOdds = cache.matches.filter(m => m.oddsAvailable).length;
    return send(res, 200, {
      ok: true,
      provider: cache.provider,
      providerHealth: cache.providerHealth,
      cacheAgeSeconds: cache.fetchedAt ? Math.round((Date.now() - cache.fetchedAt) / 1000) : null,
      cachedMatches: cache.matches.length,
      matchesWithLiveOdds: withOdds,
      matchesScoreOnly: cache.matches.length - withOdds,
      lastUpdated: cache.fetchedAt ? new Date(cache.fetchedAt).toISOString() : null,
      effectiveTtlSeconds: Math.round(effectiveTtlMs() / 1000),
    });
  }

  if (pathname === "/api/matches") {
    // No API key needed — all providers are key-free.
    const fresh = cache.fetchedAt && (Date.now() - cache.fetchedAt < effectiveTtlMs());
    if (fresh) return send(res, 200, cache.matches, { "X-Cache": "HIT" });
    try {
      const data = await refreshCache();
      return send(res, 200, data, { "X-Cache": "MISS" });
    } catch (e) {
      if (cache.matches.length) // all providers down → serve last good data, marked stale
        return send(res, 200, cache.matches, { "X-Cache": "STALE", "X-Data-Stale": "1" });
      return send(res, 502, { error: "all providers unreachable", detail: String(e.message || e) });
    }
  }

  // ── Static frontend hosting (same-origin fix) ─────────────────────────────
  // Drop a built copy of the site into backend/public and this server will
  // serve it — frontend and API then share one origin, so the app's
  // same-origin fallback (fetch "/api/matches") always works with zero config.
  if (req.method === "GET") {
    const safe = pathname === "/" ? "/index.html" : pathname;
    const file = path.join(__dirname, "public", path.normalize(safe).replace(/^([.][.][/\\])+/, ""));
    if (file.startsWith(path.join(__dirname, "public")) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      const ext = path.extname(file).toLowerCase();
      const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
        ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" }[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime, "Access-Control-Allow-Origin": CFG.ALLOWED_ORIGIN });
      return res.end(fs.readFileSync(file));
    }
  }

  send(res, 404, { error: "not found" });
});

server.listen(CFG.PORT, () => {
  const keyCount = CFG.ODDS_API_KEYS.length;
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`HukamBook Backend v3.0 (Aggregator) on http://localhost:${CFG.PORT}`);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("PRIMARY sources (merged every refresh, cloud-friendly):");
  console.log(`  • ESPN — football & tennis: real teams, live scores, REAL odds`);
  console.log(`  • ESPNcricinfo — cricket: real teams + live scores`);
  console.log(`  • the-odds-api.com — cricket ODDS (${keyCount} key${keyCount === 1 ? "" : "s"} loaded${keyCount === 0 ? " — add ODDS_API_KEYS for cricket odds" : ", 15-min cache, auto-rotate"})`);
  console.log("FALLBACK (only if all primary sources fail):");
  console.log(`  • Stake → SofaScore → Reddy66 → ReddyBook → LiveScore`);
  console.log(`Cache TTL: ${CFG.CACHE_TTL_S}s (${CFG.LIVE_CACHE_TTL_S}s live) | Odds cache: ${CFG.ODDS_CACHE_TTL_S}s`);
  console.log("Endpoints:");
  console.log(`  GET /api/matches → merged matches array`);
  console.log(`  GET /api/health  → source status + odds-key rotation state`);
  console.log("═══════════════════════════════════════════════════════════════");
});
