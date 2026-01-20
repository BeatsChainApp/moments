# Quick Integration Guide

## What You Need to Do

The file `ALL_CAMPAIGN_ENDPOINTS.ts` contains code that needs to be **copied into** your existing `admin-api/index.ts` file.

### Step 1: Find the Right Location

Open `supabase/functions/admin-api/index.ts` and search for:
```typescript
if (path.includes('/campaigns/') && path.includes('/broadcast')
```

This is around line 1614.

### Step 2: Replace Old Broadcast Endpoint

Delete the old broadcast endpoint (from line ~1614 to ~1750) and replace with the new enhanced version from `ALL_CAMPAIGN_ENDPOINTS.ts` (lines 1-180).

### Step 3: Add New Endpoints

After the existing analytics endpoints (around line 460), add the remaining endpoints from `ALL_CAMPAIGN_ENDPOINTS.ts` (lines 181-end).

### Step 4: Deploy

```bash
cd /workspaces/moments
supabase functions deploy admin-api
```

---

## What Gets Added

✅ Enhanced broadcast with:
- Authority lookup
- Budget enforcement
- Template selection
- Transaction logging

✅ Campaign analytics:
- GET /analytics/campaigns

✅ A/B testing:
- POST /campaigns/{id}/variants
- GET /campaigns/{id}/ab-results

✅ Tracking:
- POST /track/click
- POST /track/conversion

---

## Current Status

- Database: ✅ DEPLOYED (all migrations applied)
- Code: ✅ WRITTEN (in ALL_CAMPAIGN_ENDPOINTS.ts)
- Integration: ⏳ PENDING (copy code to index.ts)
- Deployment: ⏳ PENDING (after integration)

---

## Need Help?

The `ALL_CAMPAIGN_ENDPOINTS.ts` file is a **reference file** showing what code to add.
It's not meant to be deployed as a separate file.

Just copy its content into the appropriate places in `index.ts`.
