# Authority System - Phase 2 Implementation Plan

**Status**: Ready to implement  
**Timeline**: Week 2-3  
**Goal**: Add bulk operations and enhanced UI

---

## 🎯 Phase 2 Features

### 1. Authority Detail Cards ✨
**Priority**: HIGH  
**Effort**: 2 hours

**What**: Click authority row to see detailed card view

**UI Design**:
```
┌─────────────────────────────────────────────────────────┐
│ 🏫 School Principal                          [× Close]  │
│ +27727002502                                            │
├─────────────────────────────────────────────────────────┤
│ 📍 Institution: Duck Ponds High School                  │
│ 🌍 Region: KZN                                          │
│ 📊 Authority Level: 3 (Verified Community Leader)       │
│ 👥 Max Recipients: 500 people                           │
│ 🛡️ Content Safety: 70% (Standard)                       │
│ ⏰ Valid: Jan 18, 2026 - Jan 18, 2027 (340 days left)  │
│ ✅ Status: Active                                       │
│                                                          │
│ 📈 Usage Stats:                                         │
│ • Messages sent: 23                                     │
│ • Last broadcast: 2 days ago                            │
│ • Avg recipients: 287                                   │
├─────────────────────────────────────────────────────────┤
│ [✏️ Edit] [⏸️ Suspend] [📅 Extend] [🗑️ Delete]         │
└─────────────────────────────────────────────────────────┘
```

**Implementation**:
- Add modal/slide-out panel in `admin-dashboard.html`
- Add `viewAuthorityDetails(id)` function in `admin-sections.js`
- Fetch usage stats from database
- Add quick action buttons

---

### 2. CSV Bulk Import 📤
**Priority**: HIGH  
**Effort**: 4 hours

**What**: Upload CSV to assign multiple authorities at once

**Flow**:
1. Click "📤 Import CSV"
2. Download template: `authority_template.csv`
3. Fill spreadsheet
4. Upload file
5. Preview assignments (show validation errors)
6. Click "Import All"

**CSV Template**:
```csv
phone,preset_key,scope_identifier,region
+27727001111,school_principal,School A,KZN
+27727002222,school_principal,School B,KZN
+27727003333,community_leader,Ward 10,WC
+27727004444,ngo_coordinator,Red Cross KZN,KZN
```

**Backend Endpoint**:
```typescript
POST /admin/authority/bulk-import
Body: FormData with CSV file

Response:
{
  success: 15,
  failed: 2,
  errors: [
    { row: 3, error: "Invalid phone number" },
    { row: 7, error: "Preset not found" }
  ]
}
```

**Implementation**:
- Add file upload UI in authority section
- Add CSV parser (use Papa Parse or native)
- Add validation before import
- Add preview table
- Add bulk insert endpoint in `admin-api/index.ts`

---

### 3. Bulk Actions (Select Multiple) ☑️
**Priority**: MEDIUM  
**Effort**: 3 hours

**What**: Select multiple authorities and perform actions

**UI**:
```
┌─────────────────────────────────────────────────────────┐
│ ☑️ Select All  [⏸️ Suspend] [📅 Extend] [🗑️ Delete]    │
├─────────────────────────────────────────────────────────┤
│ ☑️ +27727002502 │ 🏫 School Principal │ Duck Ponds HS  │
│ ☑️ +2772007250  │ 👥 Community Leader │ Ward 22        │
│ ☐ +27721234567 │ 📅 Event Organizer  │ Cape Town      │
└─────────────────────────────────────────────────────────┘

Selected: 2 authorities
```

**Actions**:
- **Suspend**: Set status to 'suspended'
- **Extend**: Add 90/180/365 days to valid_until
- **Delete**: Remove authorities (with confirmation)

**Backend Endpoints**:
```typescript
POST /admin/authority/bulk-suspend
Body: { ids: ["uuid1", "uuid2"] }

POST /admin/authority/bulk-extend
Body: { ids: ["uuid1", "uuid2"], days: 90 }

POST /admin/authority/bulk-delete
Body: { ids: ["uuid1", "uuid2"] }
```

**Implementation**:
- Add checkboxes to authority list
- Add bulk action toolbar
- Add selection state management
- Add bulk operation endpoints

---

### 4. Search & Filter Enhancements 🔍
**Priority**: MEDIUM  
**Effort**: 2 hours

**What**: Better search and filtering options

**Features**:
- Search by phone, name, or institution
- Filter by status (Active, Suspended, Expired, Expiring Soon)
- Filter by role preset
- Filter by region
- Sort by expiry date, creation date, authority level

