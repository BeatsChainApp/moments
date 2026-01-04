import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || 'moments';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function ensureBucket() {
  try {
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) {
      console.warn('Warning: listBuckets returned an error, continuing to create bucket if needed:', listErr.message || listErr);
    }

    const exists = Array.isArray(buckets) && buckets.some(b => b.name === BUCKET);
    if (exists) {
      console.log(`Bucket '${BUCKET}' already exists`);
      return;
    }

    const { data, error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) {
      console.error('Failed to create bucket:', error.message || error);
      process.exit(1);
    }

    console.log(`Created bucket '${BUCKET}' and set public=true`);
  } catch (err) {
    console.error('Error ensuring bucket:', err.message || err);
    process.exit(1);
  }
}

ensureBucket();
