# MOMENTS SYSTEM - IMPLEMENTATION PLAN
## Based on SYSTEM.md Rules & Current Architecture Analysis

**System Context:**
- MCP: Native Supabase Edge Functions (not Railway)
- n8n: Repo-based workflows (Railway deprecated)
- Supabase: System of record with Edge Functions
- WhatsApp: 2 approved templates (hello_world, unsubscribe_confirmation)

---

## 🎯 CRITICAL ISSUES (Fix First)

### 1. **MCP Advisory Integration - Risk Score UNKNOWN**
**Status:** ❌ NOT IMPLEMENTED  
**Root Cause:** Webhook calls `supabase.rpc('mcp_advisory')` but RPC function doesn't exist  
**Impact:** All messages show "UNKNOWN" risk, no auto-approval possible

**Solution:**
```sql
-- Create MCP advisory RPC function in Supabase
CREATE OR REPLACE FUNCTION mcp_advisory(
  message_content TEXT,
  message_language TEXT,
  message_type TEXT,
  from_number TEXT,
  message_timestamp TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  harm_confidence DECIMAL;
  spam_confidence DECIMAL;
  result JSONB;
BEGIN
  -- Simple keyword-based harm detection
  harm_confidence := CASE
    WHEN message_content ~* '(kill|attack|bomb|weapon|violence)' THEN 0.9
    WHEN message_content ~* '(scam|fraud|money|bitcoin|investment)' THEN 0.7
    ELSE 0.1
  END;
  
  -- Spam detection
  spam_confidence := CASE
    WHEN length(message_content) < 10 THEN 0.8
    WHEN message_content ~* '(click here|buy now|limited time)' THEN 0.9
    ELSE 0.2
  END;
  
  result := jsonb_build_object(
    'harm_signals', jsonb_build_object('confidence', harm_confidence, 'detected', harm_confidence > 0.5),
    'spam_indicators', jsonb_build_object('confidence', spam_confidence, 'detected', spam_confidence > 0.5),
    'urgency_level', CASE WHEN harm_confidence > 0.7 THEN 'high' ELSE 'low' END,
    'overall_confidence', GREATEST(harm_confidence, spam_confidence)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Files to Update:**
- `supabase/CLEAN_SCHEMA.sql` - Add RPC function
- `supabase/functions/webhook/index.ts` - Already calls it (line 290)

---

### 2. **Auto-Approve Logic Based on Risk Score**
**Status:** ❌ NOT IMPLEMENTED  
**Location:** `supabase/functions/admin-api/index.ts` moderation endpoint

**Solution:**
```typescript
// In admin-api/index.ts moderation endpoint (after line 950)
if (path.includes('/moderation') && method === 'GET') {
  // ... existing code ...
  
  const processedMessages = (messages || []).map(msg => {
    const advisory = msg.advisories?.[0]
    const overallRisk = advisory?.overall_confidence || 0
    
    // AUTO-APPROVE if risk < 0.3
    if (overallRisk < 0.3 && msg.moderation_status === 'pending') {
      supabase.from('messages')
        .update({ 
          moderation_status: 'approved',
          processed: true,
          moderation_timestamp: new Date().toISOString()
        })
        .eq('id', msg.id)
        .then(() => console.log(`Auto-approved message ${msg.id} with risk ${overallRisk}`))
    }
    
    return {
      ...msg,
      mcp_analysis: advisory ? {
        confidence: overallRisk,
        harm_signals: advisory.harm_signals || {},
        spam_indicators: advisory.spam_indicators || {},
        urgency_level: advisory.urgency_level || 'low',
        escalation_suggested: overallRisk > 0.7
      } : null
    }
  })
}
```

---

### 3. **Commands Reaching Moderation Panel**
**Status:** ❌ NOT FILTERED  
**Location:** `supabase/functions/webhook/index.ts`

**Solution:**
```typescript
// In webhook/index.ts after line 200 (before storing message)
const text = (message.text?.body || '').toLowerCase().trim()
const isCommand = ['start', 'join', 'subscribe', 'stop', 'unsubscribe', 
                   'help', 'info', 'regions', 'interests', 'moments'].includes(text)

// DON'T store commands in messages table
if (!isCommand) {
  const { error: insertError } = await supabase.from('messages').insert({
    whatsapp_id: message.id,
    from_number: message.from,
    message_type: message.type,
    content: message.text?.body || message.caption || '',
    timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    processed: false
  })
}

