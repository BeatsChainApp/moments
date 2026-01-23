# Authority System - Phase 3: WhatsApp Integration & Automation

**Status**: Planning  
**Timeline**: Week 4  
**Goal**: Automate authority lifecycle via WhatsApp

---

## 🎯 Phase 3 Features

### 1. WhatsApp Notifications ✨
**Priority**: HIGH  
**Effort**: 4 hours

**What**: Notify users when authority is granted/changed

**Notifications**:
- ✅ **Authority Granted**: "You've been verified as School Principal"
- 🔄 **Authority Extended**: "Your authority has been extended by 90 days"
- ⏸️ **Authority Suspended**: "Your authority has been temporarily suspended"
- ❌ **Authority Revoked**: "Your authority has been removed"

**Implementation**:
```javascript
// src/authority-notifications.js
export async function notifyAuthorityGranted(phoneNumber, authorityProfile) {
  const message = `✅ Authority Verified!

You've been verified as ${authorityProfile.role_label}

📊 Authority Level: ${authorityProfile.authority_level}
👥 Max Recipients: ${authorityProfile.blast_radius.toLocaleString()}
📍 Scope: ${authorityProfile.scope_identifier}
🌍 Region: ${authorityProfile.region}
⏰ Valid Until: ${new Date(authorityProfile.valid_until).toLocaleDateString()}

You can now broadcast messages to your community.

📱 Send messages here to broadcast
❓ Reply HELP for commands`;

  await sendWhatsAppMessage(phoneNumber, message);
}
```

**Trigger Points**:
- Admin creates new authority → Send notification
- Admin extends authority → Send notification
- Admin suspends authority → Send notification
- Authority expires → Send expiry warning

---

### 2. Expiry Warnings ⏰
**Priority**: HIGH  
**Effort**: 3 hours

**What**: Auto-remind users 7 days before authority expires

**Warning Schedule**:
- 🟡 **7 days before**: First warning
- 🟠 **3 days before**: Second warning
- 🔴 **1 day before**: Final warning
- ⚫ **On expiry**: Expiry notification

**Implementation**:
```sql
-- supabase/functions/authority-expiry-check/index.ts
CREATE OR REPLACE FUNCTION check_expiring_authorities()
RETURNS void AS $$
DECLARE
  authority RECORD;
  days_left INTEGER;
BEGIN
  FOR authority IN 
    SELECT * FROM authority_profiles 
    WHERE status = 'active' 
    AND valid_until > NOW() 
    AND valid_until < NOW() + INTERVAL '7 days'
  LOOP
    days_left := EXTRACT(DAY FROM authority.valid_until - NOW());
    
    -- Check if notification already sent today
    IF NOT EXISTS (
      SELECT 1 FROM authority_notifications 
      WHERE authority_id = authority.id 
      AND notification_type = 'expiry_warning'
      AND DATE(created_at) = CURRENT_DATE
    ) THEN
      -- Send warning notification
      PERFORM send_expiry_warning(authority.id, days_left);
      
      -- Log notification
      INSERT INTO authority_notifications (
        authority_id, 
        notification_type, 
        days_until_expiry
      ) VALUES (
        authority.id, 
        'expiry_warning', 
        days_left
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**Cron Job**:
```yaml
# .github/workflows/authority-expiry-check.yml
name: Authority Expiry Check
on:
  schedule:
    - cron: '0 9 * * *' # Daily at 9 AM SAST
jobs:
  check-expiry:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Supabase Function
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/authority-expiry-check" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}"
```

---

### 3. Self-Service Authority Requests 📝
**Priority**: MEDIUM  
**Effort**: 5 hours

**What**: Users can request authority via WhatsApp

**Flow**:
1. User sends: `REQUEST AUTHORITY`
2. Bot asks: "What role? (School Principal, Community Leader, etc.)"
3. User replies: "School Principal"
4. Bot asks: "Institution name?"
5. User replies: "Duck Ponds High School"
6. Bot asks: "Region? (KZN, WC, GP, etc.)"
7. User replies: "KZN"
8. Bot confirms: "Request submitted! Admin will review."
9. Admin receives notification in dashboard
10. Admin approves/rejects
11. User receives approval/rejection notification

**Implementation**:
```javascript
// src/webhook.js - Add to command handlers
if (command === 'request authority' || command === 'request auth') {
  await handleAuthorityRequest(fromNumber);
  return;
}

