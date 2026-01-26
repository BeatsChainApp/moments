#!/usr/bin/env node

/**
 * Reset Database Script
 * Deletes all data except admin user and resets sequences
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import readline from 'readline';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function resetDatabase() {
  console.log('🔄 Starting database reset...\n');

  try {
    // Read SQL file
    const sql = fs.readFileSync('./reset-database.sql', 'utf8');
    
    // Execute SQL
    console.log('📝 Executing SQL script...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error executing SQL:', error);
      console.log('\n⚠️  Please run reset-database.sql manually in Supabase SQL Editor');
      process.exit(1);
    }

    console.log('✅ Database reset complete!\n');
    
    // Verify admin user
    console.log('🔍 Verifying admin user...');
    const { data: admin, error: adminError } = await supabase
      .from('authorities')
      .select('id, email, phone_number, role, organization')
      .or('email.eq.info@unamifoundation.org,phone_number.eq.+27727002502')
      .single();

    if (adminError) {
      console.error('❌ Error verifying admin:', adminError);
    } else {
      console.log('✅ Admin user preserved:');
      console.log(JSON.stringify(admin, null, 2));
    }

    console.log('\n✨ Database is ready for user testing!');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.log('\n⚠️  Please run reset-database.sql manually in Supabase SQL Editor');
    process.exit(1);
  }
}

// Confirm before executing
console.log('⚠️  WARNING: This will delete ALL data except admin user!\n');
console.log('Admin to preserve:');
console.log('  - Email: info@unamifoundation.org');
console.log('  - Phone: +27727002502\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Type "RESET" to confirm: ', (answer) => {
  rl.close();
  
  if (answer === 'RESET') {
    resetDatabase();
  } else {
    console.log('❌ Reset cancelled');
    process.exit(0);
  }
});
