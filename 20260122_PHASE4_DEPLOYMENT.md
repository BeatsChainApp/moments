# Phase 4: Transactional Notifications
**Date**: January 22, 2026  
**Status**: Ready for Deployment

---

## 🎯 PHASE 4 OBJECTIVES

Automated transactional notifications for:
1. Authority lifecycle events
2. Broadcast lifecycle events
3. Quota monitoring and warnings
4. Moment approval/rejection

---

## 📦 DELIVERABLES

### Database Triggers (Automated)

1. **Authority Verified** - Triggers when authority status granted
2. **Authority Suspended** - Triggers when authority status suspended
3. **Broadcast Completed** - Notifies authority when broadcast finishes
4. **Quota Warning** - Alerts at 80% of daily limit
5. **Quota Exceeded** - Alerts when limit reached

### Manual Functions

6. **Moment Approved** - Call when approving moments
7. **Moment Rejected** - Call when rejecting moments

---

## 🚀 DEPLOYMENT

### Step 1: Run Migration
```bash
supabase db push
# Or via SQL Editor
```

### Step 2: Verify Triggers Created
```sql
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_%'
ORDER BY trigger_name;
```

### Step 3: Test Authority Notification
```sql
-- Create test authority profile
INSERT INTO authority_profiles (
  phone_number,
  role_label,
  authority_level,
  blast_radius,
  status
) VALUES (
  '+27727002502',
  'Test Authority',
  3,
  500,
  'active'
);
-- Should trigger authority_verified notification
```

### Step 4: Test Quota Warning
```sql
-- Simulate broadcasts to trigger quota warning
-- (Requires authority profile with daily_broadcast_limit set)
```

---

## ✅ VERIFICATION

### Check Notification Log
```sql
SELECT 
  nt.display_name,
  nl.recipient_phone,
  nl.status,
  nl.message_content,
  nl.created_at
FROM notification_log nl
JOIN notification_types nt ON nt.id = nl.notification_type_id
WHERE nt.category = 'transactional'
ORDER BY nl.created_at DESC
LIMIT 10;
```

### Monitor Trigger Execution
```sql
-- Check if triggers are firing
SELECT 
  COUNT(*) as transactional_notifications
FROM notification_log nl
JOIN notification_types nt ON nt.id = nl.notification_type_id
WHERE nt.category = 'transactional'
  AND nl.created_at >= NOW() - INTERVAL '1 hour';
```

---

## 📊 USAGE EXAMPLES

### Approve Moment (Manual)
```sql
-- Update moment status
UPDATE moments SET status = 'approved' WHERE id = '[moment-id]';

-- Send notification
SELECT notify_moment_approved('[moment-id]');
```

### Reject Moment (Manual)
```sql
-- Update moment status
UPDATE moments SET status = 'rejected' WHERE id = '[moment-id]';

-- Send notification with reason
SELECT notify_moment_rejected('[moment-id]', 'Content does not meet community guidelines');
```

### Suspend Authority (Automatic)
```sql
-- Update authority status - triggers notification automatically
UPDATE authority_profiles 
SET status = 'suspended', 
    suspension_reason = 'Policy violation'
WHERE id = '[authority-id]';
```

---

## 📈 MONITORING

### Transactional Notification Stats
```sql
SELECT 
  nt.type_code,
  COUNT(*) as sent,
  AVG(CASE WHEN nl.status = 'sent' THEN 1 ELSE 0 END) * 100 as success_rate
FROM notification_log nl
JOIN notification_types nt ON nt.id = nl.notification_type_id
WHERE nt.category = 'transactional'
  AND nl.created_at >= NOW() - INTERVAL '7 days'
GROUP BY nt.type_code
ORDER BY sent DESC;
```

### Quota Warnings Issued
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as warnings_issued
FROM notification_log nl
JOIN notification_types nt ON nt.id = nl.notification_type_id
WHERE nt.type_code IN ('quota_warning', 'quota_exceeded')
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🎯 SUCCESS CRITERIA

- [ ] Migration deployed successfully
- [ ] All 6 triggers created
- [ ] Authority verified notification works
- [ ] Broadcast completed notification works
- [ ] Quota warning triggers at 80%
- [ ] Quota exceeded triggers at 100%
- [ ] Manual functions callable

---

**Status**: ✅ Ready for Deployment  
**Risk Level**: LOW (automated, non-breaking)  
**Deployment Time**: ~5 minutes

