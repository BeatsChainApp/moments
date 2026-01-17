# Quick Win #2 Deployment - R84,000/month Savings

## Step 1: Create Tables ✅

Run in Supabase SQL Editor:
```bash
cat supabase/digest-tables.sql
```

## Step 2: Deploy Processor ✅

```bash
supabase functions deploy digest-processor --project-ref yfkqxqfzgfnssmgqzwwu
```

## Step 3: Set Up Cron (Choose One)

### Option A: Supabase Cron (Recommended)
```sql
-- Run every hour
SELECT cron.schedule(
  'digest-processor',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://yfkqxqfzgfnssmgqzwwu.supabase.co/functions/v1/digest-processor',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  );
  $$
);
```

### Option B: External Cron
```bash
# Add to crontab
0 * * * * curl -X POST https://yfkqxqfzgfnssmgqzwwu.supabase.co/functions/v1/digest-processor \
  -H "Authorization: Bearer YOUR_SERVICE_KEY"
```

## Step 4: Enable for Users

All users default to digest mode (digest_enabled=true).

To opt-out (realtime):
```sql
UPDATE user_preferences SET digest_enabled = false WHERE phone_number = '+27...';
```

## Testing

1. Insert test moment:
```sql
INSERT INTO pending_moments (phone_number, moment_title, moment_content, scheduled_for)
VALUES ('+27727002502', 'Test Moment', 'This is a test', NOW());
```

2. Trigger processor:
```bash
curl -X POST https://yfkqxqfzgfnssmgqzwwu.supabase.co/functions/v1/digest-processor \
  -H "Authorization: Bearer YOUR_SERVICE_KEY"
```

3. Check WhatsApp for digest message

## Expected Result

Users get 1 message at 6pm with all day's moments instead of 5 separate messages.

**Savings: R84,000/month**
