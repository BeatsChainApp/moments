# Interactive Elements Enhancement Plan
## Unami Foundation Moments App

### ✅ Currently Implemented (Properly Branded)

**Welcome Flow:**
```
🌟 Welcome to Unami Foundation Moments App!
Get community updates across South Africa.
[📍 Choose Regions] [🏷️ Choose Interests] [❓ Help]
```

**Help Command:**
```
📡 Unami Foundation Moments App - Command Guide
...
Your community sharing platform 🇿🇦
```

---

### 🎯 Priority 1: Critical User Management (Add These)

#### 1. STATUS Command
```typescript
// User types: STATUS
await sendInteractiveButtons(phoneNumber,
  '⚙️ Unami Foundation Moments App\n\nYour Settings:\n📍 Regions: KZN, WC\n🏷️ Topics: Education, Safety\n🔔 Status: Active\n📊 Moments received: 12',
  [
    { id: 'btn_change_regions', title: '📍 Change Regions' },
    { id: 'btn_change_topics', title: '🏷️ Change Topics' },
    { id: 'btn_pause', title: '⏸️ Pause 7 Days' }
  ]
)
```

#### 2. Unsubscribe Confirmation
```typescript
// User types: STOP
await sendInteractiveButtons(phoneNumber,
  '⚠️ Unami Foundation Moments App\n\nAre you sure you want to unsubscribe?\n\nYou'll stop receiving community updates.',
  [
    { id: 'btn_pause_instead', title: '⏸️ Pause Instead' },
    { id: 'btn_confirm_unsub', title: '✅ Yes, Unsubscribe' },
    { id: 'btn_cancel', title: '❌ Cancel' }
  ]
)
```

#### 3. LANGUAGE Command
```typescript
// User types: LANGUAGE
await sendInteractiveButtons(phoneNumber,
  '🌍 Unami Foundation Moments App\n\nChoose your language:',
  [
    { id: 'lang_en', title: '🇬🇧 English' },
    { id: 'lang_zu', title: '🇿🇦 isiZulu' },
    { id: 'lang_xh', title: '🇿🇦 isiXhosa' }
  ]
)
```

---

### 🎯 Priority 2: Content Discovery

#### 4. RECENT Command
```typescript
// User types: RECENT
await sendInteractiveList(phoneNumber,
  '📰 Unami Foundation Moments App\n\nRecent moments in your regions:',
  'View Moments',
  [{
    title: 'Your Regions',
    rows: [
      { id: 'recent_kzn', title: '🏖️ KZN (3 new)', description: 'Last 24 hours' },
      { id: 'recent_wc', title: '🍷 WC (5 new)', description: 'Last 24 hours' },
      { id: 'recent_all', title: '📋 View All', description: 'All regions' }
    ]
  }]
)
```

#### 5. Content Submission Wizard
```typescript
// User types: SUBMIT
await sendInteractiveList(phoneNumber,
  '📝 Unami Foundation Moments App\n\nWhat type of moment are you sharing?',
  'Select Category',
  [{
    title: 'Categories',
    rows: [
      { id: 'submit_edu', title: '🎓 Education', description: 'Training, workshops' },
      { id: 'submit_saf', title: '🛡️ Safety', description: 'Alerts, warnings' },
      { id: 'submit_opp', title: '💼 Opportunity', description: 'Jobs, programs' },
      { id: 'submit_eve', title: '🎉 Event', description: 'Gatherings' },
      { id: 'submit_other', title: '✏️ Other', description: 'General update' }
    ]
  }]
)
```

#### 6. REPORT Command
```typescript
// User types: REPORT (when replying to a moment)
await sendInteractiveButtons(phoneNumber,
  '🚨 Unami Foundation Moments App\n\nReport this moment:',
  [
    { id: 'report_spam', title: '📢 Spam' },
    { id: 'report_inappropriate', title: '⚠️ Inappropriate' },
    { id: 'report_wrong', title: '❌ Wrong Info' }
  ]
)
```

---

### 🎯 Priority 3: Engagement Features

#### 7. Post-Subscription Confirmation
```typescript
// After successful subscription
await sendInteractiveButtons(phoneNumber,
  '✅ Unami Foundation Moments App\n\nYou're subscribed!\n\nSet up your preferences now:',
  [
    { id: 'setup_regions', title: '📍 Set Regions' },
    { id: 'setup_interests', title: '🏷️ Set Interests' },
    { id: 'setup_done', title: '✅ Done' }
  ]
)
```

#### 8. Post-Region Selection
```typescript
// After region selection
await sendInteractiveButtons(phoneNumber,
  '✅ Regions updated!\n\nUnami Foundation Moments App\n\nWhat's next?',
  [
    { id: 'see_moments', title: '📰 See Moments' },
    { id: 'add_more_regions', title: '➕ Add More' },
    { id: 'done', title: '✅ Done' }
  ]
)
```

#### 9. Post-Interest Selection
```typescript
// After interest selection
await sendInteractiveButtons(phoneNumber,
  '✅ Interests updated!\n\nUnami Foundation Moments App\n\nWhat's next?',
  [
    { id: 'see_moments', title: '📰 See Moments' },
    { id: 'add_more_topics', title: '➕ Add More' },
    { id: 'done', title: '✅ Done' }
  ]
)
```

