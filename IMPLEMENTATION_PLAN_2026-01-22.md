# Post-School Test Implementation Plan - 2026-01-22

## ✅ CONFIRMED: Database Schemas Already Deployed

**Production Verification:**
- `authority_profiles` table EXISTS ✅
- `campaign_budgets` table EXISTS ✅
- All functions and indexes deployed ✅

**This means:** We only need to build the API layer (22 hours total, not 50+)

---

## Implementation Phases

### Phase 1: Authority API (4 hours)
**File:** `src/authority-api.js`

**Endpoints to implement:**
```javascript
GET    /admin/authority              // List with filters
POST   /admin/authority              // Create profile
PUT    /admin/authority/:id          // Update profile
DELETE /admin/authority/:id          // Delete profile
POST   /admin/authority/:id/suspend  // Suspend profile
GET    /admin/authority/:id/audit    // Audit log
```

**Database schema already has:**
- authority_profiles (15 columns)
- authority_audit_log
- lookup_authority() function
- log_authority_action() function

**Implementation:**
1. Create authority-api.js with CRUD operations
2. Add filtering (status, scope, level, search)
3. Add pagination
4. Wire audit logging
5. Update server-bulletproof.js imports
6. Replace stub endpoint

**Testing:**
- Create authority profile
- List with filters
- Update profile
- Suspend profile
- View audit log

---

### Phase 2: Budget API (6 hours)
**File:** `src/budget-api.js`

**Endpoints to implement:**
```javascript
GET  /admin/budget/overview          // Global budget stats
GET  /admin/budget/settings          // Budget settings
POST /admin/budget/settings          // Update settings
GET  /admin/budget/sponsors          // Sponsor budgets
POST /admin/budget/sponsors/:id      // Allocate sponsor budget
GET  /admin/budget/transactions      // Transaction history
POST /admin/budget/record            // Record transaction
GET  /admin/budget/roi               // ROI analysis
```

**Database schema already has:**
- campaign_budgets
- budget_transactions
- revenue_events
- campaign_metrics
- check_campaign_budget() function
- campaign_roi_analysis view

**Implementation:**
1. Create budget-api.js with all endpoints
2. Implement getBudgetOverview() - query transactions
3. Implement transaction logging
4. Hook into broadcast completion
5. Add budget enforcement checks
6. Update server-bulletproof.js imports
7. Replace stub endpoints

**Integration points:**
- Hook into `/admin/moments/:id/broadcast`
- Hook into `/admin/campaigns/:id/activate`
- Add budget check before broadcast
- Log transaction after successful broadcast

**Testing:**
- View budget overview
- Record transaction
- Check budget enforcement
- View ROI analysis
- Test auto-pause logic

---

### Phase 3: Analytics API (4 hours)
**File:** `src/analytics-api.js`

**Endpoints to implement:**
```javascript
GET /admin/analytics/historical      // Time-series data
GET /admin/analytics/regional        // Regional breakdown
GET /admin/analytics/categories      // Category performance
GET /admin/analytics/engagement      // Engagement metrics
GET /admin/analytics/export          // CSV export
```

**Database queries needed:**
- Aggregate moments by date
- Aggregate broadcasts by date
- Aggregate subscribers by date
- Regional performance
- Category distribution

**Implementation:**
1. Create analytics-api.js
2. Implement historical data aggregation
3. Add date range support
4. Format data for Chart.js
5. Add export functionality
6. Update server-bulletproof.js imports
7. Replace stub endpoint

**Testing:**
- Query 30-day history
- Query 90-day history
- Test regional breakdown
- Test category breakdown
- Export to CSV

---

### Phase 4: Frontend Integration (6 hours)

**Authority Section:**
- Wire loadAuthorityProfiles() to real API
- Add create/edit forms
- Add suspend functionality
- Add audit log viewer
- Add filtering UI

**Budget Section:**
- Wire loadBudgetControls() to real API
- Display real budget data
- Show transaction history
- Add budget allocation UI
- Show ROI metrics

**Analytics Section:**
- Wire loadHistoricalData() to real API
- Update Chart.js with real data
- Add date range picker
- Add export button
- Show regional/category charts

---

### Phase 5: Testing & Validation (2 hours)

**End-to-End Tests:**
1. Create authority profile → Verify in database
2. Broadcast moment → Verify budget transaction logged
3. View analytics → Verify data matches database
4. Suspend authority → Verify audit log created
5. Exceed budget → Verify auto-pause works

**Performance Tests:**
- Load 100+ authority profiles
- Query 90 days of analytics
- Test with 1000+ transactions

**Security Tests:**
- Verify RLS policies work
- Test authentication required
- Test permission checks

---

## Implementation Order

### Day 1 (After School Test)
1. Create `src/authority-api.js` (2 hours)
2. Wire up authority endpoints (1 hour)
3. Test authority CRUD (1 hour)

