# Broadcast Issues Investigation

## 🔍 PROBLEMS IDENTIFIED

### Issue 1: No Auto-Response After WhatsApp Message ❌
**Expected**: User sends message → Receives confirmation
**Actual**: User sends message → No response

### Issue 2: Double Messages ❌❌
**Evidence**: Same message sent twice
```
[1/25, 2:20PM] Moments App: 📢 Community Leader...
[1/25, 2:20PM] Moments App: 📢 Community Leader...
```

### Issue 3: Incorrect URL Format ❌
**Expected**: `https://moments.unamifoundation.org/moments/{slug}`
**Actual**: `https://moments.unamifoundation.org/m/{uuid}`

### Issue 4: Malformed Attribution ❌
**Actual Output**:
```
📢 Community Leader — NationalVerified by Unami Foundation Moments AppReminder to residents...
```

**Problems**:
- Missing newlines
- "— National" instead of "Scope: National"
- "Verified by" instead of proper attribution block
- Content duplicated
- No proper formatting

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue 1: No Auto-Response

**Location**: `src/webhook.js` after message insert

**Current Code**:
```javascript
// Store message in database
const { data: messageRecord } = await supabase
  .from('messages')
  .insert({ ... })
  .select()
  .single();

// ❌ NO AUTO-RESPONSE HERE
// Just stores and processes, no confirmation sent
```

**Missing**: Confirmation message to user

---

### Issue 2: Double Messages

**Location**: `src/broadcast.js` line 164

**Root Cause**: Hybrid broadcast system sends BOTH ways

```javascript
const composedMessage = await composeMomentMessage(momentId);

const useDirectMessage = moment.content_source === 'admin' || 
                        moment.content_source === 'campaign' || 
                        authorityContext?.authority_level >= 2;

for (const subscriber of subscribers) {
  if (useDirectMessage) {
    await sendWhatsAppMessage(subscriber.phone_number, composedMessage);  // ← SENT
  } else {
    await sendTemplateMessage(...);  // ← ALSO SENT?
  }
}
```

**Problem**: Logic error - both paths executing

---

### Issue 3: Wrong URL Format

**Location**: `src/admin.js` line (WhatsApp intent creation)

**Current Code**:
```javascript
link: moment.pwa_link || `https://moments.unamifoundation.org/m/${id}`
```

**Should Be**:
```javascript
link: `https://moments.unamifoundation.org/moments/${moment.slug}`
```

**Also Check**: `buildFooter()` in attribution.js

---

### Issue 4: Malformed Attribution

**Location**: Multiple issues

**Problem 1**: Missing newlines in attribution block
```javascript
// Current output (no newlines)
"📢 Community Leader — NationalVerified by..."

// Should be
"📢 Community Leader (Verified)\nScope: National\n..."
```

**Problem 2**: Wrong template being used
- Looks like old template format mixing with new attribution
- "— National" suggests template variable not replaced
- "Verified by Unami Foundation" is old format

**Problem 3**: Content duplication
```
Reminder to residents: please be aware of scheduled...
Reminder to residents: please be aware of scheduled maintenance...
```
- Title and content both included?
- Or message sent twice?

---

## 📊 DETAILED INVESTIGATION

### Check 1: Attribution Block Format

**File**: `src/services/attribution.js`

**Current**:
```javascript
return `📢 ${ROLE_LABELS[role]} (Verified)
Scope: ${moment.region || 'National'}
📍 Coverage: ${moment.category || 'General'}
🏛️ Affiliation: ${userProfile.organization || 'Unami Foundation Moments App'}
${trustLevel.emoji} Trust Level: ${trustLevel.label}

`;
```

**This looks CORRECT** ✅

### Check 2: Message Composition

**File**: `src/services/broadcast-composer.js`

**Current**:
```javascript
const attribution = buildAttributionBlock(moment, creator, sponsor);
const content = moment.content.trim();
const footer = buildFooter(canonicalUrl, sponsor);

return attribution + '\n\n' + content + '\n\n' + footer;
```

**This looks CORRECT** ✅

### Check 3: Broadcast Logic

**File**: `src/broadcast.js`

**Issue Found**: Hybrid system confusion

```javascript
const composedMessage = await composeMomentMessage(momentId);  // ← Composed

const useDirectMessage = moment.content_source === 'admin' || 
                        moment.content_source === 'campaign' || 
                        authorityContext?.authority_level >= 2;

