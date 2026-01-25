#!/usr/bin/env node

// Debug broadcast system to identify issues
import { supabase } from './config/supabase.js';
import { composeMomentMessage } from './src/services/broadcast-composer.js';

async function debugBroadcastSystem() {
  try {
    console.log('🔍 Debugging broadcast system...\n');
    
    // 1. Check for any test moments
    console.log('1. Looking for test moments...');
    const { data: moments, error: momentsError } = await supabase
      .from('moments')
      .select('id, title, slug, content, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (momentsError) {
      console.error('❌ Error fetching moments:', momentsError.message);
      return;
    }
    
    console.log(`📊 Found ${moments?.length || 0} recent moments`);
    
    if (moments && moments.length > 0) {
      const testMoment = moments[0];
      console.log(`\n📝 Testing with moment: "${testMoment.title}"`);
      console.log(`   ID: ${testMoment.id}`);
      console.log(`   Slug: ${testMoment.slug || 'NO SLUG'}`);
      console.log(`   Status: ${testMoment.status}`);
      
      // 2. Test the broadcast composer
      console.log('\n2. Testing broadcast composer...');
      try {
        const composedMessage = await composeMomentMessage(testMoment.id);
        console.log('✅ Broadcast composer working');
        console.log('📄 Composed message preview:');
        console.log('─'.repeat(50));
        console.log(composedMessage.substring(0, 300) + (composedMessage.length > 300 ? '...' : ''));
        console.log('─'.repeat(50));
        
        // Check for URL format
        if (composedMessage.includes('/moments/')) {
          console.log('✅ URL format is correct (/moments/{slug})');
        } else if (composedMessage.includes('/m/')) {
          console.log('❌ URL format is wrong (/m/{uuid})');
        } else {
          console.log('⚠️ No URL found in message');
        }
        
        // Check for duplicate content
        const lines = composedMessage.split('\n');
        const duplicateLines = lines.filter((line, index) => 
          lines.indexOf(line) !== index && line.trim() !== ''
        );
        
        if (duplicateLines.length > 0) {
          console.log('❌ Found duplicate lines in message:');
          duplicateLines.forEach(line => console.log(`   "${line}"`));
        } else {
          console.log('✅ No duplicate content found');
        }
        
      } catch (composerError) {
        console.error('❌ Broadcast composer error:', composerError.message);
      }
      
      // 3. Check for pending intents
      console.log('\n3. Checking for pending intents...');
      const { data: intents, error: intentsError } = await supabase
        .from('moment_intents')
        .select('id, moment_id, status, payload, created_at')
        .eq('status', 'pending')
        .eq('channel', 'whatsapp')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (intentsError) {
        console.error('❌ Error fetching intents:', intentsError.message);
      } else {
        console.log(`📊 Found ${intents?.length || 0} pending intents`);
        
        if (intents && intents.length > 0) {
          intents.forEach(intent => {
            console.log(`   Intent ${intent.id}:`);
            console.log(`     Moment: ${intent.moment_id}`);
            console.log(`     Status: ${intent.status}`);
            console.log(`     URL: ${intent.payload?.link || 'NO URL'}`);
            
            if (intent.payload?.link?.includes('/m/')) {
              console.log('     ❌ Intent has wrong URL format');
            } else if (intent.payload?.link?.includes('/moments/')) {
              console.log('     ✅ Intent has correct URL format');
            }
          });
        }
      }
      
      // 4. Check recent broadcasts
      console.log('\n4. Checking recent broadcasts...');
      const { data: broadcasts, error: broadcastsError } = await supabase
        .from('broadcasts')
        .select('id, moment_id, status, recipient_count, success_count, failure_count, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (broadcastsError) {
        console.error('❌ Error fetching broadcasts:', broadcastsError.message);
      } else {
        console.log(`📊 Found ${broadcasts?.length || 0} recent broadcasts`);
        
        if (broadcasts && broadcasts.length > 0) {
          broadcasts.forEach(broadcast => {
            console.log(`   Broadcast ${broadcast.id}:`);
            console.log(`     Moment: ${broadcast.moment_id}`);
            console.log(`     Status: ${broadcast.status}`);
            console.log(`     Recipients: ${broadcast.recipient_count || 0}`);
            console.log(`     Success: ${broadcast.success_count || 0}`);
            console.log(`     Failures: ${broadcast.failure_count || 0}`);
          });
        }
      }
      
      // 5. Check for multiple broadcast systems
      console.log('\n5. Checking for multiple broadcast systems...');
      
      // Check if there are any direct broadcast calls vs intent system
      const { data: recentMoments, error: recentError } = await supabase
        .from('moments')
        .select('id, title, status, broadcasted_at, publish_to_whatsapp')
        .eq('status', 'broadcasted')
        .order('broadcasted_at', { ascending: false })
        .limit(10);
      
      if (recentError) {
        console.error('❌ Error fetching recent broadcasts:', recentError.message);
      } else {
        console.log(`📊 Found ${recentMoments?.length || 0} recently broadcasted moments`);
        
        let intentSystemCount = 0;
        let directSystemCount = 0;
        
        for (const moment of recentMoments || []) {
          // Check if there's a corresponding intent
          const { data: intentCheck } = await supabase
            .from('moment_intents')
            .select('id')
            .eq('moment_id', moment.id)
            .eq('channel', 'whatsapp')
            .single();
          
          if (intentCheck) {
            intentSystemCount++;
          } else {
            directSystemCount++;
          }
        }
        
        console.log(`   Intent system broadcasts: ${intentSystemCount}`);
        console.log(`   Direct system broadcasts: ${directSystemCount}`);
        
        if (intentSystemCount > 0 && directSystemCount > 0) {
          console.log('⚠️ Multiple broadcast systems detected - this could cause duplicates!');
        } else if (intentSystemCount > 0) {
          console.log('✅ Using intent system (n8n)');
        } else if (directSystemCount > 0) {
          console.log('✅ Using direct broadcast system');
        }
      }
    }
    
    console.log('\n🏁 Debug complete');
    
  } catch (error) {
    console.error('💥 Debug script error:', error.message);
    process.exit(1);
  }
}

// Run the debug
debugBroadcastSystem().then(() => {
  console.log('✨ Debug finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug failed:', error.message);
  process.exit(1);
});