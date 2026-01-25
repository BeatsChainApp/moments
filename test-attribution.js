#!/usr/bin/env node

import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';
import { buildTemplateParams, selectTemplate } from './src/whatsapp-templates-marketing.js';

dotenv.config();

async function testAttribution() {
  console.log('🧪 Testing Attribution & URLs\n');
  
  // Get a moment
  const { data: moments } = await supabase
    .from('moments')
    .select('*')
    .limit(1)
    .single();
  
  if (!moments) {
    console.log('❌ No moments found');
    return;
  }
  
  console.log('📝 Testing moment:', moments.title);
  console.log('   Created by:', moments.created_by);
  console.log('   Content source:', moments.content_source);
  console.log('   Slug:', moments.slug);
  
  // Test authority lookup if phone number
  let authorityContext = null;
  if (moments.created_by?.startsWith('+')) {
    const { data: auth } = await supabase.rpc('lookup_authority', {
      p_user_identifier: moments.created_by
    });
    authorityContext = auth?.[0] || null;
    console.log('   Authority:', authorityContext?.role_label || 'None');
  }
  
  // Get sponsor if exists
  let sponsor = null;
  if (moments.sponsor_id) {
    const { data: sponsorData } = await supabase
      .from('sponsors')
      .select('*')
      .eq('id', moments.sponsor_id)
      .single();
    sponsor = sponsorData;
  }
  
  // Test template selection
  const template = selectTemplate(moments, authorityContext, sponsor);
  console.log('\n📋 Selected template:', template.name);
  
  // Test parameter building
  const params = await buildTemplateParams(moments, authorityContext, sponsor);
  console.log('\n🔧 Template parameters:');
  params.forEach((p, i) => {
    const preview = p.length > 60 ? p.substring(0, 60) + '...' : p;
    console.log(`   {{${i+1}}}: ${preview}`);
  });
  
  // Test URL format
  const urlParam = params.find(p => p.includes('moments.unamifoundation.org'));
  console.log('\n🌐 URL format:', urlParam || 'NOT FOUND');
  
  // Verify slug-based URL
  if (urlParam?.includes('/moments/') && !urlParam.includes('/m/')) {
    console.log('✅ URL uses canonical slug format');
  } else {
    console.log('❌ URL format incorrect');
  }
  
  // Test attribution structure
  console.log('\n📢 Attribution preview:');
  const bodyText = template.components.find(c => c.type === 'BODY')?.text;
  if (bodyText) {
    let preview = bodyText;
    params.forEach((p, i) => {
      preview = preview.replace(`{{${i+1}}}`, p.substring(0, 30));
    });
    console.log(preview.substring(0, 300) + '...');
  }
}

testAttribution().catch(console.error);