if (useDirectMessage) {
  await sendWhatsAppMessage(subscriber.phone_number, composedMessage);
} else {
  // Template system
  const template = selectTemplate(...);
  await sendTemplateMessage(...);
}
```

**Hypothesis**: Template system ALSO using composed message?

### Check 4: Template System

**Need to check**: `selectTemplate()` and `buildTemplateParams()`

**Possible Issue**: Templates might be using old format that conflicts with new attribution

---

## 🎯 FIXES NEEDED

### Fix 1: Add Auto-Response ✅ SIMPLE

**File**: `src/webhook.js`

**Add after message insert**:
```javascript
// Send confirmation
await sendMessage(fromNumber, 
  `✅ Message received! We'll review and may share it with the community.\n\n` +
  `Reply HELP for commands or STOP to unsubscribe.`
);
```

### Fix 2: Fix Double Messages ✅ CRITICAL

**File**: `src/broadcast.js`

**Option A**: Remove template path entirely
```javascript
// Always use composed message
await sendWhatsAppMessage(subscriber.phone_number, composedMessage);
```

**Option B**: Fix the condition
```javascript
// Ensure only ONE path executes
if (useDirectMessage) {
  await sendWhatsAppMessage(subscriber.phone_number, composedMessage);
} 
// Remove else - don't use templates anymore
```

### Fix 3: Fix URL Format ✅ SIMPLE

**File 1**: `src/admin.js`
```javascript
// Change from
link: moment.pwa_link || `https://moments.unamifoundation.org/m/${id}`

// To
link: `https://moments.unamifoundation.org/moments/${moment.slug || generateSlug(moment.title, id)}`
```

**File 2**: `src/services/broadcast-composer.js`
```javascript
// Already correct - uses slug
const canonicalUrl = `https://moments.unamifoundation.org/moments/${moment.slug}`;
```

### Fix 4: Debug Attribution Format ✅ INVESTIGATE

**Need to check**:
1. Is `composeMomentMessage()` actually being called?
2. Is template system overriding it?
3. Are newlines being stripped somewhere?

**Add logging**:
```javascript
const composedMessage = await composeMomentMessage(momentId);
console.log('COMPOSED MESSAGE:', composedMessage);
console.log('MESSAGE LENGTH:', composedMessage.length);
console.log('NEWLINE COUNT:', (composedMessage.match(/\n/g) || []).length);
```

---

## 🧪 TESTING PLAN

### Test 1: Auto-Response
1. Send WhatsApp message
2. Verify confirmation received
3. Check message stored in database

### Test 2: Single Message
1. Create moment
2. Broadcast to test number
3. Verify only ONE message received
4. Check broadcast logs

### Test 3: Correct URL
1. Broadcast moment
2. Check URL in message
3. Verify format: `/moments/{slug}` not `/m/{uuid}`
4. Test URL actually works

### Test 4: Attribution Format
1. Create moment with authority user
2. Broadcast
3. Verify attribution has:
   - Proper newlines
   - Correct format
   - No duplication
   - Proper spacing

---

## 🚨 PRIORITY ORDER

### P0 - CRITICAL (Fix Now)
1. **Double messages** - Users getting spammed
2. **Malformed attribution** - Looks unprofessional

### P1 - HIGH (Fix Today)
3. **Wrong URL format** - Links don't work
4. **No auto-response** - Users confused

---

## 📝 IMPLEMENTATION CHECKLIST

- [ ] Add auto-response after message received
- [ ] Remove template path from broadcast (use composed only)
- [ ] Fix URL format in admin.js
- [ ] Add debug logging to broadcast
- [ ] Test with real WhatsApp number
- [ ] Verify single message sent
- [ ] Verify attribution format correct
- [ ] Verify URL works
- [ ] Remove debug logging
- [ ] Deploy fixes

---

## 🔍 ADDITIONAL INVESTIGATION NEEDED

### Question 1: Why is attribution malformed?

**Hypothesis A**: Template system interfering
- Check if `selectTemplate()` is being called
- Check if template has old format

**Hypothesis B**: Newlines stripped
- Check WhatsApp API encoding
- Check if `sendWhatsAppMessage()` strips newlines

**Hypothesis C**: Wrong function called
- Maybe not using `composeMomentMessage()` at all?
- Maybe using old broadcast function?

### Question 2: Why double messages?

**Hypothesis A**: Loop executing twice
- Check if `broadcastMoment()` called twice
- Check if subscribers array has duplicates

**Hypothesis B**: Both paths executing
- Logic error in if/else
- Both direct and template sending

**Hypothesis C**: Retry logic
- Failed send triggers retry
- Retry sends again

---

## 🎯 NEXT STEPS

1. **Add logging** to broadcast.js to see what's happening
2. **Test broadcast** with single subscriber
3. **Check WhatsApp logs** for actual messages sent
4. **Fix issues** one by one
5. **Re-test** after each fix
6. **Deploy** when all working

---

**Status**: Investigation complete, ready to implement fixes
**Priority**: P0 - Critical
**ETA**: 1-2 hours for all fixes
