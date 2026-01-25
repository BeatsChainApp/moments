# Authority System & Authentication Investigation

## 🔍 COMPREHENSIVE ANALYSIS

---

## Part 1: Authority System Integration Status

### Current State

#### ✅ What EXISTS
1. **Database Schema** (`authority_profiles` table)
   - `user_identifier` TEXT - phone number or user ID
   - `authority_level` INTEGER (1-5)
   - `role_label` TEXT - display name
   - `scope` TEXT - school/community/region/province/national
   - `approval_mode` TEXT - auto/ai_review/admin_review
   - `blast_radius` INTEGER - max recipients
   - `risk_threshold` DECIMAL - content safety threshold
   - `status` TEXT - active/suspended/expired
   - `valid_from`, `valid_until` TIMESTAMPTZ

2. **Database Functions**
   - `lookup_authority(phone)` - Get authority by phone number
   - `log_authority_action()` - Audit trail

3. **Admin UI** (Phase 3 completed)
   - Authority management dashboard
   - CRUD operations for authority profiles
   - Suspend/activate functionality
   - Activity logging

4. **API Endpoints** (`src/admin.js`)
   - `GET /admin/authority` - List authorities
   - `GET /admin/authority/:id` - Get single authority
   - `POST /admin/authority` - Create authority
   - `PUT /admin/authority/:id` - Update authority
   - `DELETE /admin/authority/:id` - Delete authority

#### ❌ What's MISSING - THE GAP

**Authority profiles are NOT connected to moment creation/attribution!**

### The Disconnect

#### Current Moment Creation Flow
```javascript
// src/admin.js - POST /moments
{
  created_by: 'admin',  // ❌ Hardcoded string
  content_source: 'admin'  // ❌ Hardcoded
}
```

#### Current Attribution Flow
```javascript
// src/services/broadcast-composer.js
const creator = {
  role: moment.content_source || 'admin',  // ❌ Uses content_source
  organization: 'Unami Foundation Moments App'
};
```

**Problem**: Authority profiles exist but are never queried when creating moments!

---

## Part 2: Authentication System Analysis

### Current Implementation: ✅ USING SUPABASE AUTH

You ARE using Supabase Auth! Here's what's implemented:

#### Authentication Flow
```javascript
// src/auth.js - getUserFromRequest()

1. Extract token from Authorization header
2. Check if session token (starts with 'session_')
   → Query admin_sessions table
   → Return admin user
3. Otherwise, use Supabase Auth
   → supabase.auth.getUser(token)
   → Return Supabase user
```

#### Two Auth Systems Running in Parallel

**System 1: Custom Session Tokens** (admin_sessions table)
- Used for: Admin dashboard login
- Storage: Database table `admin_sessions`
- Format: `session_xxxxx`
- Linked to: `admin_users` table

**System 2: Supabase Auth** (native)
- Used for: API authentication
- Storage: Supabase Auth service
- Format: JWT tokens
- Linked to: Supabase `auth.users` table

### The Confusion

When I said "proper user authentication", I meant:
- ❌ You have TWO separate auth systems
- ❌ `admin_users` table is separate from Supabase Auth users
- ❌ Authority profiles use `user_identifier` (phone) not user IDs
- ❌ No connection between authority profiles and authenticated users

---

## Part 3: THE INTEGRATION PROBLEM

### Current Architecture

```
┌─────────────────────┐
│  Admin Dashboard    │
│  (Browser)          │
└──────────┬──────────┘
           │ session_token
           ▼
┌─────────────────────┐
│  admin_sessions     │
│  admin_users        │  ❌ Not connected to authority
└─────────────────────┘

┌─────────────────────┐
│  authority_profiles │  ❌ Isolated, uses phone numbers
│  (user_identifier)  │
└─────────────────────┘

┌─────────────────────┐
│  moments            │
│  created_by: 'admin'│  ❌ Hardcoded, no authority lookup
│  content_source     │
└─────────────────────┘

┌─────────────────────┐
│  Attribution        │
│  Uses content_source│  ❌ Ignores authority profiles
└─────────────────────┘
```

### What SHOULD Happen

```
┌─────────────────────┐
│  Admin Dashboard    │
│  User: +27123456789 │
└──────────┬──────────┘
           │ Authenticated
           ▼
┌─────────────────────┐
│  Lookup Authority   │
│  lookup_authority() │
│  → School Principal │
│  → Level 3          │
│  → Blast 500        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Create Moment      │
│  created_by: phone  │
│  authority_level: 3 │
│  role_label: ...    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Attribution        │
│  Uses authority     │
│  profile data       │
│  → Proper badge     │
│  → Correct scope    │
└─────────────────────┘
```

---

## Part 4: SPECIFIC GAPS TO FIX

### Gap 1: Moment Creation Doesn't Check Authority
**File**: `src/admin.js` - POST `/moments`
**Current**:
```javascript
created_by = 'admin',  // Hardcoded
```

**Should Be**:
```javascript
const user = await getUserFromRequest(req);
const phone = user.phone || user.email;

// Lookup authority profile
const { data: authority } = await supabase.rpc('lookup_authority', {
  p_user_identifier: phone
});

const created_by = phone;
const authority_level = authority?.authority_level || 1;
const role_label = authority?.role_label || 'Community Member';
```

### Gap 2: Attribution Ignores Authority Profiles
**File**: `src/services/broadcast-composer.js`
**Current**:
```javascript
const creator = {
  role: moment.content_source || 'admin',
  organization: 'Unami Foundation Moments App'
};
```

