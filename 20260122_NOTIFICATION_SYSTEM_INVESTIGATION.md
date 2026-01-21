# Comprehensive Notifications System Investigation & Planning
**Date**: January 22, 2026  
**Context**: Moments App - WhatsApp-native community engagement platform  
**Status**: Investigation & Planning Phase  
**Objective**: Design and implement comprehensive notification system without breaking changes

---

## 📊 EXISTING ARCHITECTURE ANALYSIS

### Current Notification Components

#### 1. **Broadcast System** (Primary Distribution)
- **Location**: `src/broadcast.js`, `supabase/functions/broadcast-webhook/`
- **Purpose**: Mass distribution of Moments to subscribers
- **Features**:
  - Authority-based filtering (blast radius, scope)
  - Marketing template integration
  - Batch processing (50 recipients per batch)
  - Rate limiting (1 msg/sec sequential, 5 msg/sec batched)
  - Retry logic with exponential backoff
  - Progress tracking and analytics
- **Database Tables**:
  - `broadcasts` - Main broadcast records
  - `broadcast_batches` - Batch processing records
  - `subscriptions` - Subscriber management
- **Status**: ✅ **PRODUCTION READY** - Comprehensive, well-architected

#### 2. **Notification Queue** (Individual Notifications)
- **Location**: `supabase/functions/notification-sender/`
- **Purpose**: Individual user notifications (comments, replies)
- **Features**:
  - Queue-based processing
  - Retry logic (max 3 attempts)
  - Template-based messages
- **Database Tables**:
  - `notification_queue` (assumed, not verified in schema)
- **Status**: ⚠️ **BASIC** - Limited templates, no comprehensive tracking

#### 3. **Template System** (Message Formatting)
- **Location**: `src/whatsapp-templates-marketing.js`, `src/whatsapp-templates-comprehensive.js`
- **Purpose**: Meta-compliant message templates
- **Features**:
  - 6 comprehensive marketing templates (deployed to Meta)
  - Authority-based template selection
  - Compliance validation
  - Variable parameter building
- **Status**: ✅ **COMPREHENSIVE** - Recently deployed, awaiting Meta approval

---

## 🔍 GAPS & OPPORTUNITIES

### Critical Gaps

1. **No Unified Notification System**
   - Broadcasts and individual notifications are separate systems
   - No centralized notification management
   - No unified tracking/analytics

2. **Limited Notification Types**
   - Only comment_approved and comment_reply
   - No system notifications (welcome, reminders, alerts)
   - No transactional notifications (subscription changes, etc.)

3. **No User Notification Preferences**
   - Users can't control what notifications they receive
   - No frequency controls
   - No quiet hours/do-not-disturb

4. **No Notification History**
   - No comprehensive audit trail
   - Limited analytics on individual notifications
   - No user notification inbox/history

5. **No Priority/Urgency System**
   - All notifications treated equally
   - No emergency/critical notification path
   - No delivery guarantees for important messages

6. **No Multi-Channel Support**
   - WhatsApp only
   - No fallback channels
   - No future-proofing for SMS, email, push

---

## 🎯 PROPOSED COMPREHENSIVE NOTIFICATION SYSTEM

### Design Principles

1. **Non-Breaking**: Extend existing systems, don't replace
2. **Progressive**: Implement in phases, each phase adds value
3. **Backward Compatible**: Existing broadcasts continue working
4. **Scalable**: Handle growth from 1K to 100K+ users
5. **Compliant**: POPIA, WhatsApp policies, Meta guidelines
6. **Observable**: Comprehensive logging, metrics, analytics

---

## 🏗️ ARCHITECTURE DESIGN

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                  NOTIFICATION ORCHESTRATOR                   │
│  (Central coordination layer - new)                         │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   BROADCAST  │   │  INDIVIDUAL  │   │   SYSTEM     │
│   CHANNEL    │   │  CHANNEL     │   │   CHANNEL    │
│  (existing)  │   │  (enhanced)  │   │   (new)      │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                ┌──────────────────────┐
                │  DELIVERY MANAGER    │
                │  (WhatsApp API)      │
                └──────────────────────┘
                            │
                            ▼
                ┌──────────────────────┐
                │  TRACKING & ANALYTICS│
                └──────────────────────┘
