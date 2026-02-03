# Broadcast System Fix

## Problem
- Broadcasts with >10 subscribers fail on Vercel (10s timeout)
- N8N intent system not processing (workflow down)
- Admin broadcast button creates intents that never execute

## Solution
Use existing batch processor for all broadcasts >10 subscribers

## Files Needing Deployment

### Supabase Edge Functions (Already Deployed ✅)
- `supabase/functions/broadcast-batch-processor/index.ts` - Already working

### Need to Update
- `src/admin.js` - Line 289: Replace intent creation with batch creation for broadcasts

## Quick Fix (No Code Change)
1. Restart N8N workflow to process intents
2. Or manually trigger batch processor for stuck broadcasts

## Long-term Fix
Admin endpoint should:
- Check subscriber count
- If ≤10: Use direct broadcast
- If >10: Create batches and trigger batch processor
