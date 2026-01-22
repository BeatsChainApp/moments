# Broadcast Endpoint Fix

## Issue
POST to `/admin/moments/{id}/broadcast` was returning 500 error with message:
```
"column 'phone_number' does not exist"
```

## Root Cause
The `subscriptions` table exists but may not have the correct schema or the `phone_number` column.

## Fix Applied

### 1. Enhanced Error Handling
Updated `supabase/functions/admin-api/index.ts` broadcast endpoint to:
- Detect schema/column issues specifically
- Return helpful error messages with hints
- Guide users to run the schema SQL

### 2. Created Helper Scripts

**test-broadcast-flow.sh** - Test complete authority moment broadcast flow:
```bash
./test-broadcast-flow.sh
```

**setup-database.sh** - Check which tables exist:
```bash
./setup-database.sh
```

### 3. Created Fix SQL
**supabase/fix-subscriptions-table.sql** - Check and fix subscriptions table:
- Checks current table structure
- Provides ALTER commands if column is missing
- Provides CREATE command if table doesn't exist
- Adds test subscribers
- Verifies setup

## How to Fix

### Option 1: Run Fix SQL (Recommended)
1. Go to Supabase SQL Editor
2. Copy contents of `supabase/fix-subscriptions-table.sql`
3. Run the SQL
4. Test broadcast again

### Option 2: Recreate from Clean Schema
1. Go to Supabase SQL Editor
2. Copy contents of `supabase/CLEAN_SCHEMA.sql`
3. Run the SQL (it uses IF NOT EXISTS so it's safe)
4. Test broadcast again

## Testing

After applying the fix, test the broadcast flow:

```bash
# Test complete flow
./test-broadcast-flow.sh

# Or manually test
curl -X POST "${SUPABASE_URL}/functions/v1/admin-api/moments/{moment_id}/broadcast" \
  -H "Authorization: Bearer {your_token}" \
  -H "Content-Type: application/json"
```

## Authority Moment Flow

**Context**: Authority figures (verified, subscribed, assigned) send WhatsApp messages that are:
- Treated as verified moments (not user-generated)
- Require admin approval before broadcast
- Broadcast to WhatsApp subscribers + PWA
- No sponsorship involved - just verified content

**Flow**:
1. Authority sends WhatsApp message
2. Message stored with `content_source: 'authority'`
3. Admin reviews and approves moment
4. Admin clicks "Broadcast" button
5. System fetches active subscribers from `subscriptions` table
6. Creates broadcast record in `broadcasts` table
7. Calls `broadcast-webhook` function
8. Webhook sends WhatsApp messages to all opted-in subscribers
9. Updates broadcast status and counts

## Files Modified
- `supabase/functions/admin-api/index.ts` - Enhanced error handling
- `test-broadcast-flow.sh` - New test script
- `setup-database.sh` - New database check script
- `supabase/fix-subscriptions-table.sql` - New fix SQL script
