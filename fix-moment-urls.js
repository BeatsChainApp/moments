#!/usr/bin/env node

// Fix all moments to have proper slugs and URLs
// This script ensures all moments follow the /moments/{slug} URL pattern

import { supabase } from './config/supabase.js';

// Generate slug from title and ID
function generateSlug(title, id) {
  let slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
  
  slug += '-' + id.substring(0, 6);
  return slug;
}

async function fixMomentUrls() {
  try {
    console.log('🔧 Fixing moment URLs and slugs...');
    
    // Get all moments without slugs or with wrong URLs
    const { data: moments, error } = await supabase
      .from('moments')
      .select('id, title, slug, pwa_link')
      .or('slug.is.null,pwa_link.like.*%/m/%*');
    
    if (error) {
      console.error('❌ Error fetching moments:', error.message);
      return;
    }
    
    console.log(`📊 Found ${moments?.length || 0} moments to fix`);
    
    let fixedCount = 0;
    
    for (const moment of moments || []) {
      try {
        // Generate slug if missing
        let slug = moment.slug;
        if (!slug) {
          slug = generateSlug(moment.title, moment.id);
        }
        
        // Generate proper URL
        const properUrl = `https://moments.unamifoundation.org/moments/${slug}`;
        
        // Update moment with proper slug and URL
        const { error: updateError } = await supabase
          .from('moments')
          .update({
            slug: slug,
            pwa_link: properUrl
          })
          .eq('id', moment.id);
        
        if (updateError) {
          console.error(`❌ Failed to update moment ${moment.id}:`, updateError.message);
          continue;
        }
        
        console.log(`✅ Fixed: "${moment.title}" -> /moments/${slug}`);
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing moment ${moment.id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} moments`);
    
    // Also fix any pending intents with wrong URLs
    console.log('\n🔧 Fixing pending intents...');
    
    const { data: intents, error: intentError } = await supabase
      .from('moment_intents')
      .select('id, moment_id, payload')
      .eq('status', 'pending')
      .eq('channel', 'whatsapp');
    
    if (intentError) {
      console.error('❌ Error fetching intents:', intentError.message);
      return;
    }
    
    let fixedIntents = 0;
    
    for (const intent of intents || []) {
      try {
        const payload = intent.payload || {};
        
        // Check if URL needs fixing
        if (payload.link && payload.link.includes('/m/')) {
          // Get the moment to get proper slug
          const { data: moment, error: momentError } = await supabase
            .from('moments')
            .select('slug, title, id')
            .eq('id', intent.moment_id)
            .single();
          
          if (momentError || !moment) {
            console.warn(`⚠️ Could not find moment for intent ${intent.id}`);
            continue;
          }
          
          // Ensure moment has slug
          let slug = moment.slug;
          if (!slug) {
            slug = generateSlug(moment.title, moment.id);
            await supabase.from('moments').update({ slug }).eq('id', moment.id);
          }
          
          // Update intent payload with proper URL
          const updatedPayload = {
            ...payload,
            link: `https://moments.unamifoundation.org/moments/${slug}`
          };
          
          const { error: updateError } = await supabase
            .from('moment_intents')
            .update({ payload: updatedPayload })
            .eq('id', intent.id);
          
          if (updateError) {
            console.error(`❌ Failed to update intent ${intent.id}:`, updateError.message);
            continue;
          }
          
          console.log(`✅ Fixed intent ${intent.id} URL`);
          fixedIntents++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing intent ${intent.id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedIntents} pending intents`);
    console.log('\n✨ All URLs now use proper /moments/{slug} format!');
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixMomentUrls().then(() => {
  console.log('🏁 URL fix complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error.message);
  process.exit(1);
});