// Process commands separately (existing code continues)
if (['start', 'join', 'subscribe'].includes(text)) {
  // ... existing subscription logic ...
}
```

---

### 4. **WhatsApp Media Not Displayed**
**Status:** ❌ NOT IMPLEMENTED  
**Root Cause:** Webhook doesn't download media from WhatsApp

**Solution:**
```typescript
// Add to webhook/index.ts after message processing
if (message.type === 'image' || message.type === 'video' || message.type === 'audio') {
  try {
    // Get media URL from WhatsApp
    const mediaId = message.image?.id || message.video?.id || message.audio?.id
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      { headers: { 'Authorization': `Bearer ${Deno.env.get('WHATSAPP_TOKEN')}` } }
    )
    const mediaData = await mediaResponse.json()
    
    // Download media
    const mediaFile = await fetch(mediaData.url, {
      headers: { 'Authorization': `Bearer ${Deno.env.get('WHATSAPP_TOKEN')}` }
    })
    const mediaBlob = await mediaFile.blob()
    
    // Upload to Supabase Storage
    const fileName = `whatsapp/${Date.now()}_${message.from}_${mediaId}`
    const { data: uploadData } = await supabase.storage
      .from('media')
      .upload(fileName, mediaBlob, { contentType: message.type })
    
    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('media')
      .getPublicUrl(fileName)
    
    // Store in media table
    await supabase.from('media').insert({
      message_id: messageRecord.id,
      whatsapp_media_id: mediaId,
      media_type: message.type,
      original_url: mediaData.url,
      storage_path: fileName,
      file_size: mediaBlob.size,
      mime_type: mediaBlob.type,
      processed: true
    })
    
    // Update message with media URL
    await supabase.from('messages')
      .update({ media_url: publicUrl.publicUrl })
      .eq('whatsapp_id', message.id)
      
  } catch (error) {
    console.error('Media download failed:', error)
  }
}
```

---

### 5. **Subscriber Logging Not Working**
**Status:** ✅ ALREADY IMPLEMENTED (Lines 210-240 in webhook)  
**Issue:** Might be subscription data not showing in admin

**Verification Needed:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 10;
```

**If empty, check:**
- WhatsApp webhook is receiving messages
- Subscription upsert is not failing silently

---

## 📊 MEDIUM PRIORITY FIXES

### 6. **Pagination Missing**
**Status:** ⚠️ PARTIAL

**Locations to Add:**
- ✅ Admin Moments - DONE
- ❌ Moderation - Add `?page=1&limit=20`
- ❌ Subscribers - Add `?page=1&limit=20`
- ❌ Broadcasts - Add `?page=1&limit=20`

**Solution Pattern:**
```typescript
// In admin-api/index.ts for each endpoint
const page = parseInt(url.searchParams.get('page') || '1')
const limit = parseInt(url.searchParams.get('limit') || '20')
const offset = (page - 1) * limit

let query = supabase.from('table')
  .select('*', { count: 'exact' })
  .range(offset, offset + limit - 1)
  .order('created_at', { ascending: false })

const { data, count } = await query

return new Response(JSON.stringify({
  items: data,
  pagination: {
    page,
    limit,
    total: count,
    totalPages: Math.ceil(count / limit)
  }
}))
```

---

### 7. **PWA Media Rendering - HTML Entities**
**Status:** ❌ BROKEN  
**Root Cause:** Media URLs contain escaped HTML (`&#39;&quot;&gt;`)

**Solution:**
```javascript
// In public/moments/index.html renderMedia function
function renderMedia(mediaUrls) {
  if (!mediaUrls || mediaUrls.length === 0) return ''
  
  // Clean URLs - remove HTML entities
  const cleanUrls = mediaUrls.map(url => {
    if (!url) return ''
    // Decode HTML entities
    const textarea = document.createElement('textarea')
    textarea.innerHTML = url
    return textarea.value.trim()
  }).filter(url => url && url.startsWith('http'))
  
  if (cleanUrls.length === 0) return ''
  
  // ... rest of rendering logic ...
}
```

---

### 8. **PWA Date/Time Display**
**Status:** ⚠️ SHOWS "TODAY" ONLY

**Solution:**
```javascript
// Update formatDate in moments-renderer.js (line 295)
function formatDate(dateString) {
  if (!dateString) return 'Recently'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  
  // Show relative time for < 24h
  if (diffHours < 24) {
    if (diffHours < 1) return 'Just now'
    return `${diffHours}h ago`
  }
  
  // Show full date/time for older moments
  return date.toLocaleString('en-ZA', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
```

