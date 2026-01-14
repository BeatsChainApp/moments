import { supabase } from './config/supabase.js';
import fs from 'fs';

async function applyMCPMigration() {
  try {
    console.log('Reading MCP migration file...');
    const migrationSQL = fs.readFileSync('./supabase/migrations/20250111_add_mcp_advisory_function.sql', 'utf8');
    
    console.log('Applying MCP advisory function migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      return;
    }
    
    console.log('Migration applied successfully!');
    
    // Test the function
    console.log('Testing MCP advisory function...');
    const testResult = await supabase.rpc('mcp_advisory', {
      message_content: 'Hello, this is a test message',
      message_language: 'eng',
      message_type: 'text',
      from_number: '+27123456789'
    });
    
    if (testResult.error) {
      console.error('Test failed:', testResult.error);
    } else {
      console.log('Test successful! MCP advisory function is working.');
      console.log('Test result:', JSON.stringify(testResult.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

applyMCPMigration();