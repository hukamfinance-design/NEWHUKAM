# HukamBook v2 — Deployment Checklist

## Pre-Deployment

- [ ] Backup current `backend/server.js` (just in case)
- [ ] Backup current `.env` (if you have one)
- [ ] Note down your current PORT number
- [ ] Check Node.js version: `node -v` (must be 18+)
- [ ] Test internet connectivity to reach external APIs

## Deployment Steps

### Step 1: Copy New Files
- [ ] Copy `server.js` → `backend/server.js` (overwrite old)
- [ ] Review `.env.example` (reference only, not required)
- [ ] If using `.env` file, update with new variables (optional)

```bash
# Your .env should have (all optional):
PORT=8787
CACHE_TTL_SECONDS=60
LIVE_CACHE_TTL_SECONDS=30
ALLOWED_ORIGIN=*
```

### Step 2: Verify Dependencies
- [ ] No new npm packages required (uses only Node.js built-ins)
- [ ] No need to run `npm install` unless starting fresh
- [ ] Old `node_modules` still works fine

### Step 3: Start Server
```bash
node backend/server.js
```

- [ ] Server starts without errors
- [ ] You see this in logs:
  ```
  ═══════════════════════════════════════════════════════════════
  HukamBook Backend v2 (Multi-Provider)
  ```
- [ ] Server listens on PORT (default 8787)

### Step 4: Health Check (Critical)
```bash
curl http://localhost:8787/api/health
```

Check output for:
- [ ] `"ok": true`
- [ ] `"provider": "Stake"` or `"ReddyBook"`
- [ ] `"cachedMatches": <number > 0>`

### Step 5: Get Live Matches
```bash
curl http://localhost:8787/api/matches | jq '.[0]'
```

Check output has:
- [ ] Array with at least 1 match
- [ ] Each match has `id`, `sport`, `league`, `teamA`, `teamB`
- [ ] Odds in `back` and `lay` arrays
- [ ] `provider` field showing which API provided data

### Step 6: Test Frontend Connection
- [ ] Frontend loads matches from `/api/matches`
- [ ] Live odds display correctly
- [ ] No CORS errors in browser console
- [ ] Matches update as cache refreshes

## Post-Deployment

### Monitoring
- [ ] Set up logging to catch errors: `node backend/server.js 2>&1 | tee app.log`
- [ ] Monitor `/api/health` endpoint periodically
- [ ] Watch for provider failures in logs

### Optimization
- [ ] Adjust `CACHE_TTL_SECONDS` based on your needs:
  - Lower = more current data, more API calls
  - Higher = less API calls, potentially stale data
  - Recommended: 60-90 seconds
- [ ] Adjust `LIVE_CACHE_TTL_SECONDS` for live matches:
  - Lower = more real-time, more API load
  - Higher = less load, delays in live odds
  - Recommended: 15-30 seconds

### Performance Check
- [ ] First API request: Should be ~500-1500ms
- [ ] Subsequent requests: Should be <100ms (cached)
- [ ] Provider health endpoint: Should be instant

## Troubleshooting During Deployment

### Issue: "Cannot find module http" or similar
**Solution:** Node.js version too old. Need 18+
```bash
node -v  # Must show v18.0.0 or higher
nvm install 18  # If using nvm
```

### Issue: "Address already in use"
**Solution:** PORT 8787 is taken
```bash
# Either:
# 1. Kill process using port 8787
lsof -i :8787
kill -9 <PID>

# 2. Or change PORT in .env or via argument
PORT=8888 node backend/server.js
```

### Issue: No matches showing (empty array)
**Solution:** Check provider health
```bash
curl http://localhost:8787/api/health | jq '.providerHealth'
```

If both providers show `"ok": false`:
- Check internet: `ping 8.8.8.8`
- Try provider APIs directly:
  - `curl -X POST https://stake.com/_api/graphql ...`
  - `curl https://v9.jarvisexch.com/api/guest/events`
- Check firewall rules (may need to allow outbound to these domains)

### Issue: Stake provider fails with HTTP 500
**Solution:** Likely Node.js version issue
```bash
node -v  # Check version
# If < 18, upgrade
```