```

### Database Schema Extensions

#### New Tables

1. **`notification_types`** - Define all notification types
```sql
- id (uuid, pk)
- type_code (text, unique) -- e.g., 'moment_broadcast', 'comment_reply'
- display_name (text)
- description (text)
- category (text) -- 'broadcast', 'individual', 'system'
- default_enabled (boolean)
- user_controllable (boolean)
- priority_level (int) -- 1=low, 2=normal, 3=high, 4=urgent, 5=critical
- template_name (text) -- WhatsApp template to use
- created_at (timestamp)
```

2. **`notification_preferences`** - User notification settings
```sql
- id (uuid, pk)
- phone_number (text, indexed)
- notification_type_id (uuid, fk)
- enabled (boolean)
- frequency (text) -- 'realtime', 'hourly', 'daily', 'weekly'
- quiet_hours_start (time)
- quiet_hours_end (time)
- max_per_day (int)
- created_at (timestamp)
- updated_at (timestamp)
```

3. **`notification_log`** - Comprehensive notification tracking
```sql
- id (uuid, pk)
- notification_type_id (uuid, fk)
- recipient_phone (text, indexed)
- channel (text) -- 'whatsapp', 'sms', 'email'
- priority (int)
- status (text) -- 'queued', 'sent', 'delivered', 'read', 'failed'
- template_used (text)
- message_content (text)
- metadata (jsonb) -- flexible data storage
- scheduled_for (timestamp)
- sent_at (timestamp)
- delivered_at (timestamp)
- read_at (timestamp)
- failed_at (timestamp)
- failure_reason (text)
- retry_count (int)
- broadcast_id (uuid, nullable, fk)
- moment_id (uuid, nullable, fk)
- created_at (timestamp)
```

4. **`notification_batches`** - Batch processing for individual notifications
```sql
- id (uuid, pk)
- batch_type (text) -- 'digest', 'scheduled', 'bulk'
- notification_type_id (uuid, fk)
- recipient_count (int)
- status (text)
- scheduled_for (timestamp)
- started_at (timestamp)
- completed_at (timestamp)
- success_count (int)
- failure_count (int)
- metadata (jsonb)
```

5. **`notification_templates_mapping`** - Map notification types to templates
```sql
- id (uuid, pk)
- notification_type_id (uuid, fk)
- template_name (text)
- template_version (text)
- authority_level_min (int) -- minimum authority level required
- authority_level_max (int) -- maximum authority level
- is_default (boolean)
- active (boolean)
- created_at (timestamp)
```

#### Enhanced Existing Tables

**`broadcasts`** - Add notification tracking
```sql
ALTER TABLE broadcasts ADD COLUMN notification_type_id uuid REFERENCES notification_types(id);
ALTER TABLE broadcasts ADD COLUMN priority_level int DEFAULT 2;
```

**`subscriptions`** - Add preference reference
```sql
ALTER TABLE subscriptions ADD COLUMN notification_preferences_updated_at timestamp;
ALTER TABLE subscriptions ADD COLUMN digest_enabled boolean DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN digest_frequency text DEFAULT 'daily';
```

---

## 📋 NOTIFICATION TYPE TAXONOMY

### Broadcast Notifications (Existing - Enhanced)
1. **moment_broadcast_verified** - Verified authority moments
2. **moment_broadcast_sponsored** - Sponsored content
3. **moment_broadcast_community** - Community reports
4. **moment_broadcast_official** - Official announcements

### Individual Notifications (Enhanced)
5. **comment_approved** - Comment approval confirmation
6. **comment_reply** - Reply to user's comment
7. **comment_mentioned** - User mentioned in comment
8. **moment_approved** - User-submitted moment approved
9. **moment_rejected** - User-submitted moment rejected

### System Notifications (New)
10. **welcome_subscription** - New subscriber welcome
11. **subscription_confirmed** - Subscription change confirmed
12. **unsubscribe_confirmed** - Unsubscribe confirmation
13. **preferences_updated** - Notification preferences changed
14. **digest_daily** - Daily digest of moments
15. **digest_weekly** - Weekly digest of moments

### Transactional Notifications (New)
16. **authority_verified** - Authority status granted
17. **authority_suspended** - Authority status suspended
18. **broadcast_scheduled** - Broadcast scheduled confirmation
19. **broadcast_completed** - Broadcast completion summary
20. **quota_warning** - Approaching broadcast quota limit
21. **quota_exceeded** - Broadcast quota exceeded

### Emergency Notifications (New)
22. **emergency_alert** - Critical community alerts
23. **safety_alert** - Safety-related urgent information
24. **system_maintenance** - Planned system downtime

---

## 🚀 IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)
**Goal**: Establish core notification infrastructure without breaking existing systems

**Tasks**:
1. Create new database tables (notification_types, notification_log, notification_preferences)
2. Seed notification_types with all 24 notification types
3. Create notification orchestrator service (Supabase Edge Function)
4. Implement notification logging for existing broadcasts
5. Add backward compatibility layer

**Deliverables**:
- Migration script: `20260122_notification_system_foundation.sql`
- Edge function: `supabase/functions/notification-orchestrator/`
- Documentation: `NOTIFICATION_SYSTEM_ARCHITECTURE.md`

**Testing**:
- Existing broadcasts continue working
- New notifications are logged
- No performance degradation

---

### Phase 2: User Preferences (Week 2)
**Goal**: Give users control over their notifications

**Tasks**:
1. Create notification preferences API endpoints
2. Build preference management UI in admin dashboard
3. Implement preference checking in notification orchestrator
4. Add quiet hours and frequency controls
5. Create user preference webhook commands (e.g., "SETTINGS")

**Deliverables**:
- API endpoints: `/api/notifications/preferences`
- Admin UI: Notification preferences panel
- Webhook command: User sends "SETTINGS" to manage preferences
- Documentation: `NOTIFICATION_PREFERENCES_GUIDE.md`

**Testing**:
- Users can set preferences
- Preferences are respected
- Default preferences work for new users

---

### Phase 3: Enhanced Individual Notifications (Week 3)
**Goal**: Expand individual notification capabilities

**Tasks**:
1. Implement all 9 individual notification types
2. Add notification batching for efficiency
3. Create digest notification system (daily/weekly)
4. Implement priority-based delivery
5. Add notification history API

**Deliverables**:
- Enhanced notification-sender function
- Digest processor: `supabase/functions/notification-digest-processor/`
- History API: `/api/notifications/history`
- Documentation: `INDIVIDUAL_NOTIFICATIONS_GUIDE.md`

**Testing**:
- All notification types work
- Digests are generated correctly
- Priority delivery works

---

### Phase 4: System & Transactional Notifications (Week 4)
**Goal**: Add system-level and transactional notifications

**Tasks**:
1. Implement all 11 system/transactional notification types
2. Create authority notification triggers
3. Add broadcast lifecycle notifications
4. Implement quota warning system
5. Create notification analytics dashboard

**Deliverables**:
- System notification triggers
- Analytics dashboard in admin UI
- Quota monitoring system
- Documentation: `SYSTEM_NOTIFICATIONS_GUIDE.md`

**Testing**:
- System notifications trigger correctly
- Quota warnings work
- Analytics are accurate

---

### Phase 5: Emergency & Advanced Features (Week 5)
**Goal**: Add emergency notification capabilities and advanced features

**Tasks**:
1. Implement emergency notification system with priority bypass
2. Add multi-channel support framework (prepare for SMS/email)
3. Create notification scheduling system
4. Implement A/B testing for notifications
5. Add comprehensive monitoring and alerting

**Deliverables**:
- Emergency notification system
- Multi-channel framework
- Scheduler: `supabase/functions/notification-scheduler/`
- Monitoring dashboard
- Documentation: `EMERGENCY_NOTIFICATIONS_GUIDE.md`

**Testing**:
- Emergency notifications bypass all limits
- Scheduling works correctly
- Monitoring captures all metrics

---

## 📊 SUCCESS METRICS

### Performance Metrics
- **Delivery Rate**: >98% for all notifications
- **Delivery Time**: <5 seconds for individual, <5 minutes for broadcasts
- **System Latency**: <100ms for notification orchestrator
- **Error Rate**: <1% for all notification types

### User Engagement Metrics
- **Preference Adoption**: >30% of users customize preferences
- **Digest Engagement**: >20% of users enable digests
- **Notification Response**: Track read/action rates per type

### System Health Metrics
- **Queue Depth**: <100 pending notifications at any time
- **Retry Rate**: <5% of notifications require retry
- **System Uptime**: >99.9% for notification services

---

## 🔒 COMPLIANCE & SAFETY

### POPIA Compliance
- User consent for all notification types
- Clear opt-out mechanisms
- Data retention policies (90 days for logs)
- Privacy-preserving analytics

### WhatsApp Policy Compliance
- Respect 24-hour messaging window
- Use approved templates only
- Rate limiting (1000 msg/day per number)
- No spam or unsolicited messages

### Safety Controls
- Emergency notification abuse prevention
- Authority verification for critical notifications
- Quota limits per user/authority
- Content moderation for user-generated notifications

---

## 💰 COST ESTIMATION

### WhatsApp API Costs
- Current: ~R0.30 per message (South Africa)
- Estimated monthly volume: 50,000 messages
- Monthly cost: ~R15,000 ($800 USD)

### Infrastructure Costs
- Supabase: Included in current plan
- Edge Functions: Minimal additional cost
- Storage: <1GB for notification logs

### Development Costs
- 5 weeks × 40 hours = 200 hours
- Estimated effort: 1 senior developer

---

## 🎯 NEXT STEPS

### Immediate Actions (This Week)
1. **Review & Approve** this plan with stakeholders
2. **Create Phase 1 migration script** for database schema
3. **Set up development environment** for notification system
4. **Document existing broadcast system** for reference

### Decision Points
- [ ] Approve overall architecture
- [ ] Confirm notification type taxonomy
- [ ] Approve implementation timeline
- [ ] Allocate development resources
- [ ] Set success metrics and KPIs

---

## 📝 OPEN QUESTIONS

1. **Multi-Channel Priority**: When should we add SMS/email fallback?
2. **Digest Timing**: What are optimal times for daily/weekly digests?
3. **Emergency Threshold**: What defines an "emergency" notification?
4. **Retention Policy**: How long should we keep notification logs?
5. **User Limits**: Should there be per-user notification limits?

---

**Status**: ✅ **READY FOR REVIEW**  
**Next Action**: Stakeholder review and approval  
**Timeline**: 5 weeks for full implementation  
**Risk Level**: LOW (progressive, non-breaking approach)

