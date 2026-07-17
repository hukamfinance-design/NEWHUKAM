# HukamBook v2.2 — Package Structure

```
HukamBook_v2.2/
├── README.md                    ← start here (overview + honest odds note)
├── STRUCTURE.md                 ← this file
│
├── backend/                     ← the Node.js server (deploy this)
│   ├── server.js                ← 6-provider backend, key-free
│   ├── package.json             ← npm start → node server.js
│   ├── .env.example             ← optional config (copy to .env)
│   ├── .gitignore
│   ├── README.md                ← backend-specific docs
│   └── public/                  ← built frontend, served at http://localhost:8787
│       ├── index.html
│       └── app.js               ← (patched: handles score-only providers)
│
├── frontend/                    ← frontend source + build
│   ├── HukamBook_v2.tsx         ← React source (patched for oddsAvailable)
│   ├── app.built.js             ← same built bundle as backend/public/app.js
│   └── index.html
│
└── docs/                        ← all documentation
    ├── QUICK_START.md
    ├── ODDS_AND_SCORES_STATUS.md   ← ⭐ honest per-provider odds/scores truth
    ├── PROVIDER_REFERENCE.md
    ├── API_TESTING_GUIDE.md
    ├── MIGRATION_GUIDE_v2.md
    └── DEPLOYMENT_CHECKLIST.md
```

## Fastest path to running

```bash
cd backend
node server.js
# open http://localhost:8787 — backend serves the frontend from public/
```

The frontend automatically calls the backend at `http://localhost:8787`, falling
back to same-origin (`/api/matches`) when served from `public/` — so zero config
is needed for local use.

## What changed in v2.2 (both backend + frontend)

**Backend:** removed the old paid Odds API, added 6 key-free providers with a
fallback chain, real odds parsing for Stake + the two exchanges, honest
`oddsAvailable:false` for score-only feeds, and fixed a leftover `API_KEY` gate
that would have broken `/api/matches`.

**Frontend:** patched both the `.tsx` source and the built `app.js` so they no
longer crash when a match has no odds (`back: null`). Score-only matches now show
"Scores only" in the card footer instead of fake markets.
