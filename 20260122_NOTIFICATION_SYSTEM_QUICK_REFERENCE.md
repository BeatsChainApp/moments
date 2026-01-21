# Notification System Quick Reference
**Date**: January 22, 2026  
**For**: Development Team

---

## 🎯 QUICK SUMMARY

**What**: Comprehensive notification system for Moments App  
**Why**: Unified, user-controlled, scalable notification management  
**How**: Progressive 5-phase implementation, non-breaking  
**When**: 5 weeks (Jan 22 - Feb 26, 2026)

---

## 📊 CURRENT STATE vs FUTURE STATE

| Aspect | Current | Future |
|--------|---------|--------|
| **Notification Types** | 2 (comments only) | 24 (comprehensive) |
| **User Control** | None (opt-in/out only) | Full preferences |
| **Channels** | Broadcasts + Basic Queue | Unified Orchestrator |
| **Tracking** | Basic broadcast logs | Comprehensive audit trail |
| **Priority** | None | 5-level priority system |
| **Scheduling** | Broadcast only | All notification types |
| **Digests** | None | Daily/Weekly options |
| **Emergency** | None | Critical alert system |

---

## 🏗️ KEY COMPONENTS

### 1. Notification Orchestrator (NEW)
- **Purpose**: Central coordination for all notifications
- **Location**: `supabase/functions/notification-orchestrator/`
- **Responsibilities**:
  - Route notifications to appropriate channel
  - Check user preferences
  - Apply priority rules
  - Log all notifications
  - Handle retries

### 2. Broadcast Channel (EXISTING - Enhanced)
- **Purpose**: Mass distribution of Moments
- **Status**: Production-ready, will be enhanced
- **Changes**: Add notification logging, priority support

### 3. Individual Channel (EXISTING - Enhanced)
- **Purpose**: One-to-one notifications
- **Status**: Basic, will be significantly enhanced
- **Changes**: Add 7 new notification types, batching, digests

### 4. System Channel (NEW)
- **Purpose**: System-level notifications
- **Examples**: Welcome messages, confirmations, alerts
- **Features**: Transactional, emergency, maintenance

---

## 📋 24 NOTIFICATION TYPES

### Broadcasts (4 types)
1. moment_broadcast_verified
2. moment_broadcast_sponsored
3. moment_broadcast_community
4. moment_broadcast_official

### Individual (9 types)
5. comment_approved
6. comment_reply
7. comment_mentioned
8. moment_approved
9. moment_rejected

### System (6 types)
10. welcome_subscription
11. subscription_confirmed
12. unsubscribe_confirmed
13. preferences_updated
14. digest_daily
15. digest_weekly

### Transactional (6 types)
16. authority_verified
17. authority_suspended
18. broadcast_scheduled
19. broadcast_completed
20. quota_warning
21. quota_exceeded

### Emergency (3 types)
22. emergency_alert
23. safety_alert
24. system_maintenance

---

## 🗄️ NEW DATABASE TABLES

1. **notification_types** - Define all 24 types
2. **notification_preferences** - User settings per type
3. **notification_log** - Comprehensive tracking
4. **notification_batches** - Batch processing
5. **notification_templates_mapping** - Template selection

---

## 🚀 IMPLEMENTATION PHASES

| Phase | Week | Focus | Key Deliverable |
|-------|------|-------|-----------------|
| **1** | Jan 22-28 | Foundation | Database schema + Orchestrator |
| **2** | Jan 29-Feb 4 | User Preferences | Preference API + UI |
| **3** | Feb 5-11 | Individual Notifications | 9 notification types + Digests |
| **4** | Feb 12-18 | System Notifications | 11 system types + Analytics |
| **5** | Feb 19-26 | Emergency + Advanced | Emergency system + Monitoring |

---

## ✅ NON-BREAKING GUARANTEES

1. **Existing broadcasts continue working** - No changes to broadcast.js
2. **Backward compatible** - Old code paths remain functional
3. **Progressive enhancement** - New features are additive
4. **Fail-safe defaults** - System works even if new features fail
5. **Rollback ready** - Each phase can be rolled back independently

---

## 📊 SUCCESS CRITERIA

### Phase 1 (Foundation)
- [ ] All 5 new tables created
- [ ] Orchestrator deployed and functional
- [ ] Existing broadcasts log to notification_log
- [ ] Zero downtime during deployment
- [ ] Performance: <100ms orchestrator latency

### Phase 2 (Preferences)
- [ ] Users can set preferences via API
- [ ] Admin UI for preference management
- [ ] Preferences respected in delivery
- [ ] WhatsApp command "SETTINGS" works
- [ ] Adoption: >10% users customize preferences

### Phase 3 (Individual)
- [ ] All 9 individual types implemented
- [ ] Digest system functional
- [ ] Batching reduces API calls by >50%
- [ ] Delivery rate >98%
- [ ] Engagement: >20% enable digests

### Phase 4 (System)
- [ ] All 11 system types implemented
- [ ] Authority notifications trigger correctly
- [ ] Quota system prevents abuse
- [ ] Analytics dashboard live
- [ ] Monitoring: <1% error rate

### Phase 5 (Emergency)
- [ ] Emergency notifications bypass limits
- [ ] Multi-channel framework ready
- [ ] Scheduler handles 1000+ scheduled notifications
- [ ] A/B testing framework functional
- [ ] Uptime: >99.9%

---

## 🔧 DEVELOPER QUICK START

### Testing Notification Orchestrator
```javascript
// Send test notification
const response = await fetch('https://[supabase-url]/functions/v1/notification-orchestrator', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer [token]',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    notification_type: 'comment_reply',
    recipient_phone: '+27123456789',
    priority: 2,
    metadata: {
      comment_id: 'abc123',
      moment_id: 'xyz789'
    }
  })
});
```

### Checking User Preferences
```sql
-- Get user's notification preferences
SELECT nt.type_code, np.enabled, np.frequency
FROM notification_preferences np
JOIN notification_types nt ON nt.id = np.notification_type_id
WHERE np.phone_number = '+27123456789';
```

### Viewing Notification Log
```sql
-- Recent notifications for a user
SELECT 
  nt.display_name,
  nl.status,
  nl.sent_at,
  nl.delivered_at,
  nl.failure_reason
FROM notification_log nl
JOIN notification_types nt ON nt.id = nl.notification_type_id
WHERE nl.recipient_phone = '+27123456789'
ORDER BY nl.created_at DESC
LIMIT 20;
```

---

## 🚨 IMPORTANT NOTES

### Rate Limits
- **WhatsApp**: 1000 messages/day per phone number
- **Orchestrator**: 100 requests/second
- **Batch Processing**: 50 recipients per batch

### Priority Levels
1. **Low** - Digests, summaries
2. **Normal** - Regular notifications (default)
3. **High** - Important updates
4. **Urgent** - Time-sensitive
5. **Critical** - Emergency only

### Quiet Hours
- Default: 22:00 - 08:00 (user's timezone)
- Respected for priority 1-3
- Bypassed for priority 4-5

---

## 📞 SUPPORT & ESCALATION

### Phase 1 Issues
- **Contact**: Backend Team Lead
- **Escalation**: If orchestrator fails, broadcasts continue via existing path

### Phase 2-5 Issues
- **Contact**: Full Stack Team
- **Escalation**: Disable new features, fall back to Phase 1

### Emergency
- **Contact**: On-call engineer
- **Action**: Emergency notifications bypass all systems

---

**Last Updated**: January 22, 2026  
**Next Review**: After Phase 1 completion  
**Owner**: Development Team

