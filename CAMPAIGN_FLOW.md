# Campaign Activation & Broadcasting Flow

## Current Implementation

### 1. Create Campaign
**Endpoint**: `POST /campaigns`
- Status set to `active` (auto-approved for admin)
- Campaign stored in database
- **No broadcasting happens**

### 2. Activate Campaign  
**Endpoint**: `POST /campaigns/{id}/activate`
- Changes status from any state → `active`
- **No broadcasting happens**
- Just updates database status

### 3. Broadcast Campaign
**Endpoint**: `POST /campaigns/{id}/broadcast`
- Converts campaign → moment
- Gets active subscribers
- Creates broadcast record
- Sends to WhatsApp via broadcast-webhook
- Updates campaign status → `published`
- **This is what actually sends messages**

## What Happens When You Click "▶️ Activate"

Currently: **Only changes database status to 'active'**

```typescript
// Line ~1100 in admin-api/index.ts
if (path.includes('/campaigns/') && path.includes('/activate') && method === 'POST') {
  const { data } = await supabase
    .from('campaigns')
    .update({ status: 'active' })
    .eq('id', campaignId)
  
  return { success: true, campaign: data }
}
```

## What SHOULD Happen

Option 1: **Activate = Broadcast**
- Rename button to "📡 Broadcast"
- Call `/campaigns/{id}/broadcast` endpoint
- Actually send messages

Option 2: **Two-Step Process**
- Keep "▶️ Activate" (prepares campaign)
- Add "📡 Broadcast" button (sends messages)
- More control, safer

## Recommended: Option 1 (Simplest)

Change frontend to call broadcast endpoint:

```javascript
// In admin.js activateCampaign function
async function activateCampaign(id) {
    showConfirm('Broadcast this campaign now?', async () => {
        const response = await apiFetch(`/campaigns/${id}/broadcast`, {
            method: 'POST'
        });
        
        if (response.ok) {
            showSuccess('Campaign broadcasted successfully');
            loadCampaigns();
        }
    });
}
```

## Budget Tracking

When campaign broadcasts:
1. Gets subscriber count
2. Calculates cost: `count * message_cost` (R0.12)
3. Should create budget_transaction record
4. Should check budget limits
5. **Currently NOT implemented**

## Next Steps

1. ✅ Activate endpoint exists
2. ✅ Broadcast endpoint exists  
3. ❌ Frontend calls wrong endpoint
4. ❌ Budget deduction not implemented
5. ❌ No budget limit checks

**Fix**: Change button action from `/activate` to `/broadcast`
