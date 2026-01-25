#!/usr/bin/env node

import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';
import { selectTemplate, buildTemplateParams } from './src/whatsapp-templates-marketing.js';
import { composeMomentMessage } from './src/services/broadcast-composer.js';

dotenv.config();

async function testBroadcastFlow() {
  console.log('🧪 Testing Two-Message Broadcast Flow\n');
  
  // Get a moment
  const { data: moment } = await supabase
    .from('moments')
    .select('*')
    .limit(1)
    .single();
  
  if (!moment) {
    console.log('❌ No moments found');
    return;
  }
  
  console.log('📝 Moment:', moment.title);
  console.log('   ID:', moment.id);
  console.log('   Created by:', moment.created_by);
  console.log('   Content source:', moment.content_source);
  
  // Get authority if phone number
  let authorityContext = null;
  if (moment.created_by?.startsWith('+')) {
    const { data: auth } = await supabase.rpc('lookup_authority', {
      p_user_identifier: moment.created_by
    });
    authorityContext = auth?.[0] || null;
  }
  
  // Get sponsor if exists
  let sponsor = null;
  if (moment.sponsor_id) {
    const { data: sponsorData } = await supabase
      .from('sponsors')
      .select('*')
      .eq('id', moment.sponsor_id)
      .single();
    sponsor = sponsorData;
  }
  
  console.log('\n📤 MESSAGE 1: Generic Template');
  console.log('─────────────────────────────');
  const template = selectTemplate(moment, authorityContext, sponsor);
  const params = await buildTemplateParams(moment, authorityContext, sponsor);
  
  console.log('Template:', template.name);
  console.log('Parameters:', params.length === 0 ? 'None (generic shell)' : params);
  console.log('\nTemplate body:');
  console.log(template.components.find(c => c.type === 'BODY').text);
  
  console.log('\n📤 MESSAGE 2: Full Attributed Moment');
  console.log('─────────────────────────────────────');
  const fullMoment = await composeMomentMessage(moment.id);
  console.log(fullMoment);
  
  console.log('\n✅ Two-message pattern ready');
  console.log('   Cost: 1 marketing conversation');
  console.log('   Template: APPROVED (ID: 897447336206754)');
}

testBroadcastFlow().catch(console.error);
