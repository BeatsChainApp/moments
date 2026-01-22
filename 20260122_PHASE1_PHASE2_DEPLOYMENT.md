# Phase 1 & 2 Deployment Guide
**Date**: January 22, 2026  
**Status**: Ready for Deployment

---

## 📋 PHASE 1: FOUNDATION

### Database Migration

**File**: `supabase/migrations/20260122_notification_system_foundation.sql`

**What it does**:
- Creates 5 new tables (notification_types, notification_log, notification_preferences, notification_batches, notification_templates_mapping)
- Seeds 24 notification types
- Enhances broadcasts and subscriptions tables
- Creates helper functions for preference checking
- Sets up indexes for performance

**Deploy**:
```bash
# Via Supabase CLI
supabase db push

# Or via SQL Editor in Supabase Dashboard
# Copy and paste the migration file
```

**Verification**:
```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'notification%';

-- Check notification types seeded
SELECT COUNT(*) FROM notification_types; -- Should be 24

-- Check functions created
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%notification%';
```

---

## 📋 PHASE 2: NOTIFICATION ORCHESTRATOR

### Edge Function Deployment

**File**: `supabase/functions/notification-orchestrator/index.ts`

**What it does**:
- Central routing for all notifications
- Checks user preferences before sending
- Logs all notifications to notification_log
- Handles scheduled notifications
- Respects quiet hours and daily limits

**Deploy**:
```bash
# Deploy edge function
supabase functions deploy notification-orchestrator

# Set environment variables (if not already set)
supabase secrets set WHATSAPP_TOKEN=your_token
supabase secrets set WHATSAPP_PHONE_ID=your_phone_id
```

**Test**:
```bash
curl -X POST https://[your-project].supabase.co/functions/v1/notification-orchestrator \
  -H "Authorization: Bearer [your-anon-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "comment_approved",
    "recipient_phone": "+27123456789",
    "priority": 2,
    "message_content": "Test notification from orchestrator",
    "metadata": {"test": true}
  }'
```

---

## 📋 PHASE 2: PREFERENCE API

### API Endpoints

**File**: `src/notification-preferences-api.js`

**Endpoints**:
1. `GET /api/notifications/preferences?phone_number=+27XXX` - Get user preferences
2. `POST /api/notifications/preferences` - Update user preferences
3. `GET /api/notifications/history?phone_number=+27XXX` - Get notification history
4. `GET /api/notifications/analytics?timeframe=7d` - Get analytics

**Integration** (add to server-bulletproof.js):
```javascript
import { 
  getUserPreferences, 
  updateUserPreferences, 
  getNotificationHistory,
  getNotificationAnalytics 
} from './notification-preferences-api.js';

// Add routes
app.get('/api/notifications/preferences', getUserPreferences);
app.post('/api/notifications/preferences', updateUserPreferences);
app.get('/api/notifications/history', getNotificationHistory);
app.get('/api/notifications/analytics', getNotificationAnalytics);
```

---

## ✅ VERIFICATION CHECKLIST

### Phase 1 - Database
- [ ] All 5 tables created successfully
- [ ] 24 notification types seeded
- [ ] Helper functions working (test should_send_notification)
- [ ] Indexes created for performance
- [ ] Existing broadcasts table enhanced
- [ ] Existing subscriptions table enhanced

### Phase 2 - Orchestrator
- [ ] Edge function deployed
- [ ] Test notification sent successfully
- [ ] Notification logged to notification_log
- [ ] User preferences checked before sending
- [ ] Quiet hours respected
- [ ] Daily limits enforced

### Phase 2 - API
- [ ] Preference endpoints accessible
- [ ] Can retrieve user preferences
- [ ] Can update user preferences
- [ ] Notification history retrievable
- [ ] Analytics endpoint working

---

## 🧪 TESTING SCENARIOS

### Test 1: Basic Notification
```javascript
// Send a simple notification
const response = await fetch('https://[project].supabase.co/functions/v1/notification-orchestrator', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer [key]',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    notification_type: 'comment_approved',
    recipient_phone: '+27123456789',
    message_content: 'Your comment was approved!'
  })
});

// Expected: Notification sent and logged
```

