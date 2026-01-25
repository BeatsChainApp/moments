#!/usr/bin/env node

import dotenv from 'dotenv';
import { MARKETING_TEMPLATES } from '../src/whatsapp-templates-marketing.js';

// Load environment variables
dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_BUSINESS_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

if (!WHATSAPP_TOKEN || !WHATSAPP_BUSINESS_ID) {
  console.error('❌ Missing required environment variables:');
  console.error('   WHATSAPP_TOKEN:', WHATSAPP_TOKEN ? '✅ Set' : '❌ Missing');
  console.error('   WHATSAPP_BUSINESS_ACCOUNT_ID:', WHATSAPP_BUSINESS_ID ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

async function createTemplate(templateData) {
  console.log(`📝 Template payload:`, JSON.stringify(templateData, null, 2));
  
  const response = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_BUSINESS_ID}/message_templates`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(templateData)
  });

  const responseData = await response.json();
  
  if (!response.ok) {
    console.error(`🔴 API Response:`, responseData);
    throw new Error(`Template creation failed: ${responseData.error?.message || response.statusText}`);
  }

  return responseData;
}

async function autoDeployTemplates() {
  console.log('🚀 Auto-deploying Meta Marketing Templates to Facebook...\n');
  
  const templates = Object.entries(MARKETING_TEMPLATES);
  const results = [];
  
  for (const [key, template] of templates) {
    try {
      console.log(`📤 Deploying: ${template.name}`);
      
      const result = await createTemplate({
        name: template.name,
        category: template.category,
        language: template.language,
        components: template.components
      });
      
      console.log(`✅ Success: ${template.name} - ID: ${result.id}`);
      console.log(`   Status: ${result.status || 'PENDING'}\n`);
      
      results.push({
        template: key,
        name: template.name,
        id: result.id,
        status: result.status || 'PENDING',
        success: true
      });
      
    } catch (error) {
      console.error(`❌ Failed: ${template.name}`);
      console.error(`   Error: ${error.message}\n`);
      
      results.push({
        template: key,
        name: template.name,
        error: error.message,
        success: false
      });
    }
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('📊 DEPLOYMENT SUMMARY');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📋 Total: ${results.length}\n`);
  
  if (successful > 0) {
    console.log('⏳ Templates are now pending Meta approval (24-48 hours)');
    console.log('🔍 Check status in WhatsApp Business Manager');
  }
  
  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  autoDeployTemplates().catch(console.error);
}

export { autoDeployTemplates };