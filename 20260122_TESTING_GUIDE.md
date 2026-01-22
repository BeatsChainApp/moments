# Notification System Integration Testing
**Date**: January 22, 2026  
**Status**: Deployed - Ready for Testing

---

## ✅ WHAT'S DEPLOYED

### Database (Supabase)
- ✅ 5 new tables created
- ✅ 24 notification types seeded
- ✅ Helper functions active
- ✅ Broadcasts table enhanced

### Edge Function (Supabase)
- ✅ notification-orchestrator deployed
- ✅ Handles individual notifications
- ✅ Checks user preferences
- ✅ Logs all attempts

### Server Integration
- ✅ Broadcast system logs to notification_log
- ✅ API endpoints for preferences added
- ✅ Non-breaking integration complete

---

## 🧪 TEST SCENARIOS

### Test 1: Verify Database Setup
```sql
-- Check notification types
SELECT COUNT(*) FROM notification_types; -- Should be 24

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'notification%';
```

### Test 2: Send Test Notification via Orchestrator
```bash
curl -X POST https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/notification-orchestrator \
  -H "Authorization: Bearer [your-anon-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "comment_approved",
    "recipient_phone": "+27727002502",
    "message_content": "Test: Your comment was approved!",
    "priority": 2
  }'
```

### Test 3: Check Notification Log
```sql
-- View recent notifications
SELECT 
  nl.id,
  nt.display_name as type,
  nl.recipient_phone,
  nl.status,
  nl.sent_at,
  nl.failure_reason
FROM notification_log nl
JOIN notification_types nt ON nt.id = nl.notification_type_id
ORDER BY nl.created_at DESC
LIMIT 10;
```

### Test 4: Broadcast a Moment (Tests Integration)
```bash
# Via admin dashboard or API
POST /admin/moments/:id/broadcast

# This will now:
# 1. Create broadcast record with notification_type_id
# 2. Send messages to subscribers
# 3. Log each message to notification_log
# 4. Track success/failure per recipient
```

### Test 5: Check Broadcast Logging
```sql
-- View broadcast notifications
SELECT 
  b.id as broadcast_id,
  m.title as moment_title,
  COUNT(nl.id) as notifications_logged,
  SUM(CASE WHEN nl.status = 'sent' THEN 1 ELSE 0 END) as sent_count,
  SUM(CASE WHEN nl.status = 'failed' THEN 1 ELSE 0 END) as failed_count
FROM broadcasts b
JOIN moments m ON m.id = b.moment_id
LEFT JOIN notification_log nl ON nl.broadcast_id = b.id
WHERE b.created_at >= NOW() - INTERVAL '1 hour'
GROUP BY b.id, m.title
ORDER BY b.created_at DESC;
```

### Test 6: Get User Preferences (API)
```bash
curl "http://localhost:8080/api/notifications/preferences?phone_number=+27727002502"
```

### Test 7: Update User Preferences (API)
```bash
curl -X POST http://localhost:8080/api/notifications/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+27727002502",
    "preferences": [{
      "notification_type_id": "[uuid-from-notification_types]",
      "enabled": false,
      "frequency": "daily"
    }]
  }'
```

### Test 8: Get Notification History (API)
```bash
curl "http://localhost:8080/api/notifications/history?phone_number=+27727002502&limit=20"
```

### Test 9: Get Analytics (API)
```bash
curl "http://localhost:8080/api/notifications/analytics?timeframe=7d"
```

---

## 📊 MONITORING QUERIES

### Delivery Rate (Last 24h)
```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM notification_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY count DESC;
```

### Notifications by Type (Last 7 days)
```sql
SELECT 
  nt.display_name,
  nt.category,
  COUNT(*) as total,
  SUM(CASE WHEN nl.status IN ('sent', 'delivered') THEN 1 ELSE 0 END) as successful,
  ROUND(AVG(CASE WHEN nl.status IN ('sent', 'delivered') THEN 100 ELSE 0 END), 1) as success_rate
FROM notification_log nl
JOIN notification_types nt ON nt.id = nl.notification_type_id
WHERE nl.created_at >= NOW() - INTERVAL '7 days'
GROUP BY nt.display_name, nt.category
ORDER BY total DESC;
```

### Users with Custom Preferences
```sql
SELECT 
  COUNT(DISTINCT phone_number) as users_with_preferences,
  COUNT(*) as total_preferences
FROM notification_preferences;
```

### Blocked Notifications
```sql
SELECT 
  COUNT(*) as blocked_count,
  nt.display_name as notification_type
FROM notification_log nl
JOIN notification_types nt ON nt.id = nl.notification_type_id
WHERE nl.status = 'failed' 
  AND nl.failure_reason = 'User preferences blocked notification'
  AND nl.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY nt.display_name
ORDER BY blocked_count DESC;
```

---

## ✅ SUCCESS CRITERIA

### Phase 1 & 2 Integration
- [x] Database tables created
- [x] Notification types seeded
- [x] Orchestrator deployed
- [x] Broadcast system integrated
- [x] API endpoints added
- [ ] Test notification sent successfully
- [ ] Broadcast creates notification_log entries
- [ ] User preferences retrievable
- [ ] Analytics endpoint returns data

### Performance
- [ ] Orchestrator responds in <200ms
- [ ] Broadcast logging doesn't slow down sends
- [ ] API endpoints respond in <300ms
- [ ] No errors in Supabase logs

---

## 🐛 TROUBLESHOOTING

### Orchestrator Not Working
```bash
# Check logs
supabase functions logs notification-orchestrator

# Verify environment variables
supabase secrets list
```

### Broadcast Not Logging
```sql
-- Check if notification_type_id is being set
SELECT id, moment_id, notification_type_id, created_at 
FROM broadcasts 
ORDER BY created_at DESC 
LIMIT 5;

-- If NULL, check notification_types table
SELECT * FROM notification_types WHERE category = 'broadcast';
```

### API Endpoints Not Found
```bash
# Restart server
pm2 restart moments-app

# Check server logs
pm2 logs moments-app
```

### Preferences Not Saving
```sql
-- Check table structure
\d notification_preferences

-- Test direct insert
INSERT INTO notification_preferences (phone_number, notification_type_id, enabled)
VALUES ('+27727002502', (SELECT id FROM notification_types LIMIT 1), true);
```

---

## 🎯 NEXT STEPS

1. **Test all scenarios above**
2. **Monitor notification_log for 24 hours**
3. **Verify broadcast integration working**
4. **Test user preference API**
5. **Check analytics accuracy**

Once validated:
- Phase 3: Digest system
- Phase 4: Transactional notifications
- Phase 5: Emergency alerts

---

**Status**: ✅ Ready for Testing  
**Commit**: 588976b  
**Deployed**: Database + Edge Function + Server Integration

