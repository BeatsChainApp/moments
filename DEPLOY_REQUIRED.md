# Deploy Edge Functions - REQUIRED

## Issue
The broadcast endpoint is failing because the deployed edge function is using OLD CODE that doesn't have the fixes we just applied.

## Solution: Redeploy Edge Functions

### Option 1: Supabase Dashboard (Easiest)
1. Go to https://app.supabase.com/project/bxmdzcxejcxbinghtyfw/functions
2. Find `admin-api` function
3. Click "Deploy new version"
4. The function will automatically pull from your connected GitHub repo

### Option 2: Supabase CLI
```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref bxmdzcxejcxbinghtyfw

# Deploy admin-api function
supabase functions deploy admin-api

# Deploy broadcast-webhook function (if needed)
supabase functions deploy broadcast-webhook
```

### Option 3: Manual Upload
1. Go to https://app.supabase.com/project/bxmdzcxejcxbinghtyfw/functions/admin-api
2. Click "Edit function"
3. Copy contents of `supabase/functions/admin-api/index.ts`
4. Paste and save
5. Click "Deploy"

## After Deployment

Test the broadcast again:
```bash
./test-broadcast-flow.sh
```

Or manually test in the admin dashboard by clicking "Broadcast Now" on a moment.

## What Was Fixed

1. **Session validation** - Now handles duplicate tokens
2. **Auto-broadcast** - Checks if broadcast record was created before accessing broadcast.id
3. **Error handling** - Better error messages for debugging

## Current Status

- ✅ Database schema is correct (phone_number column exists)
- ✅ Code fixes are committed to GitHub
- ❌ Edge function needs redeployment to use new code

**ACTION REQUIRED: Redeploy the admin-api edge function using one of the options above**
