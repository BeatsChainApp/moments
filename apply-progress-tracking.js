#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyProgressTracking() {
  try {
    console.log('📄 Adding progress tracking fields to broadcasts table...');
    
    // Check if fields already exist by querying the table
    const { data, error } = await supabase
      .from('broadcasts')
      .select('batches_total, batches_completed, progress_percentage')
      .limit(1);
    
    if (error && error.message.includes('column')) {
      console.log('⚠️ Fields do not exist, they need to be added via SQL');
      console.log('Run this SQL in Supabase SQL Editor:');
      console.log(`
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS batches_total INTEGER DEFAULT 0;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS batches_completed INTEGER DEFAULT 0;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2) DEFAULT 0;
      `);
    } else if (!error) {
      console.log('✅ Progress tracking fields already exist');
    } else {
      console.error('❌ Error checking fields:', error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

applyProgressTracking();