# PHASE 1 VERIFICATION CHECKLIST

## Pre-Deployment Verification

### ✅ 1. MCP Advisory Function
- [ ] File created: `supabase/mcp_advisory_function.sql`
- [ ] Function handles harm detection (violence, threats)
- [ ] Function handles spam detection (scams, commercial)
- [ ] Returns JSONB with confidence scores
- [ ] Grants execute permissions to service_role

**Test Query:**
```sql
SELECT mcp_advisory('This is a safe community message');
SELECT mcp_advisory('Click here to win money now!');
SELECT mcp_advisory('I will kill you');
```

**Expected Results:**
- Safe message: confidence < 0.3
- Spam message: confidence > 0.7
- Harmful message: confidence > 0.8

---

### ✅ 2. Command Filtering (Webhook)
- [ ] Commands identified before message insertion
- [ ] Commands NOT stored in messages table
- [ ] Commands still processed (START/STOP work)
- [ ] Media download implemented for non-commands

**Verification:**
```bash
# Send START via WhatsApp
# Check messages table - should be EMPTY
SELECT * FROM messages WHERE content ILIKE '%start%';

# Send regular message
# Check messages table - should have entry
SELECT * FROM messages WHERE content NOT ILIKE ANY(ARRAY['%start%', '%stop%', '%help%']);
```

---

### ✅ 3. Auto-Approve Logic (Admin API)
- [ ] Checks risk score < 0.3
- [ ] Updates moderation_status to 'approved'
- [ ] Creates moderation_audit record
- [ ] Logs auto-approval action

**Verification:**
```sql
-- Check auto-approved messages
SELECT m.id, m.content, m.moderation_status, a.confidence
FROM messages m
LEFT JOIN advisories a ON a.message_id = m.id
WHERE m.moderation_status = 'approved';

-- Check audit trail
SELECT * FROM moderation_audit 
WHERE moderator = 'system_auto' 
ORDER BY timestamp DESC;
```

---

### ✅ 4. Media Download (Webhook)
- [ ] Detects image/video/audio messages
- [ ] Downloads from WhatsApp API
- [ ] Uploads to Supabase Storage (media bucket)
- [ ] Stores in media table
- [ ] Updates message.media_url

**Verification:**
```sql
-- Check media records
SELECT m.id, m.from_number, m.media_url, med.storage_path, med.processed
FROM messages m
JOIN media med ON med.message_id = m.id
WHERE m.message_type IN ('image', 'video', 'audio');

-- Check storage
-- Visit: https://bxmdzcxejcxbinghtyfw.supabase.co/storage/v1/object/public/media/whatsapp/
```

---

### ✅ 5. Pagination (Admin API)
- [ ] Moderation: ?page=1&limit=20
- [ ] Subscribers: ?page=1&limit=20
- [ ] Broadcasts: ?page=1&limit=20
- [ ] Returns pagination metadata

**Test Requests:**
```bash
# Moderation
curl "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/moderation?page=1&limit=5" \
  -H "Authorization: Bearer [token]"

# Subscribers
curl "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/subscribers?page=1&limit=5" \
  -H "Authorization: Bearer [token]"

# Broadcasts
curl "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/broadcasts?page=1&limit=5" \
  -H "Authorization: Bearer [token]"
```

**Expected Response:**
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 25,
    "totalPages": 5
  }
}
```

---

## Post-Deployment Verification

### Test Scenario 1: Command Filtering
1. Send `START` via WhatsApp
2. Check moderation panel → Should NOT appear
3. Check subscriptions table → Should have entry
4. Receive welcome message

**SQL Check:**
```sql
SELECT COUNT(*) FROM messages WHERE content ILIKE '%start%';
-- Expected: 0

SELECT * FROM subscriptions WHERE phone_number = '+27...';
-- Expected: 1 row with opted_in = true
```

---

### Test Scenario 2: Auto-Approve
1. Send safe message: "Community meeting tomorrow at 3pm"
2. Wait 5 seconds
3. Check moderation panel → Should show as APPROVED
4. Check audit trail

**SQL Check:**
```sql
SELECT m.content, m.moderation_status, a.confidence
FROM messages m
LEFT JOIN advisories a ON a.message_id = m.id
WHERE m.content ILIKE '%community meeting%';
-- Expected: moderation_status = 'approved', confidence < 0.3

SELECT * FROM moderation_audit WHERE moderator = 'system_auto';
-- Expected: Entry with action = 'approved'
```

---

### Test Scenario 3: Risk Score Display
1. Send various messages (safe, spam, harmful)
2. Open admin moderation panel
3. Verify risk levels show correctly (not UNKNOWN)

**Expected:**
- Safe message: GREEN badge "LOW"
- Spam message: ORANGE badge "MEDIUM" or RED "HIGH"
- Harmful message: RED badge "HIGH"

---

### Test Scenario 4: Media Download
1. Send image via WhatsApp
2. Check media table for entry
3. Check Supabase Storage for file
4. Verify media_url in messages table
5. Check admin panel displays image

**SQL Check:**
```sql
SELECT m.id, m.media_url, med.storage_path, med.processed
FROM messages m
JOIN media med ON med.message_id = m.id
WHERE m.message_type = 'image'
ORDER BY m.created_at DESC
LIMIT 1;
-- Expected: media_url populated, processed = true
```

---

### Test Scenario 5: Pagination
1. Create 25+ test messages
2. Open moderation panel
3. Verify shows 20 items per page
4. Click "Next" → Shows next 5 items
5. Verify page numbers work

**UI Check:**
- Page 1 shows items 1-20
- Page 2 shows items 21-25
- Total pages = 2
- Navigation buttons work

---

## Rollback Plan

If any critical issue occurs:

```bash
# 1. Revert webhook function
cd supabase/functions/webhook
git checkout HEAD~1 index.ts
supabase functions deploy webhook

# 2. Revert admin-api function
cd ../admin-api
git checkout HEAD~1 index.ts
supabase functions deploy admin-api

# 3. Drop MCP function (if causing issues)
# Run in Supabase SQL Editor:
DROP FUNCTION IF EXISTS mcp_advisory;
```

---

## Success Criteria

- [ ] MCP function returns valid risk scores (not UNKNOWN)
- [ ] Commands filtered from moderation panel
- [ ] Safe messages auto-approved (< 0.3 risk)
- [ ] Images download and display correctly
- [ ] Pagination works on all 3 endpoints
- [ ] No errors in Supabase logs
- [ ] Audit trail records all actions
- [ ] Subscribers can opt-in/out successfully

---

## Known Issues / Limitations

1. **MCP is keyword-based** - Not AI-powered, may have false positives
2. **Auto-approve threshold** - Set conservatively at 0.3, may need tuning
3. **Media download** - Requires WhatsApp token with media permissions
4. **Pagination** - Offset-based, may be slow with 10K+ records

---

## Next Phase Preview

**Phase 2 (UX Fixes):**
- PWA media URL decoding
- PWA date/time format improvements
- Mobile tag layout fixes
- Broadcast history contrast fixes

**Phase 3 (Feature Complete):**
- Comments backend API
- Enhanced audit logging
- Feature flags system
- Performance optimizations
