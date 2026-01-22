# Vercel Environment Variables Setup

## Required Environment Variables

Add these to Vercel Dashboard → Project Settings → Environment Variables:

### WhatsApp Business API
```
WHATSAPP_TOKEN=EAAVqvFzqn6UBQuT8O5hdHC41PRZCZAZBvr0d0f1ZCcyhxLpljEZAgxZCp3zkSZBJmVAiw5hshjFiuePwh2ArMMmuIHYMfnuJ4ZAlKvZCK5V0dNcmtvxmRvZAhVypxeaIWE03CBI8GLt56cxccui6SxInTIgcjPKrbJI8nEmoORtxU21ON6baJjdGeLxvxZB5xTfSG8Tb5GijrfNwBaDFmd8Y6KLcPu8Lod8d2GfsorGtSZCTnUY5DtENhD3GcFmt8hoBYhhRAjV9sydW3pZAbPNszxtqmNBHYfju02M3Oi6WH
WHATSAPP_PHONE_ID=997749243410302
WHATSAPP_BUSINESS_ACCOUNT_ID=918577797187335
```

### Supabase Configuration
```
SUPABASE_URL=https://bxmdzcxejcxbinghtyfw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWR6Y3hlamN4YmluZ2h0eWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzMzOTYsImV4cCI6MjA4Mzc0OTM5Nn0.ccwWS_LPLjUrY8zqHD0Q7pTEamdN-QV0bv6f0B1uBUU
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWR6Y3hlamN4YmluZ2h0eWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3MzM5NiwiZXhwIjoyMDgzNzQ5Mzk2fQ.rcm_AT1o0Wiazvy9Pl6kjKc5jogHQKZyTfOxEX8v3Iw
```

### Webhook Security
```
WEBHOOK_VERIFY_TOKEN=whatsapp_gateway_verify_2024_secure
WEBHOOK_HMAC_SECRET=whatsapp_hmac_secret_2024_production
INTERNAL_WEBHOOK_SECRET=n8n_internal_webhook_secret_2024
```

### Application Configuration
```
N8N_WEBHOOK_URL=https://moments.unamifoundation.org/webhook
PORT=8080
NODE_ENV=production
```

### Authentication
```
JWT_SECRET=unami_moments_production_jwt_secret_2024_secure
ADMIN_PASSWORD=Proof321#moments
```

## How to Add to Vercel

1. Go to https://vercel.com/beatschain/moments
2. Click "Settings" → "Environment Variables"
3. Add each variable above with its value
4. Select "Production", "Preview", and "Development" for each
5. Click "Save"
6. Redeploy: `vercel --prod` or trigger via Git push

## Verification

After adding variables and redeploying:
- ✅ WhatsApp webhook should connect
- ✅ Supabase queries should work
- ✅ Emergency alerts API should respond
- ✅ Admin dashboard should load without CSP errors

## Current Status

- ✅ Phase 5 SQL migration deployed to Supabase
- ✅ Code pushed to GitHub (commit 0cbecb3)
- ⏳ Waiting for Vercel auto-deployment
- ⏳ Environment variables need to be added to Vercel

## Next Steps

1. Wait for Vercel deployment to complete (~2 minutes)
2. Add environment variables to Vercel dashboard
3. Trigger redeploy if needed
4. Test admin dashboard at https://moments.unamifoundation.org/admin