Or timeout issue:
```bash
# Test directly
curl -X POST https://stake.com/_api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query{sportTournamentFixtureList(sport:\"soccer\",type:\"live\",tournamentLimit:1,fixtureCountLimit:1){tournament{name}}}"}' \
  -m 10  # 10 second timeout
```

### Issue: ReddyBook returns 403 on primary URL
**Solution:** This is normal. System automatically falls back.
```bash
# Check that fallback works:
curl https://v9.jarvisexch.com/api/guest/events

# Should return 200 with event data (likely 2024 events)
```

To use primary API, you need:
- [ ] Allowed IP whitelist on their firewall, OR
- [ ] Working residential proxy

### Issue: CORS errors in browser
**Solution:** Check ALLOWED_ORIGIN in .env or default settings
```env
ALLOWED_ORIGIN=*  # Allow all origins (default)
# Or lock to specific domain:
ALLOWED_ORIGIN=https://yourdomain.com
```

## Performance Checklist

- [ ] Response time < 100ms for cached requests
- [ ] Provider switches automatically on failure
- [ ] Health endpoint updates regularly
- [ ] No memory leaks after 1 hour runtime
- [ ] Handles 100+ requests/minute without issues

## Security Checklist

- [ ] No API keys stored in frontend (all server-side ✓)
- [ ] CORS properly configured for your domain
- [ ] Server rejects requests from unauthorized origins
- [ ] Health endpoint doesn't leak sensitive data
- [ ] Error messages don't expose API internals

## Final Sign-Off

- [ ] Tested locally first
- [ ] Deployed to staging
- [ ] All endpoints responding
- [ ] Frontend displaying matches correctly
- [ ] Provider fallback confirmed working
- [ ] Logging enabled for monitoring
- [ ] Ready for production

## Rollback Plan (If Needed)

If new version has issues:
```bash
# 1. Restore old server.js
cp backup/server.js backend/server.js

# 2. Restart
node backend/server.js

# 3. Verify old version works
curl http://localhost:8787/api/matches
```

Then debug the issue and try new version again.

## Documentation Review

Before going live, review these docs (in order):
1. [ ] `QUICK_START.md` — Overview
2. [ ] `UPDATE_SUMMARY.md` — What changed
3. [ ] `MIGRATION_GUIDE_v2.md` — Step-by-step migration
4. [ ] `PROVIDER_REFERENCE.md` — API details
5. [ ] `server.js` comments — Implementation details

## Post-Launch Monitoring (24-48 Hours)

- [ ] Check logs hourly for errors
- [ ] Monitor provider health at `GET /api/health`
- [ ] Track response times (should be <100ms cached)
- [ ] Verify matches update as cache refreshes
- [ ] Check no memory growth over time
- [ ] Confirm fallback works if primary fails

## Optimization After Launch

**Week 1:**
- [ ] Tune `CACHE_TTL_SECONDS` based on user feedback
- [ ] Monitor which provider is being used most
- [ ] Adjust `LIVE_CACHE_TTL_SECONDS` for better live odds

**Week 2+:**
- [ ] Monitor provider reliability
- [ ] Consider adding additional fallback providers
- [ ] Optimize based on usage patterns
- [ ] Plan for scaling if needed

## Success Criteria

✅ **Deployment is successful when:**
1. Backend starts without errors
2. `/api/health` returns status with provider info
3. `/api/matches` returns live matches with odds
4. Frontend displays matches without errors
5. Cache is working (response times <100ms)
6. Provider fallback activates if primary fails
7. No breaking changes to existing frontend

---

## Quick Reference

### Start Server
```bash
node backend/server.js
```

### Test Endpoints
```bash
# Health check
curl http://localhost:8787/api/health | jq

# Get matches
curl http://localhost:8787/api/matches | jq

# Watch live updates
watch -n 5 'curl -s http://localhost:8787/api/health | jq ".cachedMatches"'
```

### Restart Server
```bash
# Kill existing process
pkill -f "node backend/server.js"

# Restart
node backend/server.js
```

### Debug Logs
```bash
# Show all output
node backend/server.js

# Save to file
node backend/server.js > server.log 2>&1 &

# Watch logs
tail -f server.log
```

---

**v2.0 Deployment Checklist**  
Last Updated: July 2024  
Status: ✅ Ready for Production