**UI**:
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 [Search phone, name, institution...]                 │
│                                                          │
│ Status: [All ▼] Role: [All ▼] Region: [All ▼]          │
│ Sort by: [Expiry Date ▼]                                │
└─────────────────────────────────────────────────────────┘
```

**Implementation**:
- Enhance existing `/admin/authority/search` endpoint
- Add filter dropdowns
- Add sort options
- Update `loadAuthoritySection()` to use filters

---

### 5. Expiry Warnings ⏰
**Priority**: LOW  
**Effort**: 2 hours

**What**: Visual indicators for expiring authorities

**UI Badges**:
- 🔴 **Expired** (valid_until < now)
- 🟡 **Expiring Soon** (valid_until < 7 days)
- 🟢 **Active** (valid_until > 7 days)

**Implementation**:
- Add badge logic in authority list rendering
- Add filter for "Expiring Soon"
- Add dashboard widget showing count of expiring authorities

---

## 📋 Implementation Checklist

### Backend Tasks
- [ ] Add `POST /admin/authority/bulk-import` endpoint
- [ ] Add `POST /admin/authority/bulk-suspend` endpoint
- [ ] Add `POST /admin/authority/bulk-extend` endpoint
- [ ] Add `POST /admin/authority/bulk-delete` endpoint
- [ ] Add usage stats query (messages sent, last broadcast)
- [ ] Enhance search endpoint with role/region filters

### Frontend Tasks
- [ ] Add authority detail modal/card
- [ ] Add CSV upload UI
- [ ] Add CSV parser and validator
- [ ] Add preview table for bulk import
- [ ] Add checkboxes to authority list
- [ ] Add bulk action toolbar
- [ ] Add "Select All" functionality
- [ ] Add filter dropdowns (status, role, region)
- [ ] Add sort dropdown
- [ ] Add expiry badges (expired, expiring soon, active)
- [ ] Add usage stats display in detail card

### Testing Tasks
- [ ] Test CSV import with valid data
- [ ] Test CSV import with invalid data (error handling)
- [ ] Test bulk suspend (multiple authorities)
- [ ] Test bulk extend (add days to expiry)
- [ ] Test bulk delete (with confirmation)
- [ ] Test search by phone/name/institution
- [ ] Test filters (status, role, region)
- [ ] Test sort options
- [ ] Test detail card display
- [ ] Test expiry badge logic

---

## 🎨 UI Components Needed

### 1. Authority Detail Modal
```html
<div id="authority-detail-modal" class="modal">
  <div class="modal-content large">
    <div class="modal-header">
      <h3 id="authority-detail-title"></h3>
      <button class="close-btn">×</button>
    </div>
    <div id="authority-detail-body"></div>
    <div class="modal-actions">
      <button class="btn" onclick="editAuthority()">Edit</button>
      <button class="btn warning" onclick="suspendAuthority()">Suspend</button>
      <button class="btn" onclick="extendAuthority()">Extend</button>
      <button class="btn danger" onclick="deleteAuthority()">Delete</button>
    </div>
  </div>
</div>
```

### 2. CSV Import Modal
```html
<div id="csv-import-modal" class="modal">
  <div class="modal-content">
    <h3>Import Authorities from CSV</h3>
    <div class="import-steps">
      <div class="step">
        <h4>1. Download Template</h4>
        <button class="btn" onclick="downloadTemplate()">
          📥 Download CSV Template
        </button>
      </div>
      <div class="step">
        <h4>2. Upload Filled CSV</h4>
        <input type="file" id="csv-file" accept=".csv">
      </div>
      <div class="step">
        <h4>3. Preview & Import</h4>
        <div id="csv-preview"></div>
        <button class="btn" onclick="importCSV()">Import All</button>
      </div>
    </div>
  </div>
</div>
```

### 3. Bulk Action Toolbar
```html
<div id="bulk-actions-toolbar" style="display:none;">
  <span id="selected-count">0 selected</span>
  <button class="btn-small" onclick="bulkSuspend()">⏸️ Suspend</button>
  <button class="btn-small" onclick="bulkExtend()">📅 Extend</button>
  <button class="btn-small danger" onclick="bulkDelete()">🗑️ Delete</button>
  <button class="btn-small" onclick="clearSelection()">Clear</button>
</div>
```

---

## 📊 Expected Impact

| Metric | Phase 1 | Phase 2 | Improvement |
|--------|---------|---------|-------------|
| Authorities assigned/week | 20 | 50+ | 2.5x increase |
| Bulk import time | N/A | 2 min for 50 | Massive time save |
| Management efficiency | Good | Excellent | Bulk ops save hours |
| User satisfaction | High | Very High | Power user features |

---

## 🚀 Deployment Plan

### Week 2
- Day 1-2: Authority detail cards + usage stats
- Day 3-4: CSV bulk import
- Day 5: Testing & bug fixes

### Week 3
- Day 1-2: Bulk actions (suspend/extend/delete)
- Day 3: Search & filter enhancements
- Day 4: Expiry warnings
- Day 5: Testing & deployment

---

## 📝 Notes

- CSV import should validate phone numbers (E.164 format)
- Bulk operations should have confirmation dialogs
- Detail card should show real usage stats from database
- Consider adding "Duplicate Authority" quick action
- Consider adding "Export to CSV" for backup

---

**Ready to start Phase 2?** Let me know which feature to implement first!
