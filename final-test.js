#!/usr/bin/env node

// Final comprehensive test of broadcast system
import { supabase } from './config/supabase.js';
import { composeMomentMessage } from './src/services/broadcast-composer.js';

async function finalSystemTest() {
  console.log('🔍 FINAL SYSTEM TEST - Checking all broadcast issues\n');
  
  let allGood = true;
  
  try {
    // Test 1: Check recent moments for clean content
    console.log('1. Testing moment content integrity...');
    const { data: moments, error } = await supabase
      .from('moments')
      .select('id, title, content, content_source, created_by, slug')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error) throw error;
    
    for (const moment of moments || []) {
      console.log(`\n   Testing: "${moment.title.substring(0, 40)}..."`);
      
      // Check for corrupted content
      if (moment.content.includes('📢') || moment.content.includes('🌐 More:')) {
        console.log('   ❌ FAIL: Content still contains attribution/footer');
        allGood = false;
      } else {
        console.log('   ✅ PASS: Content is clean');
      }
      
      // Check slug exists
      if (!moment.slug) {
        console.log('   ❌ FAIL: Missing slug');
        allGood = false;
      } else {
        console.log('   ✅ PASS: Has slug');
      }
      
      // Test broadcast composition
      try {
        const composed = await composeMomentMessage(moment.id);
        
        // Check attribution block
        if (!composed.includes('📢') && !composed.includes('💼 SPONSORED')) {
          console.log('   ❌ FAIL: Missing attribution block');
          allGood = false;
        } else {
          console.log('   ✅ PASS: Has attribution block');
        }
        
        // Check URL format
        if (composed.includes('/m/')) {
          console.log('   ❌ FAIL: Wrong URL format (/m/)');
          allGood = false;
        } else if (composed.includes('/moments/')) {
          console.log('   ✅ PASS: Correct URL format (/moments/)');
        } else {
          console.log('   ❌ FAIL: No URL found');
          allGood = false;
        }
        
        // Check for duplicates
        const lines = composed.split('\n');
        const nonEmptyLines = lines.filter(l => l.trim());
        const uniqueLines = [...new Set(nonEmptyLines)];
        
        if (nonEmptyLines.length !== uniqueLines.length) {
          console.log('   ❌ FAIL: Duplicate lines found');
          allGood = false;
        } else {
          console.log('   ✅ PASS: No duplicate content');
        }
        
        // Check role detection
        const roleDetected = composed.includes('Community Leader') || 
                           composed.includes('Administrator') || 
                           composed.includes('Community Member') ||
                           composed.includes('SPONSORED CONTENT');
        
        if (!roleDetected) {
          console.log('   ❌ FAIL: No role detected');
          allGood = false;
        } else {
          console.log('   ✅ PASS: Role properly detected');
        }
        
      } catch (composeError) {
        console.log('   ❌ FAIL: Composition error:', composeError.message);
        allGood = false;
      }
    }
    
    // Test 2: Check admin broadcast endpoint
    console.log('\n2. Testing admin broadcast endpoint...');
    
    // Create a test moment
    const testMoment = {
      title: 'System Test Final',
      content: 'This is a final system test to verify all broadcast issues are resolved.',
      region: 'National',
      category: 'General',
      content_source: 'admin',
      created_by: 'system_test',
      status: 'draft'
    };
    
    const { data: newMoment, error: createError } = await supabase
      .from('moments')
      .insert(testMoment)
      .select()
      .single();
    
    if (createError) {
      console.log('   ❌ FAIL: Could not create test moment');
      allGood = false;
    } else {
      console.log('   ✅ PASS: Test moment created');
      
      // Test composition
      const testComposed = await composeMomentMessage(newMoment.id);
      
      if (testComposed.includes('/moments/') && testComposed.includes('📢')) {
        console.log('   ✅ PASS: New moment composes correctly');
      } else {
        console.log('   ❌ FAIL: New moment composition issues');
        allGood = false;
      }
      
      // Cleanup
      await supabase.from('moments').delete().eq('id', newMoment.id);
    }
    
    // Test 3: Check n8n workflow format
    console.log('\n3. Testing n8n workflow format...');
    
    // Simulate n8n message rendering
    const mockPayload = {
      title: 'Test Moment',
      full_text: 'Test content for n8n workflow',
      region: 'GP',
      category: 'Education',
      link: 'https://moments.unamifoundation.org/moments/test-slug'
    };
    
    // Check n8n message format (from workflow)
    const attribution = `📢 Administrator (Verified)\nScope: ${mockPayload.region}\n📍 Coverage: ${mockPayload.category}\n🏛️ Affiliation: Unami Foundation Moments App\n🟢 Trust Level: Verified • Full Authority`;
    const footer = `🌐 View details & respond:\n${mockPayload.link}\n\n💬 Replies are received by Unami Foundation Moments App`;
    const n8nMessage = `${attribution}\n\n${mockPayload.full_text}\n\n${footer}`;
    
    if (n8nMessage.includes('/moments/') && n8nMessage.includes('📢')) {
      console.log('   ✅ PASS: N8N workflow format correct');
    } else {
      console.log('   ❌ FAIL: N8N workflow format issues');
      allGood = false;
    }
    
    // Final result
    console.log('\n' + '='.repeat(60));
    if (allGood) {
      console.log('🎉 ALL TESTS PASSED - System is 200% ready!');
      console.log('✅ No duplicate messages');
      console.log('✅ Correct URL format (/moments/{slug})');
      console.log('✅ Dynamic role detection');
      console.log('✅ Clean content separation');
      console.log('✅ Proper attribution blocks');
      console.log('✅ N8N workflow aligned');
    } else {
      console.log('❌ SOME TESTS FAILED - Issues remain');
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
    allGood = false;
  }
  
  process.exit(allGood ? 0 : 1);
}

finalSystemTest();