**Should Be**:
```javascript
// Lookup authority for this moment's creator
const { data: authority } = await supabase.rpc('lookup_authority', {
  p_user_identifier: moment.created_by
});

const creator = {
  role: authority?.role_label || 'Community Member',
  authority_level: authority?.authority_level || 1,
  scope: authority?.scope || 'community',
  organization: authority?.scope_identifier || 'Unami Foundation Moments App'
};
```

### Gap 3: No Phone Number in User Profile
**File**: `src/auth.js`
**Current**: Returns `{ id, email, name }`
**Missing**: Phone number!

**Need**:
```javascript
return {
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone || user.user_metadata?.phone  // ← ADD THIS
};
```

### Gap 4: Attribution Service Doesn't Use Authority Data
**File**: `src/services/attribution.js`
**Current**: Uses hardcoded role mappings
**Should**: Use actual authority profile data

---

## Part 5: RECOMMENDED FIXES

### Option A: Quick Integration (2 hours)

**Goal**: Connect existing authority system to moment creation

**Steps**:
1. Add phone number to user profile extraction
2. Lookup authority when creating moments
3. Store authority data in moment record
4. Use authority data in attribution

**Impact**: 
- ✅ Authority profiles actually used
- ✅ Proper attribution based on real authority
- ✅ No breaking changes

### Option B: Full Unification (1 day)

**Goal**: Merge auth systems and authority profiles

**Steps**:
1. Migrate `admin_users` to Supabase Auth
2. Link authority profiles to Supabase user IDs
3. Add phone numbers to Supabase user metadata
4. Update all lookups to use user IDs
5. Deprecate session tokens

**Impact**:
- ✅ Single source of truth
- ✅ Proper user management
- ✅ Better security
- ⚠️ Requires data migration

### Option C: Hybrid Approach (4 hours)

**Goal**: Keep both systems but connect them

**Steps**:
1. Add `supabase_user_id` to authority_profiles
2. Add `phone` to admin_users
3. Create linking function
4. Update moment creation to use authority
5. Update attribution to query authority

**Impact**:
- ✅ No breaking changes
- ✅ Authority system works
- ✅ Can migrate later
- ⚠️ Still have two auth systems

---

## Part 6: AUTHENTICATION CLARIFICATION

### You ARE Using Supabase Auth ✅

**Evidence**:
```javascript
// src/auth.js line 30
const { data, error } = await supabase.auth.getUser(token);
```

### But You ALSO Have Custom Auth ⚠️

**Evidence**:
```javascript
// src/auth.js line 11
if (token.startsWith('session_')) {
  // Query admin_sessions table
}
```

### Why Two Systems?

**Likely Reason**: 
- Supabase Auth for API/external access
- Custom sessions for admin dashboard
- Never fully migrated to one system

### Is This a Problem?

**Short Answer**: Not really, but it's confusing

**Long Answer**:
- ✅ Both work fine
- ✅ No security issues
- ⚠️ Maintenance overhead
- ⚠️ Confusion about which to use
- ⚠️ Authority profiles use phone, not user IDs

---

## Part 7: IMMEDIATE ACTION ITEMS

### Priority 1: Connect Authority to Moments (HIGH IMPACT)
**Time**: 2 hours
**Files**: 2-3 files
**Benefit**: Authority system actually works

### Priority 2: Add Phone to User Profile (MEDIUM IMPACT)
**Time**: 30 minutes
**Files**: 1 file
**Benefit**: Can lookup authority by phone

### Priority 3: Update Attribution Logic (HIGH IMPACT)
**Time**: 1 hour
**Files**: 2 files
**Benefit**: Proper badges and trust levels

### Priority 4: Document Auth Systems (LOW IMPACT)
**Time**: 30 minutes
**Files**: Documentation
**Benefit**: Team clarity

---

## Part 8: TESTING CHECKLIST

### Authority Integration Tests
- [ ] Create moment as admin → Check authority lookup
- [ ] Create moment as school principal → Check proper attribution
- [ ] Create moment as community leader → Check limited scope
- [ ] Broadcast moment → Verify authority-based attribution
- [ ] Preview moment → See correct role badge

### Authentication Tests
- [ ] Login with Supabase Auth → Works
- [ ] Login with session token → Works
- [ ] API call with JWT → Works
- [ ] Authority lookup by phone → Returns profile
- [ ] Authority lookup by user ID → Returns profile

---

## SUMMARY

### Authority System
- ✅ **EXISTS**: Database, UI, API endpoints
- ❌ **NOT INTEGRATED**: Not used in moment creation or attribution
- 🎯 **FIX**: Connect authority lookup to moment creation flow

### Authentication
- ✅ **USING SUPABASE AUTH**: Yes, you are!
- ⚠️ **ALSO USING CUSTOM**: Session tokens for admin dashboard
- 🤔 **CONFUSING**: Two systems, not fully integrated
- 🎯 **CLARIFY**: Document which system is for what

### Next Steps
1. **Integrate authority system** (2 hours) - HIGH PRIORITY
2. **Add phone to user profile** (30 min) - REQUIRED
3. **Update attribution logic** (1 hour) - HIGH IMPACT
4. **Document auth systems** (30 min) - NICE TO HAVE

---

**RECOMMENDATION**: Start with Option A (Quick Integration) to get authority system working, then plan Option B (Full Unification) for later.