### Test 2: User Preferences
```javascript
// Set user preference to disable comment notifications
await fetch('https://[domain]/api/notifications/preferences', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone_number: '+27123456789',
    preferences: [{
      notification_type_id: '[comment_approved_id]',
      enabled: false
    }]
  })
});

// Try to send notification again
// Expected: Notification blocked by preferences
```

### Test 3: Quiet Hours
```sql
-- Set quiet hours for user
INSERT INTO notification_preferences (phone_number, notification_type_id, enabled, quiet_hours_start, quiet_hours_end)
VALUES ('+27123456789', '[type_id]', true, '22:00', '08:00');

-- Try to send notification during quiet hours
-- Expected: Notification blocked if priority < 4
```

### Test 4: Emergency Bypass
```javascript
// Send emergency notification during quiet hours
const response = await fetch('[orchestrator-url]', {
  method: 'POST',
  body: JSON.stringify({
    notification_type: 'emergency_alert',
    recipient_phone: '+27123456789',
    priority: 5,
    message_content: 'EMERGENCY: Critical community alert'
  })
});

// Expected: Notification sent despite quiet hours
```

---

## 📊 MONITORING

### Key Metrics to Track

```sql
-- Notification delivery rate (last 24 hours)
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM notification_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Notifications by type (last 7 days)
SELECT 
  nt.display_name,
  COUNT(*) as count,
  AVG(CASE WHEN nl.status IN ('sent', 'delivered') THEN 1 ELSE 0 END) * 100 as success_rate
FROM notification_log nl
JOIN notification_types nt ON nt.id = nl.notification_type_id
WHERE nl.created_at >= NOW() - INTERVAL '7 days'
GROUP BY nt.display_name
ORDER BY count DESC;

-- Users with custom preferences
SELECT COUNT(DISTINCT phone_number) as users_with_preferences
FROM notification_preferences;

-- Blocked notifications (by preferences)
SELECT COUNT(*) as blocked_count
FROM notification_log
WHERE status = 'failed' 
AND failure_reason = 'User preferences blocked notification'
AND created_at >= NOW() - INTERVAL '24 hours';
```

---

## 🚨 ROLLBACK PLAN

### If Issues Occur

**Rollback Database**:
```sql
-- Drop new tables (in reverse order)
DROP TABLE IF EXISTS notification_templates_mapping CASCADE;
DROP TABLE IF EXISTS notification_batches CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notification_log CASCADE;
DROP TABLE IF EXISTS notification_types CASCADE;

-- Remove columns from existing tables
ALTER TABLE broadcasts DROP COLUMN IF EXISTS notification_type_id;
ALTER TABLE broadcasts DROP COLUMN IF EXISTS priority_level;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS notification_preferences_updated_at;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS digest_enabled;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS digest_frequency;

-- Drop functions
DROP FUNCTION IF EXISTS get_notification_preference;
DROP FUNCTION IF EXISTS should_send_notification;
DROP FUNCTION IF EXISTS update_notification_preferences_timestamp;
```

**Rollback Edge Function**:
```bash
# Delete edge function
supabase functions delete notification-orchestrator
```

**Rollback API**:
- Remove routes from server-bulletproof.js
- Delete notification-preferences-api.js

---

## 🎯 SUCCESS CRITERIA

### Phase 1
- ✅ All tables created without errors
- ✅ 24 notification types seeded
- ✅ Helper functions operational
- ✅ Zero impact on existing broadcasts
- ✅ Migration completes in <10 seconds

### Phase 2
- ✅ Orchestrator handles 100+ requests/minute
- ✅ User preferences respected 100% of time
- ✅ Notification logging captures all attempts
- ✅ API response time <200ms
- ✅ Zero downtime during deployment

---

## 📞 SUPPORT

**Issues**: Check Supabase logs
```bash
supabase functions logs notification-orchestrator
```

**Database Issues**: Check migration status
```bash
supabase db diff
```

**API Issues**: Check server logs
```bash
pm2 logs moments-app
```

---

**Status**: ✅ Ready for Deployment  
**Estimated Time**: 15 minutes  
**Risk Level**: LOW (non-breaking, progressive)

