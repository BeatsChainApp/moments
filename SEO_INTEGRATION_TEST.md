# SEO INTEGRATION TEST CHECKLIST

## 🎯 INFRASTRUCTURE OVERVIEW

### Existing (Untouched)
- ✅ `/public/index.html` - Homepage (PWA)
- ✅ `/public/moments/index.html` - Moments list (PWA with filters)
- ✅ `/public/moments/detail.html` - OLD client-side page (REPLACED by SSR)
- ✅ WhatsApp webhook system
- ✅ Admin dashboard
- ✅ Broadcast system

### New (Added - Non-Breaking)
- ✅ `/api/moments/[slug].js` - Server-side rendered moment pages
- ✅ `/api/category/[category].js` - Category landing pages
- ✅ `/api/sitemap.xml.js` - Dynamic sitemap
- ✅ `/public/robots.txt` - Search engine permissions

## 🧪 MANUAL TESTS (After Deployment)

### Test 1: Moment Detail Page (SSR)
**URL:** https://moments.unamifoundation.org/moments/intern-opportunities-customer-services-department-87a04f

**Expected:**
- ✅ Page loads with full HTML (not blank)
- ✅ Title: "{Moment Title} - {Region} | Unami Foundation Moments"
- ✅ Meta description visible in source
- ✅ Canonical tag present
- ✅ Schema.org JSON-LD present
- ✅ Content visible without JavaScript
- ✅ WhatsApp CTA button works

**Test Command:**
```bash
curl -I https://moments.unamifoundation.org/moments/intern-opportunities-customer-services-department-87a04f
# Should return 200 OK

curl -s https://moments.unamifoundation.org/moments/intern-opportunities-customer-services-department-87a04f | grep -o "<title>.*</title>"
# Should show moment title

curl -s https://moments.unamifoundation.org/moments/intern-opportunities-customer-services-department-87a04f | grep "application/ld+json"
# Should show schema markup
```

### Test 2: robots.txt
**URL:** https://moments.unamifoundation.org/robots.txt

**Expected:**
```
User-agent: *
Allow: /
Allow: /moments/
Disallow: /admin
Disallow: /api/
Disallow: /webhook

Sitemap: https://moments.unamifoundation.org/sitemap.xml
```

**Test Command:**
```bash
curl https://moments.unamifoundation.org/robots.txt
```

### Test 3: Sitemap
**URL:** https://moments.unamifoundation.org/sitemap.xml

**Expected:**
- ✅ Valid XML
- ✅ Includes homepage
- ✅ Includes category pages
- ✅ Includes all broadcasted moments
- ✅ Each URL has `<loc>`, `<lastmod>`, `<priority>`

**Test Command:**
```bash
curl -s https://moments.unamifoundation.org/sitemap.xml | head -50
```

### Test 4: Category Pages
**URLs:**
- https://moments.unamifoundation.org/category/education
- https://moments.unamifoundation.org/category/opportunities
- https://moments.unamifoundation.org/category/safety

**Expected:**
- ✅ Page loads with moment list
- ✅ Title: "{Category} Moments - South Africa | Unami Foundation"
- ✅ Meta description present
- ✅ Canonical tag present
- ✅ Links to individual moments work

**Test Command:**
```bash
curl -I https://moments.unamifoundation.org/category/education
# Should return 200 OK
```

### Test 5: PWA Integration
**URL:** https://moments.unamifoundation.org/moments

**Expected:**
- ✅ Moments list loads (existing PWA)
- ✅ Clicking moment card navigates to `/moments/{slug}`
- ✅ Detail page loads with SSR
- ✅ Back button returns to list
- ✅ Filters still work

### Test 6: Homepage Links
**URL:** https://moments.unamifoundation.org/

**Expected:**
- ✅ "Browse Community Moments" button works
- ✅ Stats load from API
- ✅ WhatsApp links work

## 🔗 INTEGRATION FLOW

```
User Journey:
1. Google Search → Moment Detail Page (SSR)
2. Homepage → Moments List (PWA) → Moment Detail (SSR)
3. Category Page → Moment Detail (SSR)
4. Sitemap → Google discovers all pages
```

## 📊 SEO VERIFICATION

### Google Search Console (After 24-48 hours)
1. Add property: `https://moments.unamifoundation.org`
2. Submit sitemap: `https://moments.unamifoundation.org/sitemap.xml`
3. Request indexing for:
   - Homepage
   - 5 moment pages
   - 3 category pages

### Rich Results Test
**URL:** https://search.google.com/test/rich-results

Test any moment URL to verify Schema.org markup.

### PageSpeed Insights
**URL:** https://pagespeed.web.dev/

Test:
- Homepage
- Moment detail page
- Category page

**Target Scores:**
- Performance: >90
- Accessibility: >95
- Best Practices: >95
- SEO: 100

## 🚨 ROLLBACK PLAN

If anything breaks:

```bash
cd /workspaces/moments
git revert HEAD~2  # Revert last 2 commits
git push --force
```

This removes:
- SSR moment pages
- Category pages
- Sitemap
- robots.txt

System returns to previous state. WhatsApp flow unaffected.

## ✅ SUCCESS CRITERIA

- [ ] All moment detail pages load with full HTML
- [ ] robots.txt accessible
- [ ] sitemap.xml generates dynamically
- [ ] Category pages load with moment lists
- [ ] PWA moments list still works
- [ ] Links between pages work
- [ ] WhatsApp flow untouched
- [ ] Admin dashboard untouched
- [ ] Broadcast system untouched

## 📝 NOTES

**Non-Breaking Changes:**
- Old `/public/moments/detail.html` still exists but unused
- Vercel routing prioritizes `/api/moments/[slug].js`
- If SSR fails, can fallback to client-side rendering
- All existing APIs unchanged
- Database schema unchanged
- WhatsApp webhook unchanged

**Performance:**
- SSR pages cached for 1 hour
- Stale-while-revalidate for 24 hours
- Supabase queries optimized
- No impact on WhatsApp message processing

**SEO Timeline:**
- Week 1: Pages indexed
- Week 2-4: Rankings appear
- Month 2-3: Traffic increases
- Month 6: Google Ad Grants eligible
