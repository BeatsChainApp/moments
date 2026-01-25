# Moments Governance Quick Reference

## 🎯 Core Rules

### 1. Attribution is System-Owned
- ✅ System generates attribution blocks
- ❌ Users cannot edit attribution text
- ✅ Attribution injected at broadcast time

### 2. Canonical URLs Only
- ✅ `https://moments.unamifoundation.org/moments/{slug}`
- ❌ `https://moments.unamifoundation.org/m/{uuid}`
- ❌ `https://moments.unamifoundation.org/moments/{uuid}`

### 3. Full Brand Name Always
- ✅ "Unami Foundation Moments App"
- ❌ "Unami Foundation"
- ❌ "Unami Moments"
- ❌ "Moments"

### 4. Progressive Enhancement
- ✅ Extend existing code
- ❌ Refactor core logic
- ✅ Handle missing data gracefully

---

## 📐 Message Structure

Every broadcast follows this exact structure:

```
[ATTRIBUTION BLOCK]

[USER CONTENT]

[FOOTER]
```

### Attribution Block Examples

**Admin/Official:**
```
📢 Administrator (Verified)
Scope: KZN
📍 Coverage: Education
🏛️ Affiliation: Unami Foundation Moments App
🟢 Trust Level: Verified • Full Authority
```

**Community Leader:**
```
📢 Community Leader (Verified)
Scope: GP
📍 Coverage: Safety
🏛️ Affiliation: Soweto Community Council
🟡 Trust Level: Verified • Limited Scope
```

**Sponsored:**
```
💼 SPONSORED CONTENT
Presented by: ABC Corporation
In partnership with: Community Leader (Verified)

Scope: WC
📍 Coverage: Opportunity
🏛️ Sponsor: ABC Corporation
🟢 Trust Level: Verified • Sponsored
```

**General User:**
```
(No attribution block - footer only)
```

### Footer Examples

**Standard:**
```
🌐 View details & respond:
https://moments.unamifoundation.org/moments/{slug}

💬 Replies are received by Unami Foundation Moments App
```

**Sponsored:**
```
🌐 View details & respond:
https://moments.unamifoundation.org/moments/{slug}

💼 Sponsored by ABC Corporation
Learn more: https://abccorp.co.za

💬 Replies are received by Unami Foundation Moments App
```

---

## 🔧 Developer Usage

### Composing a Moment Message

```javascript
import { composeMomentMessage } from './services/broadcast-composer.js';

// Compose complete message with attribution + content + footer
const message = await composeMomentMessage(momentId);

// Returns formatted string ready for WhatsApp broadcast
```

### Building Attribution Manually

```javascript
import { buildAttributionBlock, buildFooter } from './services/attribution.js';

const attribution = buildAttributionBlock(moment, userProfile, sponsor);
const footer = buildFooter(canonicalUrl, sponsor);

const fullMessage = attribution + moment.content + footer;
```

### Generating Slugs

```javascript
// Automatic (via database trigger on insert)
INSERT INTO moments (title, content, ...) VALUES (...);
// slug auto-generated

// Manual (via SQL function)
SELECT generate_moment_slug('My Moment Title', gen_random_uuid());
// Returns: 'my-moment-title-a3f2b1'

// JavaScript fallback
function generateSlug(title, id) {
  let slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
  return slug + '-' + id.substring(0, 6);
}
```

---

## 🎨 Role-to-Trust Mapping

| Role | Trust Level | Emoji | Blast Radius | Scope |
|------|-------------|-------|--------------|-------|
| admin | Verified • Full Authority | 🟢 | Unlimited | National |
| school | Verified • Institutional | 🟢 | 500 | School |
| principal | Verified • Institutional | 🟢 | 500 | School |
| community_leader | Verified • Limited Scope | 🟡 | 1000 | Community |
| partner | Verified • Partner | 🟢 | 1000 | Regional |
| ngo | Verified • Partner | 🟢 | 1000 | Regional |
| general | (No attribution) | - | 100 | Local |

---

## 📊 Database Schema

### New Columns

```sql
-- moments table
slug TEXT UNIQUE                    -- Canonical URL slug
attribution_data JSONB DEFAULT '{}'  -- Attribution metadata
```

### Attribution Metadata Structure

```json
{
  "role": "admin",
  "role_label": "Administrator",
  "trust_level": "Verified • Full Authority",
  "trust_emoji": "🟢",
  "affiliation": "Unami Foundation Moments App",
  "is_sponsored": false,
  "sponsor_name": null,
  "sponsor_website": null,
  "generated_at": "2026-01-24T10:30:00Z"
}
```

---

## 🔗 API Endpoints

### Compose Message (Preview)
```http
GET /admin/moments/:id/compose

Response:
{
  "success": true,
  "message": "[Full formatted message with attribution + content + footer]"
}
```

### Get Moment by Slug
```http
GET /admin/moments/by-slug/:slug

Response:
{
  "id": "uuid",
  "title": "...",
  "content": "...",
  "slug": "my-moment-slug-a3f2b1",
  "attribution_html": "<formatted attribution>",
  ...
}
```

---

## ✅ Validation Rules

### Before Broadcast
- [ ] Moment has slug (auto-generated if missing)
- [ ] Attribution block matches user role
- [ ] Canonical URL uses slug (not UUID)
- [ ] Footer includes full brand name
- [ ] Sponsor info included if `is_sponsored = true`

### URL Format
- [ ] Starts with `https://moments.unamifoundation.org/moments/`
- [ ] Followed by kebab-case slug
- [ ] Ends with 6-character hash (e.g., `-a3f2b1`)
- [ ] No UUIDs visible to users

### Brand Consistency
- [ ] All references use "Unami Foundation Moments App"
- [ ] No shortened versions ("Unami", "Moments", etc.)
- [ ] Consistent across WhatsApp, email, PWA

---

## 🚨 Common Mistakes

### ❌ Don't Do This
```javascript
// Exposing UUID in URL
const url = `https://moments.unamifoundation.org/m/${moment.id}`;

// Using shortened brand name
const footer = "Replies received by Unami Foundation";

// Allowing user to edit attribution
const attribution = req.body.attribution; // User input

// Hardcoding attribution text
const message = "📢 Official Update\n" + content;
```

### ✅ Do This Instead
```javascript
// Use slug for URL
const url = `https://moments.unamifoundation.org/moments/${moment.slug}`;

// Use full brand name
const footer = "Replies received by Unami Foundation Moments App";

// System-generated attribution
const attribution = buildAttributionBlock(moment, userProfile, sponsor);

// Compose via service
const message = await composeMomentMessage(momentId);
```

---

## 📚 Related Files

- **Governance Standards**: `README.md` (Moments Governance & Standards section)
- **Implementation Status**: `MOMENTS_STANDARDIZATION_STATUS.md`
- **Attribution Service**: `src/services/attribution.js`
- **Broadcast Composer**: `src/services/broadcast-composer.js`
- **Database Migration**: `supabase/migrations/20260124_add_moment_standardization.sql`

---

## 🆘 Support

For questions or issues:
1. Check governance section in README.md
2. Review implementation status document
3. Test with compose endpoint before broadcasting
4. Verify slug generation in database

**Remember**: System owns attribution. Users create content. We add trust signals.
