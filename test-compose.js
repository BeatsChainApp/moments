#!/usr/bin/env node

// Test script for composeMomentMessage function
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Inline the compose function for testing
async function testComposeMomentMessage(momentId) {
  try {
    console.log(`\n🔍 Testing compose for moment: ${momentId}\n`);
    
    const { data: moment, error } = await supabase
      .from('moments')
      .select(`
        *,
        sponsors!sponsor_id(name, display_name, website_url)
      `)
      .eq('id', momentId)
      .single();
    
    console.log('📊 Database query result:');
    console.log('  - Error:', error);
    console.log('  - Moment found:', !!moment);
    
    if (error) {
      console.error('❌ Database error:', error);
      return null;
    }
    
    if (!moment) {
      console.error('❌ Moment not found');
      return null;
    }
    
    console.log('\n📝 Moment data:');
    console.log('  - ID:', moment.id);
    console.log('  - Title:', moment.title);
    console.log('  - Content length:', moment.content?.length || 0);
    console.log('  - Content source:', moment.content_source);
    console.log('  - Created by:', moment.created_by);
    console.log('  - Sponsor:', moment.sponsors);
    console.log('  - Slug:', moment.slug);
    
    // Validate content
    if (!moment.content || moment.content.trim() === '') {
      console.error('❌ Moment has no content');
      return null;
    }
    
    // Provide defaults
    const creator = {
      role: moment.content_source || 'admin',
      organization: 'Unami Foundation Moments App'
    };
    const sponsor = moment.sponsors || null;
    
    console.log('\n✅ Using creator:', creator);
    console.log('✅ Using sponsor:', sponsor);
    
    // Simple composition
    const slug = moment.slug || `${moment.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${moment.id.substring(0, 6)}`;
    const canonicalUrl = `https://moments.unamifoundation.org/moments/${slug}`;
    
    const message = `📢 Test Message\n\n${moment.content}\n\n🌐 View: ${canonicalUrl}`;
    
    console.log('\n✅ Composed message length:', message.length);
    console.log('\n📨 Preview (first 200 chars):');
    console.log(message.substring(0, 200) + '...');
    
    return message;
  } catch (error) {
    console.error('\n❌ Compose error:', error);
    return null;
  }
}

// Get first moment from database
async function testWithFirstMoment() {
  const { data: moments, error } = await supabase
    .from('moments')
    .select('id, title')
    .limit(1);
  
  if (error || !moments || moments.length === 0) {
    console.error('No moments found in database');
    process.exit(1);
  }
  
  const momentId = moments[0].id;
  console.log(`Found moment: ${moments[0].title} (${momentId})`);
  
  const result = await testComposeMomentMessage(momentId);
  
  if (result) {
    console.log('\n✅ SUCCESS: Message composed successfully');
  } else {
    console.log('\n❌ FAILURE: Could not compose message');
    process.exit(1);
  }
}

testWithFirstMoment();