#### 10. Post-Submission Confirmation
```typescript
// After content submission
await sendInteractiveButtons(phoneNumber,
  '📝 Thank you!\n\nUnami Foundation Moments App\n\nYour moment is under review.',
  [
    { id: 'submit_another', title: '📝 Submit Another' },
    { id: 'browse_moments', title: '📰 Browse' },
    { id: 'done', title: '✅ Done' }
  ]
)
```

---

### 🎯 Priority 4: Authority Users

#### 11. MYAUTHORITY Command (for verified users)
```typescript
// User types: MYAUTHORITY
await sendInteractiveButtons(phoneNumber,
  '👑 Unami Foundation Moments App\n\nYour Authority Profile:\n\nLevel: 3 - Community Leader\nScope: KZN Region\nReach: 400 subscribers\nAuto-approval: Enabled',
  [
    { id: 'auth_stats', title: '📊 My Stats' },
    { id: 'auth_pending', title: '✅ Pending (2)' },
    { id: 'auth_help', title: '❓ Help' }
  ]
)
```

#### 12. Quick Moderation (for authority users)
```typescript
// Authority user receives pending content
await sendInteractiveButtons(phoneNumber,
  '🔍 Unami Foundation Moments App\n\nPending Review:\n\n"New community garden opening..."\n\nFrom: +2765...\nRisk: Low (0.2)',
  [
    { id: 'mod_approve', title: '✅ Approve' },
    { id: 'mod_reject', title: '❌ Reject' },
    { id: 'mod_skip', title: '⏭️ Skip' }
  ]
)
```

---

### 🎯 Priority 5: Notification Control

#### 13. PAUSE Command
```typescript
// User types: PAUSE
await sendInteractiveList(phoneNumber,
  '⏸️ Unami Foundation Moments App\n\nPause notifications for:',
  'Select Duration',
  [{
    title: 'Duration',
    rows: [
      { id: 'pause_1d', title: '1 Day', description: 'Resume tomorrow' },
      { id: 'pause_3d', title: '3 Days', description: 'Resume in 3 days' },
      { id: 'pause_7d', title: '7 Days', description: 'Resume in 1 week' },
      { id: 'pause_30d', title: '30 Days', description: 'Resume in 1 month' }
    ]
  }]
)
```

#### 14. SCHEDULE Command
```typescript
// User types: SCHEDULE
await sendInteractiveList(phoneNumber,
  '🔔 Unami Foundation Moments App\n\nWhen should we send updates?',
  'Select Time',
  [{
    title: 'Delivery Times',
    rows: [
      { id: 'sched_instant', title: '⚡ Instant', description: 'As they happen' },
      { id: 'sched_morning', title: '🌅 Morning', description: '8 AM daily' },
      { id: 'sched_evening', title: '🌆 Evening', description: '6 PM daily' },
      { id: 'sched_weekly', title: '📅 Weekly', description: 'Friday digest' }
    ]
  }]
)
```

---

### 🎯 Priority 6: Advanced Features

#### 15. FEEDBACK Command
```typescript
// User types: FEEDBACK
await sendInteractiveButtons(phoneNumber,
  '💬 Unami Foundation Moments App\n\nShare your feedback:',
  [
    { id: 'feedback_good', title: '👍 Love it' },
    { id: 'feedback_suggest', title: '💡 Suggestion' },
    { id: 'feedback_issue', title: '🐛 Report Issue' }
  ]
)
```

#### 16. SEARCH Command
```typescript
// User types: SEARCH
await sendInteractiveList(phoneNumber,
  '🔍 Unami Foundation Moments App\n\nSearch moments by:',
  'Select Filter',
  [{
    title: 'Search Options',
    rows: [
      { id: 'search_region', title: '📍 By Region', description: 'Filter location' },
      { id: 'search_topic', title: '🏷️ By Topic', description: 'Filter category' },
      { id: 'search_date', title: '📅 By Date', description: 'Filter time' },
      { id: 'search_popular', title: '🔥 Popular', description: 'Most engaged' }
    ]
  }]
)
```

---

## Implementation Priority

### Week 1 (Critical)
1. STATUS command
2. Unsubscribe confirmation
3. Post-subscription confirmation

### Week 2 (Important)
4. LANGUAGE command
5. RECENT command
6. Content submission wizard

### Week 3 (Engagement)
7. Post-action confirmations (regions/interests/submission)
8. REPORT command
9. PAUSE command

### Week 4 (Advanced)
10. MYAUTHORITY command
11. FEEDBACK command
12. SCHEDULE command

---

## Branding Consistency Rules

✅ **Always include:** "Unami Foundation Moments App" in:
- Welcome messages
- Help text
- Command responses
- Confirmation messages
- Error messages

✅ **Always include:** Website link
- `moments.unamifoundation.org/moments`

✅ **Always include:** Support email
- `info@unamifoundation.org`

✅ **Always include:** South African context
- 🇿🇦 emoji
- "Your community sharing platform"
- Regional references

---

## Technical Notes

- Max 3 buttons per message
- Max 10 list items per section
- Button text max 20 characters
- List title max 24 characters
- Always provide text fallback
- Log all button interactions
- Track button usage analytics

**Status:** Ready for incremental implementation
