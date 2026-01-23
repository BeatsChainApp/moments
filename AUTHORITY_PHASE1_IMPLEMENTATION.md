# Authority System - Phase 1 Implementation

**Status**: Ready to implement  
**Goal**: Simplify authority assignment from 12 fields to 5 fields

---

## ✅ Implementation Tasks

### Task 1: Add Authority Role Presets Endpoint
**File**: `supabase/functions/admin-api/index.ts`  
**Location**: After line 2310 (before authority GET endpoint)

```typescript
// Get authority role presets
if (path.includes('/authority/presets') && method === 'GET') {
  const presets = {
    "school_principal": {
      name: "School Principal",
      icon: "🏫",
      authority_level: 3,
      scope: "community",
      approval_mode: "auto",
      blast_radius: 500,
      risk_threshold: 0.70,
      validity_days: 365,
      description: "For school principals and education leaders"
    },
    "community_leader": {
      name: "Community Leader",
      icon: "👥",
      authority_level: 3,
      scope: "community",
      approval_mode: "auto",
      blast_radius: 300,
      risk_threshold: 0.70,
      validity_days: 180,
      description: "For ward councillors and community organizers"
    },
    "government_official": {
      name: "Government Official",
      icon: "🏛️",
      authority_level: 5,
      scope: "national",
      approval_mode: "auto",
      blast_radius: 5000,
      risk_threshold: 0.90,
      validity_days: 730,
      description: "For government departments and agencies"
    },
    "ngo_coordinator": {
      name: "NGO Coordinator",
      icon: "🤝",
      authority_level: 4,
      scope: "regional",
      approval_mode: "ai_review",
      blast_radius: 2000,
      risk_threshold: 0.80,
      validity_days: 365,
      description: "For NGO staff and regional coordinators"
    },
    "event_organizer": {
      name: "Event Organizer",
      icon: "📅",
      authority_level: 2,
      scope: "community",
      approval_mode: "ai_review",
      blast_radius: 200,
      risk_threshold: 0.60,
      validity_days: 90,
      description: "For local event organizers and promoters"
    }
  }

  return new Response(JSON.stringify({ presets }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
```

### Task 2: Enhance Authority POST Endpoint with Preset Support
**File**: `supabase/functions/admin-api/index.ts`  
**Location**: Line 2387 (authority POST endpoint)

**Replace existing POST handler with**:
```typescript
if (path.includes('/authority') && method === 'POST' && body) {
  // If preset_key provided, apply preset defaults
  if (body.preset_key) {
    const presets = {
      school_principal: { authority_level: 3, scope: "community", approval_mode: "auto", blast_radius: 500, risk_threshold: 0.70, validity_days: 365 },
      community_leader: { authority_level: 3, scope: "community", approval_mode: "auto", blast_radius: 300, risk_threshold: 0.70, validity_days: 180 },
      government_official: { authority_level: 5, scope: "national", approval_mode: "auto", blast_radius: 5000, risk_threshold: 0.90, validity_days: 730 },
      ngo_coordinator: { authority_level: 4, scope: "regional", approval_mode: "ai_review", blast_radius: 2000, risk_threshold: 0.80, validity_days: 365 },
      event_organizer: { authority_level: 2, scope: "community", approval_mode: "ai_review", blast_radius: 200, risk_threshold: 0.60, validity_days: 90 }
    }
    
    const preset = presets[body.preset_key]
    if (preset) {
      // Apply preset defaults, allow overrides
      body.authority_level = body.authority_level || preset.authority_level
      body.scope = body.scope || preset.scope
      body.approval_mode = body.approval_mode || preset.approval_mode
      body.blast_radius = body.blast_radius || preset.blast_radius
      body.risk_threshold = body.risk_threshold || preset.risk_threshold
      
      // Calculate expiry date
      const validFrom = new Date()
      const validUntil = new Date(validFrom.getTime() + preset.validity_days * 24 * 60 * 60 * 1000)
      body.valid_from = body.valid_from || validFrom.toISOString()
      body.valid_until = body.valid_until || validUntil.toISOString()
    }
  }
  
  // Auto-set status to active if not provided
  body.status = body.status || 'active'
  
  const { data, error } = await supabase
    .from('authority_profiles')
    .insert(body)
    .select()
    .single()

  if (error) throw error
  return new Response(JSON.stringify({ authority_profile: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
```

### Task 3: Add Search/Filter Endpoint
**File**: `supabase/functions/admin-api/index.ts`  
**Location**: After presets endpoint

```typescript
// Search authority profiles
if (path.includes('/authority/search') && method === 'GET') {
  const query = url.searchParams.get('q') || ''
  const status = url.searchParams.get('status') || ''
  
  let dbQuery = supabase
    .from('authority_profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (query) {
    dbQuery = dbQuery.or(`user_identifier.ilike.%${query}%,role_label.ilike.%${query}%,scope_identifier.ilike.%${query}%`)
  }
  
  if (status) {
    dbQuery = dbQuery.eq('status', status)
  }
  
  const { data, error } = await dbQuery
  
  return new Response(JSON.stringify({ 
    authority_profiles: data || [],
    query,
    status
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
```

