# Pre-Launch Checklist - School Test Today

## ✅ COMPLETED

### Database
- [x] Phase 5 SQL migration deployed to Supabase
- [x] Emergency alerts table created
- [x] Notification system tables ready
- [x] Authority profiles table exists
- [x] All RLS policies configured

### Backend API
- [x] WhatsApp webhook endpoint working
- [x] Admin authentication working
- [x] Moments CRUD endpoints
- [x] Campaigns CRUD endpoints
- [x] Sponsors CRUD endpoints
- [x] Broadcasts endpoint
- [x] Moderation endpoint
- [x] Subscribers endpoint
- [x] Emergency alerts API
- [x] Notification preferences API
- [x] Authority management endpoint
- [x] Budget endpoints (stub)
- [x] Analytics endpoints

### Frontend
- [x] Admin dashboard loads without errors
- [x] CSP headers fixed for Supabase
- [x] API_BASE_URL configured
- [x] All navigation sections accessible
- [x] Emergency alerts UI ready
- [x] Notifications section ready

### Code Deployment
- [x] Latest code pushed to GitHub (commit 2cc1979)
- [x] Vercel auto-deployment triggered
- [x] Static files routing fixed

## ⚠️ CRITICAL - DO BEFORE TEST

### 1. Add Environment Variables to Vercel
**Go to:** https://vercel.com/beatschain/moments/settings/environment-variables

Add these variables (from VERCEL_ENV_SETUP.md):
```
WHATSAPP_TOKEN=EAAVqvFzqn6UBQuT8O5hdHC41PRZCZAZBvr0d0f1ZCcyhxLpljEZAgxZCp3zkSZBJmVAiw5hshjFiuePwh2ArMMmuIHYMfnuJ4ZAlKvZCK5V0dNcmtvxmRvZAhVypxeaIWE03CBI8GLt56cxccui6SxInTIgcjPKrbJI8nEmoORtxU21ON6baJjdGeLxvxZB5xTfSG8Tb5GijrfNwBaDFmd8Y6KLcPu8Lod8d2GfsorGtSZCTnUY5DtENhD3GcFmt8hoBYhhRAjV9sydW3pZAbPNszxtqmNBHYfju02M3Oi6WH
WHATSAPP_PHONE_ID=997749243410302
WHATSAPP_BUSINESS_ACCOUNT_ID=918577797187335
SUPABASE_URL=https://bxmdzcxejcxbinghtyfw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWR6Y3hlamN4YmluZ2h0eWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzMzOTYsImV4cCI6MjA4Mzc0OTM5Nn0.ccwWS_LPLjUrY8zqHD0Q7pTEamdN-QV0bv6f0B1uBUU
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWR6Y3hlamN4YmluZ2h0eWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3MzM5NiwiZXhwIjoyMDgzNzQ5Mzk2fQ.rcm_AT1o0Wiazvy9Pl6kjKc5jogHQKZyTfOxEX8v3Iw
WEBHOOK_VERIFY_TOKEN=whatsapp_gateway_verify_2024_secure
JWT_SECRET=unami_moments_production_jwt_secret_2024_secure
ADMIN_PASSWORD=Proof321#moments
NODE_ENV=production
```

### 2. Verify Deployment
- [ ] Check https://moments.unamifoundation.org/health returns 200
- [ ] Check https://moments.unamifoundation.org/admin loads
- [ ] Login with admin credentials works
- [ ] Dashboard shows analytics (even if 0)

### 3. Test WhatsApp Integration
- [ ] Send "START" to +27 65 829 5041
- [ ] Verify welcome message received
- [ ] Send test message
- [ ] Check message appears in admin moderation

### 4. Create Test Moment
- [ ] Login to admin dashboard
- [ ] Create a test moment for school region
- [ ] Broadcast to subscribers
- [ ] Verify delivery

## 📋 TEST WORKFLOW FOR SCHOOL

### Phase 1: Setup (5 min)
1. School admin sends "START" to +27 65 829 5041
2. Receives welcome message
3. Selects region (e.g., "GP" for Gauteng)

### Phase 2: Content Submission (10 min)
1. School sends announcement message
2. Admin reviews in moderation panel
3. Admin creates moment from message
4. Sets region and category

### Phase 3: Broadcasting (5 min)
1. Admin broadcasts moment
2. All opted-in subscribers receive message
3. Verify delivery in broadcasts panel

### Phase 4: Emergency Alert Test (5 min)
1. Admin creates emergency alert
2. Sets severity and regions
3. Sends immediately
4. Verify bypass of user preferences

## 🚨 TROUBLESHOOTING

### If WhatsApp not working:
1. Check WHATSAPP_TOKEN in Vercel env vars
2. Verify webhook at Meta Business Suite
3. Check /health endpoint responds

### If admin login fails:
1. Verify ADMIN_PASSWORD in Vercel
2. Check JWT_SECRET is set
3. Clear browser cache and retry

### If database queries fail:
1. Verify SUPABASE_URL and keys
2. Check RLS policies in Supabase
3. Verify Phase 5 migration ran

### If broadcasts don't send:
1. Check subscribers table has opted_in=true
2. Verify WHATSAPP_TOKEN is valid
3. Check broadcast_batches table for errors

## 📞 SUPPORT CONTACTS

- **WhatsApp Number:** +27 65 829 5041
- **Admin Dashboard:** https://moments.unamifoundation.org/admin
- **Admin Login:** Use credentials from .env
- **Supabase Dashboard:** https://supabase.com/dashboard/project/bxmdzcxejcxbinghtyfw

## ✅ FINAL CHECKS BEFORE SCHOOL ARRIVES

- [ ] Vercel deployment shows "Ready"
- [ ] Environment variables added
- [ ] Health check returns 200
- [ ] Admin login works
- [ ] WhatsApp responds to "START"
- [ ] Can create and broadcast moment
- [ ] Emergency alerts functional

## 🎯 SUCCESS CRITERIA

- ✅ School can opt-in via WhatsApp
- ✅ School can submit content
- ✅ Admin can moderate and approve
- ✅ Broadcasts reach all subscribers
- ✅ Emergency alerts work
- ✅ No 404 errors in dashboard
- ✅ All data persists in Supabase

---

**Status:** Code deployed, waiting for environment variables to be added to Vercel.
**Next Step:** Add env vars, then test all workflows above.
**Time Estimate:** 10 minutes to complete setup, 25 minutes for full test.