async function handleAuthorityRequest(phoneNumber) {
  // Check if user already has authority
  const { data: existing } = await supabase
    .from('authority_profiles')
    .select('*')
    .eq('user_identifier', phoneNumber)
    .eq('status', 'active')
    .single();
  
  if (existing) {
    await sendMessage(phoneNumber, `You already have authority as ${existing.role_label}.`);
    return;
  }
  
  // Start request flow
  await supabase
    .from('authority_requests')
    .insert({
      phone_number: phoneNumber,
      status: 'awaiting_role',
      created_at: new Date().toISOString()
    });
  
  await sendMessage(phoneNumber, `📝 Authority Request

What role are you requesting?

Options:
🏫 School Principal
👥 Community Leader
🏛️ Government Official
🏥 NGO Coordinator
📅 Event Organizer

Reply with the role name.`);
}
```

**Database Schema**:
```sql
CREATE TABLE authority_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  role_requested TEXT,
  institution TEXT,
  region TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admin_users(id)
);
```

---

### 4. Analytics Dashboard 📊
**Priority**: MEDIUM  
**Effort**: 4 hours

**What**: Track authority performance metrics

**Metrics**:
- 📈 **Messages Sent**: Total broadcasts by authority
- 👥 **Avg Recipients**: Average reach per broadcast
- ✅ **Approval Rate**: % of messages auto-approved
- 🚫 **Rejection Rate**: % of messages flagged
- ⏱️ **Last Active**: Time since last broadcast
- 📊 **Engagement**: Replies/reactions to broadcasts

**UI Design**:
```
┌─────────────────────────────────────────────────────────┐
│ Authority Performance Analytics                         │
├─────────────────────────────────────────────────────────┤
│ 🏫 School Principal (+27727002502)                      │
│                                                          │
│ 📊 Broadcast Stats (Last 30 Days)                       │
│ • Messages Sent: 23                                     │
│ • Total Recipients: 6,601                               │
│ • Avg Recipients: 287 per broadcast                     │
│ • Last Broadcast: 2 days ago                            │
│                                                          │
│ ✅ Content Quality                                       │
│ • Auto-Approved: 21 (91%)                               │
│ • Flagged for Review: 2 (9%)                            │
│ • Rejected: 0 (0%)                                      │
│                                                          │
│ 👥 Engagement                                            │
│ • Replies Received: 47                                  │
│ • Avg Reply Rate: 2.0%                                  │
│                                                          │
│ 📈 Trend: ↗️ +15% reach vs last month                   │
└─────────────────────────────────────────────────────────┘
```

**Implementation**:
```javascript
// public/js/admin-sections.js
async function loadAuthorityAnalytics(authorityId) {
  const API_BASE = window.API_BASE_URL || window.location.origin;
  
  const response = await fetch(`${API_BASE}/admin/authority/${authorityId}/analytics`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}` }
  });
  
  const analytics = await response.json();
  
  return `
    <div class="analytics-grid">
      <div class="stat-card">
        <h4>Messages Sent</h4>
        <div class="stat-value">${analytics.messages_sent}</div>
      </div>
      <div class="stat-card">
        <h4>Total Recipients</h4>
        <div class="stat-value">${analytics.total_recipients.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <h4>Avg Recipients</h4>
        <div class="stat-value">${analytics.avg_recipients}</div>
      </div>
      <div class="stat-card">
        <h4>Approval Rate</h4>
        <div class="stat-value">${analytics.approval_rate}%</div>
      </div>
    </div>
  `;
}
```

**Backend Endpoint**:
```typescript
// supabase/functions/admin-api/index.ts
app.get('/admin/authority/:id/analytics', async (req, res) => {
  const { id } = req.params;
  
  const { data: analytics } = await supabase.rpc('get_authority_analytics', {
    authority_id: id,
    days: 30
  });
  
  res.json(analytics);
});
```

---

## 📋 Implementation Checklist

### Backend Tasks
- [ ] Create `authority_notifications` table
- [ ] Create `authority_requests` table
- [ ] Add `send_authority_notification()` function
- [ ] Add `check_expiring_authorities()` function
- [ ] Add `get_authority_analytics()` RPC function
- [ ] Create Supabase Edge Function: `authority-expiry-check`
- [ ] Add webhook handlers for authority requests
- [ ] Add admin API endpoint: `GET /admin/authority/:id/analytics`
- [ ] Add admin API endpoint: `GET /admin/authority/requests`
- [ ] Add admin API endpoint: `POST /admin/authority/requests/:id/approve`
- [ ] Add admin API endpoint: `POST /admin/authority/requests/:id/reject`

### Frontend Tasks
- [ ] Add authority analytics section to detail modal
- [ ] Add authority requests section to admin dashboard
- [ ] Add approve/reject buttons for requests
- [ ] Add analytics charts (Chart.js)
- [ ] Add notification history view

### WhatsApp Integration Tasks
- [ ] Add `REQUEST AUTHORITY` command handler
- [ ] Add multi-step conversation flow for requests
- [ ] Add notification templates for authority events
- [ ] Test notification delivery
- [ ] Test request flow end-to-end

### Automation Tasks
- [ ] Set up GitHub Actions cron for expiry checks
- [ ] Test expiry warning notifications
- [ ] Add database trigger: notify on authority creation
- [ ] Add database trigger: notify on authority update
- [ ] Add database trigger: notify on authority deletion

### Testing Tasks
- [ ] Test authority granted notification
- [ ] Test authority extended notification
- [ ] Test authority suspended notification
- [ ] Test expiry warnings (7d, 3d, 1d)
- [ ] Test self-service request flow
- [ ] Test admin approval/rejection
- [ ] Test analytics calculations
- [ ] Test analytics dashboard display

---

## 🗄️ Database Schema Changes

```sql
-- Authority notifications log
CREATE TABLE authority_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  authority_id UUID REFERENCES authority_profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- granted, extended, suspended, revoked, expiry_warning
  days_until_expiry INTEGER,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN DEFAULT false
);

-- Authority requests (self-service)
CREATE TABLE authority_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  role_requested TEXT,
  institution TEXT,
  region TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admin_users(id)
);

-- Analytics function
CREATE OR REPLACE FUNCTION get_authority_analytics(
  authority_id UUID,
  days INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'messages_sent', COUNT(DISTINCT m.id),
    'total_recipients', COALESCE(SUM(b.recipient_count), 0),
    'avg_recipients', COALESCE(AVG(b.recipient_count), 0),
    'approval_rate', ROUND(
      COUNT(CASE WHEN m.processed = true THEN 1 END)::NUMERIC / 
      NULLIF(COUNT(*), 0) * 100, 1
    ),
    'last_broadcast', MAX(m.created_at)
  ) INTO result
  FROM messages m
  LEFT JOIN broadcasts b ON b.moment_id = m.id
  WHERE m.from_number = (
    SELECT user_identifier FROM authority_profiles WHERE id = authority_id
  )
  AND m.created_at > NOW() - INTERVAL '1 day' * days;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Expected Impact

| Metric | Before Phase 3 | After Phase 3 | Improvement |
|--------|----------------|---------------|-------------|
| Authority onboarding time | 5 min (manual) | 30 sec (automated) | 90% faster |
| Expiry management | Manual tracking | Automated warnings | 100% coverage |
| User satisfaction | Good | Excellent | Proactive communication |
| Admin workload | High | Low | Self-service reduces tickets |

---

## 🚀 Deployment Plan

### Week 4
- **Day 1**: Database schema + notification functions
- **Day 2**: WhatsApp notification integration
- **Day 3**: Expiry warning system + cron job
- **Day 4**: Self-service request flow
- **Day 5**: Analytics dashboard + testing

---

## 📝 Notes

- Notifications should be sent during business hours (9 AM - 6 PM SAST)
- Expiry warnings should be sent at 9 AM daily
- Self-service requests should be reviewed within 24 hours
- Analytics should update in real-time
- Consider adding SMS fallback for critical notifications

---

**Ready to implement Phase 3?** This will complete the authority system automation!
