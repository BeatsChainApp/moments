# Webhook Issues - 2026-01-22

## Issues Found

### 1. WhatsApp Token Expired ❌
```
Error validating access token: Session has expired on Wednesday, 21-Jan-26 16:00:00 PST
```
**Fix:** Regenerate WhatsApp access token in Meta Business Suite

### 2. No Auto-Response ❌
User sends moment → No confirmation message sent back
**Missing:** Confirmation message after moment created

### 3. Duplicate Moments ❌
Same message creates 2 moments (1 second apart):
- `2026/01/22, 11:07:34` 
- `2026/01/22, 11:07:35`

**Root cause:** No deduplication check before insert
- Schema has `whatsapp_id TEXT UNIQUE` constraint
- Code doesn't check if message already processed
- WhatsApp sends duplicate webhooks sometimes

## Fixes Required

### Fix 1: Add Deduplication Check
```javascript
// Before inserting message, check if already exists
const { data: existing } = await supabase
  .from('messages')
  .select('id')
  .eq('whatsapp_id', message.id)
  .single();

if (existing) {
  console.log(`⏭️ Skipping duplicate message: ${message.id}`);
  return;
}
```

### Fix 2: Send Auto-Response
```javascript
// After moment created, send confirmation
await sendWhatsAppMessage(fromNumber, 
  `✅ Thank you! Your moment has been received and is under review.\n\n` +
  `📋 Title: ${title}\n` +
  `⏱️ Status: ${status}\n\n` +
  `You'll be notified once it's approved.`
);
```

### Fix 3: Update WhatsApp Token
1. Go to Meta Business Suite
2. Navigate to WhatsApp Business API
3. Generate new access token
4. Update `.env` file: `WHATSAPP_TOKEN=new_token`
5. Redeploy

## Implementation Priority
1. **HIGH**: Fix duplicate moments (deduplication)
2. **HIGH**: Update WhatsApp token (blocking sends)
3. **MEDIUM**: Add auto-response (user experience)