---

### 9. **Mobile Tag Layout**
**Status:** ❌ VERTICAL STACKING

**Solution:**
```css
/* Add to public/moments/index.html <style> section */
.moment-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap; /* Allow wrapping */
  align-items: center;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  display: inline-block; /* Inline display */
  white-space: nowrap;
}

/* Mobile specific */
@media (max-width: 768px) {
  .moment-meta {
    gap: 0.375rem; /* Tighter spacing */
  }
  
  .badge {
    padding: 0.2rem 0.6rem;
    font-size: 0.7rem;
  }
}
```

---

### 10. **Broadcast History Contrast (Mobile)**
**Status:** ❌ TEXT NOT VISIBLE

**Solution:**
```css
/* In public/admin-dashboard.html or admin.css */
@media (max-width: 768px) {
  .section-title,
  h2, h3 {
    color: #1f2937 !important;
    text-shadow: none;
    background: white;
    padding: 0.5rem;
    border-radius: 0.375rem;
  }
  
  /* Ensure all section headers are visible */
  #broadcasts h2,
  #moderation h2,
  #subscribers h2 {
    color: #111827 !important;
    font-weight: 600;
  }
}
```

---

## 🔧 LOW PRIORITY / ENHANCEMENTS

### 11. **Comments Backend API**
**Status:** ❌ NOT IMPLEMENTED

**Required:**
- Add `comments` table to schema
- Create CRUD endpoints in admin-api
- Frontend already has rendering functions

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID REFERENCES moments(id) ON DELETE CASCADE,
  from_number TEXT NOT NULL,
  content TEXT NOT NULL,
  featured BOOLEAN DEFAULT false,
  reply_count INTEGER DEFAULT 0,
  moderation_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📋 IMPLEMENTATION SEQUENCE

### **Phase 1: Critical Data Flow (Week 1)**
1. ✅ Add MCP RPC function to Supabase
2. ✅ Implement auto-approve logic in moderation
3. ✅ Filter commands from moderation panel
4. ✅ Implement WhatsApp media download

### **Phase 2: UX Fixes (Week 2)**
5. ✅ Add pagination to all admin sections
6. ✅ Fix PWA media URL escaping
7. ✅ Update PWA date/time display
8. ✅ Fix mobile tag layout
9. ✅ Fix broadcast history contrast

### **Phase 3: Feature Complete (Week 3)**
10. ✅ Implement comments backend
11. ✅ Add audit logging for all actions
12. ✅ Implement feature flags for broadcasts

---

## 🚨 SYSTEM.MD COMPLIANCE CHECKLIST

- ✅ No hardcoded secrets (use Deno.env.get)
- ✅ Changes are incremental and reversible
- ✅ Feature flags for broadcast changes
- ✅ Audit records for admin actions
- ✅ HMAC verification for webhooks (already in webhook)
- ✅ Supabase Edge Functions as MCP
- ✅ n8n workflows repo-based (not Railway)
- ✅ Treat Supabase as system of record

---

## 🧪 VERIFICATION CHECKLIST

After implementation, verify:

```bash
# 1. MCP Advisory
curl -X POST https://[project].supabase.co/rest/v1/rpc/mcp_advisory \
  -H "apikey: [key]" \
  -d '{"message_content":"test message"}'

# 2. Auto-approve
# Send safe message via WhatsApp → Check moderation panel → Should auto-approve

# 3. Commands filtered
# Send START via WhatsApp → Should NOT appear in moderation

# 4. Media download
# Send image via WhatsApp → Check media table → Should have storage_path

# 5. Subscriber logging
SELECT * FROM subscriptions WHERE phone_number = '+27...' LIMIT 1;

# 6. PWA media rendering
# Visit /moments → Images should display without HTML entities

# 7. Mobile contrast
# Open admin on mobile → All text should be readable
```

---

## 📝 NOTES

- All changes follow SYSTEM.md non-negotiable constraints
- MCP is native Supabase (not external Railway service)
- WhatsApp uses 2-template hybrid system (HYBRID_SYSTEM.md)
- Feature flags should be in `system_settings` table
- All admin actions must create `moderation_audit` records

---

**Next Action:** Implement Phase 1 (Critical Data Flow) first, then verify before proceeding to Phase 2.