---

## 🎨 Frontend Changes Needed

### File: `public/admin-dashboard.html`

**Add to Authority section** (search for "Authority" tab):

```html
<!-- Authority Presets Modal -->
<div id="authorityPresetsModal" class="modal">
  <div class="modal-content">
    <h3>Assign Authority</h3>
    
    <label>Phone Number *</label>
    <input type="tel" id="authorityPhone" placeholder="+27727002502" required>
    
    <label>Select Role *</label>
    <div id="rolePresets" class="role-presets">
      <!-- Populated by JavaScript -->
    </div>
    
    <label>Institution/Organization *</label>
    <input type="text" id="authorityScopeId" placeholder="Duck Ponds High School" required>
    
    <label>Region</label>
    <select id="authorityRegion">
      <option value="KZN">KZN</option>
      <option value="WC">WC</option>
      <option value="GP">GP</option>
      <option value="EC">EC</option>
      <option value="FS">FS</option>
      <option value="LP">LP</option>
      <option value="MP">MP</option>
      <option value="NC">NC</option>
      <option value="NW">NW</option>
    </select>
    
    <div id="presetInfo" class="preset-info" style="display:none;">
      <p><strong>This role will allow:</strong></p>
      <ul id="presetDetails"></ul>
    </div>
    
    <button onclick="assignAuthority()">Assign Authority</button>
    <button onclick="closeModal('authorityPresetsModal')">Cancel</button>
  </div>
</div>

<style>
.role-presets {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin: 10px 0;
}

.role-preset {
  border: 2px solid #ddd;
  padding: 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.role-preset:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.role-preset.selected {
  border-color: #007bff;
  background: #e7f3ff;
}

.role-preset h4 {
  margin: 0 0 5px 0;
  font-size: 18px;
}

.role-preset p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.preset-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin: 15px 0;
}

.preset-info ul {
  margin: 10px 0 0 20px;
}
</style>

<script>
let selectedPreset = null;

async function loadAuthorityPresets() {
  const response = await fetch('/admin/authority/presets', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  const { presets } = await response.json();
  
  const container = document.getElementById('rolePresets');
  container.innerHTML = Object.entries(presets).map(([key, preset]) => `
    <div class="role-preset" onclick="selectPreset('${key}', ${JSON.stringify(preset).replace(/"/g, '&quot;')})">
      <h4>${preset.icon} ${preset.name}</h4>
      <p>${preset.description}</p>
    </div>
  `).join('');
}

function selectPreset(key, preset) {
  selectedPreset = { key, ...preset };
  
  // Update UI
  document.querySelectorAll('.role-preset').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  
  // Show preset info
  document.getElementById('presetInfo').style.display = 'block';
  document.getElementById('presetDetails').innerHTML = `
    <li>Broadcasting to up to ${preset.blast_radius.toLocaleString()} people</li>
    <li>${preset.approval_mode === 'auto' ? 'Auto-approved messages (no review needed)' : 'AI-reviewed messages'}</li>
    <li>${preset.icon} ${preset.name} badge</li>
    <li>${preset.risk_threshold * 100}% content safety threshold</li>
    <li>Valid for ${preset.validity_days} days</li>
  `;
}

async function assignAuthority() {
  if (!selectedPreset) {
    alert('Please select a role');
    return;
  }
  
  const phone = document.getElementById('authorityPhone').value;
  const scopeId = document.getElementById('authorityScopeId').value;
  const region = document.getElementById('authorityRegion').value;
  
  if (!phone || !scopeId) {
    alert('Please fill all required fields');
    return;
  }
  
  const response = await fetch('/admin/authority', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      preset_key: selectedPreset.key,
      user_identifier: phone,
      role_label: selectedPreset.name,
      scope_identifier: scopeId,
      metadata: { region }
    })
  });
  
  if (response.ok) {
    alert('Authority assigned successfully!');
    closeModal('authorityPresetsModal');
    loadAuthorities(); // Refresh list
  } else {
    const error = await response.json();
    alert('Error: ' + error.message);
  }
}
</script>
```

---

## 📝 Testing Checklist

- [ ] GET `/admin/authority/presets` returns 5 role presets
- [ ] POST `/admin/authority` with `preset_key` applies defaults
- [ ] POST `/admin/authority` calculates expiry date correctly
- [ ] GET `/admin/authority/search?q=+27727` filters by phone
- [ ] GET `/admin/authority/search?status=active` filters by status
- [ ] Frontend modal displays all 5 presets
- [ ] Selecting preset shows role details
- [ ] Assigning authority creates record with preset values
- [ ] Assignment time reduced from 5 min to <30 sec

---

## 🚀 Deployment Steps

1. Deploy updated admin-api edge function
2. Update admin dashboard HTML
3. Test preset endpoint
4. Test assignment flow
5. Verify database records

---

**Next**: After Phase 1 complete, proceed to Phase 2 (CSV import, bulk actions)
