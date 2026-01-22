# Phase 3: Individual Notifications & Digest System
**Date**: January 22, 2026  
**Status**: Ready for Deployment

---

## 🎯 PHASE 3 OBJECTIVES

1. **Digest System** - Daily/weekly summaries for users
2. **Scheduled Notifications** - Send notifications at specific times
3. **Enhanced Individual Notifications** - Route through orchestrator

---

## 📦 DELIVERABLES

### 1. Digest Processor Edge Function
**File**: `supabase/functions/notification-digest-processor/index.ts`

**Features**:
- Daily digest (8 AM daily)
- Weekly digest (Monday 8 AM)
- Respects user digest preferences
- Logs to notification_log
- Summarizes moments from last 24h/7d

### 2. Scheduled Notifications
**File**: `supabase/migrations/20260122_phase3_digest_system.sql`

**Features**:
- Cron jobs for digest processing
- Scheduled notification processor (every 5 minutes)
- Processes queued notifications when due

### 3. Enhanced Notification Sender
**File**: `src/notification-preferences-api.js` (enhanced)

**Features**:
- Routes notification_queue through orchestrator
- Retry logic with exponential backoff
- Comprehensive error tracking

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Deploy Digest Processor
```bash
supabase functions deploy notification-digest-processor
```

### Step 2: Run Migration
```bash
supabase db push
# Or via SQL Editor:
# Copy contents of 20260122_phase3_digest_system.sql
```

### Step 3: Enable pg_cron Extension
```sql
-- In Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;
```

### Step 4: Configure Cron Settings
```sql
-- Set app settings for cron jobs
ALTER DATABASE postgres SET app.supabase_url = 'https://bxmdzcxejcxbinghtyfw.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_key = '[your-service-key]';
```

### Step 5: Test Digest Manually
```bash
curl -X POST https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/notification-digest-processor \
  -H "Authorization: Bearer [service-key]" \
  -H "Content-Type: application/json" \
  -d '{"frequency": "daily"}'
```

---

## ✅ VERIFICATION

### Check Cron Jobs Created
```sql
SELECT * FROM cron.job;
-- Should show: daily-digest-processor, weekly-digest-processor, scheduled-notifications-processor
```

### Check Digest Preferences
```sql
-- Enable digest for test user
UPDATE subscriptions 
SET digest_enabled = true, digest_frequency = 'daily'
WHERE phone_number = '+27727002502';
```

### Monitor Digest Logs
```sql
SELECT 
  nl.created_at,
  nl.recipient_phone,
  nl.status,
  nl.metadata->>'moment_count' as moments_included
FROM notification_log nl
JOIN notification_types nt ON nt.id = nl.notification_type_id
WHERE nt.type_code IN ('digest_daily', 'digest_weekly')
ORDER BY nl.created_at DESC
LIMIT 10;
```

### Test Scheduled Notification
```sql
-- Create a scheduled notification
INSERT INTO notification_log (
  notification_type_id,
  recipient_phone,
  channel,
  priority,
  status,
  message_content,
  scheduled_for
) VALUES (
  (SELECT id FROM notification_types WHERE type_code = 'comment_approved'),
  '+27727002502',
  'whatsapp',
  2,
  'queued',
  'Test scheduled notification',
  NOW() + INTERVAL '2 minutes'
);

-- Wait 2 minutes, then check if processed
SELECT * FROM notification_log WHERE message_content = 'Test scheduled notification';
```

---

## 📊 MONITORING

### Digest Performance
```sql
SELECT 
  DATE(nl.created_at) as date,
  nt.type_code as digest_type,
  COUNT(*) as sent,
  AVG((nl.metadata->>'moment_count')::int) as avg_moments
FROM notification_log nl
JOIN notification_types nt ON nt.id = nl.notification_type_id
WHERE nt.category = 'system' 
  AND nt.type_code LIKE 'digest_%'
  AND nl.status = 'sent'
GROUP BY DATE(nl.created_at), nt.type_code
ORDER BY date DESC;
```

### Scheduled Notification Queue
```sql
SELECT 
  COUNT(*) as queued_count,
  MIN(scheduled_for) as next_scheduled,
  MAX(scheduled_for) as last_scheduled
FROM notification_log
WHERE status = 'queued' 
  AND scheduled_for IS NOT NULL;
```

### Cron Job Status
```sql
SELECT 
  jobname,
  schedule,
  last_run,
  next_run,
  active
FROM cron.job
ORDER BY jobname;
```

---

## 🎯 SUCCESS CRITERIA

- [ ] Digest processor deployed
- [ ] Cron jobs created and active
- [ ] Test digest sent successfully
- [ ] Scheduled notifications processing
- [ ] Users can enable/disable digests
- [ ] Digest logs in notification_log
- [ ] No errors in function logs

---

## 🐛 TROUBLESHOOTING

### Cron Jobs Not Running
```sql
-- Check cron extension
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check job status
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Manually trigger
SELECT cron.schedule('test-job', '* * * * *', 'SELECT 1');
SELECT cron.unschedule('test-job');
```

### Digest Not Sending
```bash
# Check function logs
supabase functions logs notification-digest-processor

# Test manually
curl -X POST [url] -d '{"frequency": "daily"}'
```

### Scheduled Notifications Stuck
```sql
-- Check queued notifications
SELECT * FROM notification_log 
WHERE status = 'queued' 
  AND scheduled_for <= NOW()
ORDER BY scheduled_for;

-- Manually process
SELECT process_scheduled_notifications();
```

---

## 📈 EXPECTED OUTCOMES

### User Experience
- Users receive daily/weekly summaries
- Notifications sent at optimal times
- Reduced notification fatigue
- Better engagement with digest format

### System Performance
- Batch processing reduces API calls
- Scheduled processing spreads load
- Comprehensive tracking of all notifications
- Automated digest delivery

---

**Status**: ✅ Ready for Deployment  
**Risk Level**: LOW (additive, non-breaking)  
**Deployment Time**: ~10 minutes

