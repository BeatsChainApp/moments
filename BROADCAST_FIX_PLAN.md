# BROADCAST SYSTEM FIX - CRITICAL ISSUES

## Problem Summary
21 broadcasts stuck (8 pending, 13 processing) with 0 success rate.

## Root Causes Identified

### 1. Payload Format Mismatch
**broadcast-webhook expects:**
```json
{
  "broadcast_id": "uuid",
  "message": "text",
  "recipients": ["phone1", "phone2"],  // Array of strings
  "moment_id": "uuid"
}
```

**admin-api may be sending:**
```json
{
  "recipients": [{"phone_number": "..."}, ...]  // Array of objects
}
```

### 2. Phone Number Format Issues
- Some numbers missing '+' prefix
- WhatsApp API requires E.164 format (+27...)
- Run: `supabase/fix-phone-numbers.sql`

### 3. RPC Function May Not Be Deployed
- `get_active_subscribers()` function needed
- Run: `supabase/create-get-subscribers-function.sql`

### 4. Broadcast Webhook Not Completing
- Starts processing but never updates status
- Possible timeout or error not caught
- No retry mechanism

## Immediate Actions Required

### Step 1: Fix Phone Numbers (5 min)
```sql
-- Run in Supabase SQL Editor
UPDATE subscriptions 
SET phone_number = '+' || phone_number 
WHERE phone_number !~ '^\+' 
  AND phone_number ~ '^[0-9]+$';
```

### Step 2: Deploy RPC Function (5 min)
```bash
# In Supabase SQL Editor, run:
supabase/create-get-subscribers-function.sql
```

### Step 3: Mark Stuck Broadcasts as Failed (2 min)
```sql
UPDATE broadcasts
SET status = 'failed',
    failure_count = recipient_count,
    broadcast_completed_at = NOW()
WHERE status IN ('pending', 'processing')
  AND broadcast_started_at < NOW() - INTERVAL '10 minutes';
```

### Step 4: Redeploy Edge Functions (10 min)
```bash
cd supabase/functions
supabase functions deploy admin-api
supabase functions deploy broadcast-webhook
supabase functions deploy webhook
```

### Step 5: Test Broadcast Flow (5 min)
```bash
# Create test moment via admin dashboard
# Check if:
# 1. Broadcast record created
# 2. Status changes to 'processing'
# 3. Status changes to 'completed'
# 4. success_count > 0
```

## Verification Queries

```sql
-- Check system health
SELECT 
  'Subscribers' as metric,
  COUNT(*) as total,
  COUNT(CASE WHEN opted_in THEN 1 END) as active,
  COUNT(CASE WHEN phone_number LIKE '+%' THEN 1 END) as valid_format
FROM subscriptions
UNION ALL
SELECT 
  'Broadcasts',
  COUNT(*),
  COUNT(CASE WHEN status = 'completed' THEN 1 END),
  SUM(success_count)
FROM broadcasts;

-- Check recent broadcast activity
SELECT 
  id,
  moment_id,
  status,
  recipient_count,
  success_count,
  failure_count,
  broadcast_started_at,
  broadcast_completed_at
FROM broadcasts
ORDER BY broadcast_started_at DESC
LIMIT 10;

-- Test RPC function
SELECT COUNT(*) FROM get_active_subscribers();
```

## Expected Results After Fix

- All phone numbers have '+' prefix
- `get_active_subscribers()` returns > 0 rows
- New broadcasts complete within 2 minutes
- success_count > 0 for new broadcasts
- No broadcasts stuck in 'pending' or 'processing' > 10 min

## If Still Failing

1. Check Supabase function logs
2. Check WhatsApp API credentials in env vars
3. Verify WHATSAPP_TOKEN and WHATSAPP_PHONE_ID are set
4. Test WhatsApp API directly with curl
5. Check if broadcast-batch-processor function exists
