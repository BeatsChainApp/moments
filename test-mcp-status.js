import { supabase } from './config/supabase.js';

async function testMCPStatus() {
  console.log('Testing current MCP advisory implementation...');
  
  // Test if function exists
  const testResult = await supabase.rpc('mcp_advisory', {
    message_content: 'Hello, this is a test message',
    message_language: 'eng',
    message_type: 'text',
    from_number: '+27123456789'
  });
  
  if (testResult.error) {
    if (testResult.error.code === 'PGRST202') {
      console.log('❌ MCP advisory function does not exist in database');
      console.log('📝 Migration needs to be applied manually in Supabase SQL Editor');
      console.log('📄 Migration file: supabase/migrations/20250111_add_mcp_advisory_function.sql');
    } else {
      console.error('❌ MCP function error:', testResult.error);
    }
  } else {
    console.log('✅ MCP advisory function is working!');
    console.log('📊 Test result:', JSON.stringify(testResult.data, null, 2));
  }
  
  // Test the fallback implementation in advisory.js
  console.log('\n🔄 Testing fallback implementation...');
  try {
    const { callMCPAdvisory } = await import('./src/advisory.js');
    const fallbackResult = await callMCPAdvisory({
      content: 'Hello, this is a test message',
      language_detected: 'eng',
      message_type: 'text',
      from_number: '+27123456789',
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Fallback implementation working');
    console.log('📊 Fallback result:', JSON.stringify(fallbackResult, null, 2));
  } catch (error) {
    console.error('❌ Fallback error:', error.message);
  }
}

testMCPStatus();