### Day 2
1. Create `src/budget-api.js` (3 hours)
2. Hook budget into broadcasts (2 hours)
3. Test budget tracking (1 hour)

### Day 3
1. Create `src/analytics-api.js` (2 hours)
2. Wire up analytics endpoints (1 hour)
3. Test analytics queries (1 hour)

### Day 4
1. Wire frontend authority section (2 hours)
2. Wire frontend budget section (2 hours)
3. Wire frontend analytics section (2 hours)

### Day 5
1. End-to-end testing (1 hour)
2. Performance testing (0.5 hours)
3. Security testing (0.5 hours)

---

## Code Templates

### Authority API Template
```javascript
// src/authority-api.js
import { supabase } from '../config/supabase.js';

export async function getAuthorityProfiles(req, res) {
  const { status, scope, level, search, page = 1, limit = 20 } = req.query;
  
  let query = supabase
    .from('authority_profiles')
    .select('*', { count: 'exact' });
  
  if (status) query = query.eq('status', status);
  if (scope) query = query.eq('scope', scope);
  if (level) query = query.eq('authority_level', level);
  if (search) query = query.or(`user_identifier.ilike.%${search}%,role_label.ilike.%${search}%`);
  
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });
  
  const { data, error, count } = await query;
  
  res.json({
    profiles: data || [],
    total: count || 0,
    page: parseInt(page),
    limit: parseInt(limit)
  });
}

// ... more functions
```

### Budget API Template
```javascript
// src/budget-api.js
import { supabase } from '../config/supabase.js';

export async function getBudgetOverview(req, res) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const { data: transactions } = await supabase
    .from('budget_transactions')
    .select('amount')
    .gte('created_at', startOfMonth.toISOString())
    .eq('transaction_type', 'spend');
  
  const totalSpent = transactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
  
  // Get monthly limit from settings or default
  const monthlyLimit = 10000; // TODO: Get from budget_settings table
  
  res.json({
    total_budget: monthlyLimit,
    spent: totalSpent,
    remaining: monthlyLimit - totalSpent,
    percentage_used: (totalSpent / monthlyLimit) * 100,
    period: 'monthly',
    period_start: startOfMonth.toISOString()
  });
}

// ... more functions
```

### Analytics API Template
```javascript
// src/analytics-api.js
import { supabase } from '../config/supabase.js';

export async function getHistoricalAnalytics(req, res) {
  const days = parseInt(req.query.days) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data: moments } = await supabase
    .from('moments')
    .select('created_at, status')
    .gte('created_at', startDate.toISOString());
  
  const { data: broadcasts } = await supabase
    .from('broadcasts')
    .select('broadcast_started_at, success_count')
    .gte('broadcast_started_at', startDate.toISOString());
  
  // Aggregate by day
  const dailyData = {};
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];
    dailyData[dateKey] = { date: dateKey, moments: 0, broadcasts: 0, delivered: 0 };
  }
  
  moments?.forEach(m => {
    const dateKey = m.created_at.split('T')[0];
    if (dailyData[dateKey]) dailyData[dateKey].moments++;
  });
  
  broadcasts?.forEach(b => {
    const dateKey = b.broadcast_started_at.split('T')[0];
    if (dailyData[dateKey]) {
      dailyData[dateKey].broadcasts++;
      dailyData[dateKey].delivered += b.success_count || 0;
    }
  });
  
  res.json({ data: Object.values(dailyData), days });
}

// ... more functions
```

---

## Success Criteria

### Authority System
- ✅ Can create authority profiles
- ✅ Can filter and search profiles
- ✅ Can suspend/activate profiles
- ✅ Audit log tracks all changes
- ✅ Frontend shows real data

### Budget System
- ✅ Budget overview shows real spending
- ✅ Transactions logged on broadcasts
- ✅ Budget enforcement prevents overspend
- ✅ ROI analysis shows real metrics
- ✅ Frontend shows real data

### Analytics System
- ✅ Historical data shows trends
- ✅ Charts display real data
- ✅ Regional breakdown accurate
- ✅ Category breakdown accurate
- ✅ Export works

---

## Deployment Strategy

1. **Develop locally** - Test with local Supabase
2. **Test on staging** - Verify with production data copy
3. **Deploy incrementally** - One API at a time
4. **Monitor closely** - Watch for errors
5. **Rollback ready** - Keep previous version

---

## Risk Mitigation

**Low Risk:**
- Database schemas already tested and deployed
- Only adding API layer
- No schema changes needed
- Can deploy incrementally

**Potential Issues:**
- RLS policies may need adjustment
- Performance with large datasets
- Frontend integration bugs

**Mitigation:**
- Test RLS policies thoroughly
- Add indexes if queries slow
- Test frontend with mock data first

---

**Total Effort:** 22 hours over 5 days
**Risk Level:** Low (using existing schemas)
**Dependencies:** None (schemas already deployed)
**Blocking Issues:** None identified

**Ready to start after school test!** 🚀
