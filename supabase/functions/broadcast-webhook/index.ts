import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🚀 broadcast-webhook function initializing...')

// Validate environment variables at startup
const requiredEnvVars = ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
for (const envVar of requiredEnvVars) {
  if (!Deno.env.get(envVar)) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

// Create Supabase client once
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Attribution composer (matches src/services/attribution.js)
function composeMomentMessage(moment: any, creator: any, sponsor: any): string {
  const TRUST_LEVELS: any = {
    admin: { emoji: '🟢', label: 'Verified • Full Authority' },
    campaign: { emoji: '🟢', label: 'Verified • Campaign' },
    school_principal: { emoji: '🟢', label: 'Verified • Institutional' },
    school_official: { emoji: '🟢', label: 'Verified • Institutional' },
    community_leader: { emoji: '🟡', label: 'Verified • Limited Scope' },
    community_member: { emoji: '🟡', label: 'Community Contribution' },
    community: { emoji: '🟡', label: 'Community Contribution' },
    whatsapp: { emoji: '🟡', label: 'Community Contribution' },
    partner: { emoji: '🟢', label: 'Verified • Partner' },
    ngo_representative: { emoji: '🟢', label: 'Verified • Partner' }
  }

  const ROLE_LABELS: any = {
    admin: 'Administrator',
    campaign: 'Campaign',
    school_principal: 'School Principal',
    school_official: 'School Official',
    community_leader: 'Community Leader',
    community_member: 'Community Member',
    community: 'Community Member',
    whatsapp: 'Community Member',
    partner: 'Partner Organization',
    ngo_representative: 'NGO Representative'
  }

  // Generate slug
  let slug = moment.slug
  if (!slug) {
    slug = moment.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60) + '-' + moment.id.substring(0, 6)
  }

  const canonicalUrl = `https://moments.unamifoundation.org/moments/${slug}`

  // Build attribution
  let attribution = ''
  if (sponsor) {
    const sponsorName = sponsor.display_name || sponsor.name
    const roleLabel = ROLE_LABELS[creator.role] || 'Administrator'
    attribution = `💼 SPONSORED CONTENT\nPresented by: ${sponsorName}\nIn partnership with: ${roleLabel} (Verified)\n\nScope: ${moment.region || 'National'}\n📍 Coverage: ${moment.category || 'General'}\n🏛️ Sponsor: ${sponsorName}\n🟢 Trust Level: Verified • Sponsored\n\n`
  } else {
    const trustLevel = TRUST_LEVELS[creator.role]
    if (trustLevel) {
      const roleLabel = ROLE_LABELS[creator.role] || 'Administrator'
      attribution = `📢 ${roleLabel} (Verified)\nScope: ${moment.region || 'National'}\n📍 Coverage: ${moment.category || 'General'}\n🏛️ Affiliation: ${creator.organization || 'Unami Foundation Moments App'}\n${trustLevel.emoji} Trust Level: ${trustLevel.label}\n\n`
    }
  }

  // Build footer
  let footer = `\n\n🌐 View details:\n${canonicalUrl}\n\n`
  if (sponsor) {
    const sponsorName = sponsor.display_name || sponsor.name
    footer += `💼 Sponsored by ${sponsorName}\n`
    if (sponsor.website_url) footer += `Learn more: ${sponsor.website_url}\n\n`
  }
  footer += `Reply FEEDBACK - Share a response\nReply STOP to unsubscribe\n\nPowered by: Unami Foundation Moments App`

  return attribution + moment.content + footer
}

// Validation helpers
function isValidPhoneNumber(phone: string): boolean {
  const normalized = phone.replace(/\D/g, '')
  return normalized.length >= 10 && normalized.length <= 15
}

function isValidMessage(message: string): boolean {
  return message.length > 0 && message.length <= 4096
}

// Batch processing function
async function processBatchedBroadcast(broadcastId: string, message: string, recipients: string[], momentId?: string) {
  const BATCH_SIZE = 50
  const batches = []
  
  // Create batch records
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batchRecipients = recipients.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1
    
    const { data: batch, error } = await supabase
      .from('broadcast_batches')
      .insert({
        broadcast_id: broadcastId,
        batch_number: batchNumber,
        recipients: batchRecipients,
        status: 'pending'
      })
      .select()
      .single()
    
    if (!error && batch) {
      batches.push(batch)
    }
  }
  
  console.log(`✅ Created ${batches.length} batches for broadcast ${broadcastId}`)
  
  // Update broadcast status with batch count
  await supabase
    .from('broadcasts')
    .update({
      status: 'processing',
      broadcast_started_at: new Date().toISOString(),
      batches_total: batches.length,
      batches_completed: 0,
      progress_percentage: 0
    })
    .eq('id', broadcastId)
  
  // Process batches in parallel
  console.log(`⚡ Processing ${batches.length} batches in parallel...`)
  
  const batchPromises = batches.map(async (batch) => {
    try {
      const processorUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/broadcast-batch-processor`
      const response = await fetch(processorUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batch_id: batch.id,
          message: message
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        return { success: result.success_count, failure: result.failure_count }
      } else {
        console.error(`❌ Batch processor failed for batch ${batch.batch_number}`)
        return { success: 0, failure: batch.recipients.length }
      }
    } catch (error) {
      console.error(`❌ Batch processor error for batch ${batch.batch_number}: ${error.message}`)
      return { success: 0, failure: batch.recipients.length }
    }
  })
  
  const results = await Promise.all(batchPromises)
  
  let totalSuccess = 0
  let totalFailure = 0
  
  results.forEach(result => {
    totalSuccess += result.success
    totalFailure += result.failure
  })
  
  // Update final broadcast results
  await supabase
    .from('broadcasts')
    .update({
      status: 'completed',
      success_count: totalSuccess,
      failure_count: totalFailure,
      broadcast_completed_at: new Date().toISOString()
    })
    .eq('id', broadcastId)
  
  return new Response(JSON.stringify({
    success: true,
    broadcast_id: broadcastId,
    batches_created: batches.length,
    success_count: totalSuccess,
    failure_count: totalFailure,
    total_recipients: recipients.length,
    message: `Batch broadcast completed: ${batches.length} batches, ${totalSuccess} sent, ${totalFailure} failed`
  }), {
    status: 200,
    headers: corsHeaders
  })
}

// Process single batch
async function processBatch(batch: any, message: string) {
  console.log(`📦 Processing batch ${batch.batch_number} with ${batch.recipients.length} recipients`)
  
  // Update batch status
  await supabase
    .from('broadcast_batches')
    .update({
      status: 'processing',
      started_at: new Date().toISOString()
    })
    .eq('id', batch.id)
  
  let successCount = 0
  let failureCount = 0
  
  // Send messages with faster rate (400ms delay for two-message pattern)
  for (let i = 0; i < batch.recipients.length; i++) {
    const recipient = batch.recipients[i]
    
    try {
      const success = await sendMomentBroadcast(recipient, { fullMessage: message })
      if (success) {
        successCount++
      } else {
        failureCount++
      }
    } catch (error) {
      console.error(`❌ Batch ${batch.batch_number} - Failed to send to ${recipient}: ${error.message}`)
      failureCount++
    }
    
    // Rate limiting for batches: 2 seconds per recipient (template + message)
    if (i < batch.recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  // Update batch results
  await supabase
    .from('broadcast_batches')
    .update({
      status: 'completed',
      success_count: successCount,
      failure_count: failureCount,
      completed_at: new Date().toISOString()
    })
    .eq('id', batch.id)
  
  console.log(`✅ Batch ${batch.batch_number} completed: ${successCount} success, ${failureCount} failed`)
  
  return { success: successCount, failure: failureCount }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

// WhatsApp API helper - Two-message pattern with template
async function sendMomentBroadcast(to: string, momentData: any, attempt = 1): Promise<boolean> {
  const token = Deno.env.get('WHATSAPP_TOKEN')
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID')
  const maxRetries = 3

  if (!token || !phoneId) {
    console.error('❌ WhatsApp credentials missing')
    return false
  }

  // Normalize phone number
  let normalizedPhone = to.replace(/\D/g, '')
  if (normalizedPhone.startsWith('27')) {
    // Already has country code
  } else if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '27' + normalizedPhone.substring(1)
  } else if (normalizedPhone.length === 9) {
    normalizedPhone = '27' + normalizedPhone
  }

  try {
    console.log(`📱 Sending two-message broadcast to ${normalizedPhone}`)
    
    // Message 1: Generic template
    const templateResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: 'moment_notification',
          language: { code: 'en' },
          components: []
        }
      })
    })

    if (!templateResponse.ok) {
      const error = await templateResponse.text()
      console.error(`⚠️ Template send failed: ${error}`)
      return false
    }

    // Wait 1 second between messages
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Message 2: Full attributed moment
    const fullMomentResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'text',
        text: { body: momentData.fullMessage }
      })
    })

    if (fullMomentResponse.ok) {
      const result = await fullMomentResponse.json()
      console.log(`✅ Two-message broadcast sent to ${normalizedPhone}`)
      return true
    } else {
      const error = await fullMomentResponse.text()
      console.error(`⚠️ Full moment send failed: ${error}`)

      if (fullMomentResponse.status >= 500 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        return sendMomentBroadcast(to, momentData, attempt + 1)
      }
      return false
    }
  } catch (error) {
    console.error(`❌ Broadcast exception (attempt ${attempt}): ${error.message}`)

    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
      return sendMomentBroadcast(to, momentData, attempt + 1)
    }
    return false
  }
}

serve(async (req) => {
  console.log(`📨 Request received: ${req.method} ${new URL(req.url).pathname}`)
  
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight OK')
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    if (req.method !== 'POST') {
      console.warn(`⚠️ Invalid method: ${req.method}`)
      return new Response(JSON.stringify({ error: 'Only POST method allowed' }), {
        status: 405,
        headers: corsHeaders
      })
    }

    // Parse and validate request
    let requestData
    try {
      const text = await req.text()
      requestData = JSON.parse(text)
    } catch (parseError) {
      console.error(`❌ JSON parse error: ${parseError.message}`)
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: corsHeaders
      })
    }

    const { broadcast_id, moment_data, recipients, moment_id } = requestData

    // CHECK: If broadcast already exists and is processing/completed, skip to prevent duplicates
    if (broadcast_id) {
      const { data: existingBroadcast } = await supabase
        .from('broadcasts')
        .select('id, status')
        .eq('id', broadcast_id)
        .single()
      
      if (existingBroadcast && ['processing', 'completed'].includes(existingBroadcast.status)) {
        console.log(`⚠️ Broadcast ${broadcast_id} already ${existingBroadcast.status} - skipping to prevent duplicate`)
        return new Response(JSON.stringify({
          skipped: true,
          broadcast_id,
          reason: `Broadcast already ${existingBroadcast.status}`,
          message: 'Duplicate broadcast prevented'
        }), {
          status: 200,
          headers: corsHeaders
        })
      }
    }

    // Validate required fields
    if (!broadcast_id || !Array.isArray(recipients) || recipients.length === 0) {
      console.error(`❌ Missing required fields`)
      return new Response(JSON.stringify({
        error: 'Missing required fields: broadcast_id, recipients'
      }), {
        status: 400,
        headers: corsHeaders
      })
    }

    // Compose message if moment_id provided
    let fullMessage = moment_data?.fullMessage
    if (!fullMessage && moment_id) {
      console.log(`🎭 Composing message for moment ${moment_id}`)
      
      // Fetch moment with sponsor
      const { data: moment, error: momentError } = await supabase
        .from('moments')
        .select(`
          *,
          sponsors!sponsor_id(name, display_name, website_url)
        `)
        .eq('id', moment_id)
        .single()
      
      if (momentError || !moment) {
        return new Response(JSON.stringify({
          error: `Moment not found: ${moment_id}`
        }), {
          status: 404,
          headers: corsHeaders
        })
      }

      // Determine creator from authority_context or fallback
      const creator = {
        role: moment.content_source || 'admin',
        organization: 'Unami Foundation Moments App'
      }

      // Use authority_context if available
      if (moment.authority_context) {
        const auth = moment.authority_context
        console.log(`🔍 Authority context found:`, JSON.stringify(auth))
        // auth.role contains human-readable label like "Community Leader"
        // Convert to snake_case for role key lookup
        const roleKey = (auth.role || '').toLowerCase().replace(/\s+/g, '_')
        creator.role = roleKey || moment.content_source || 'community'
        creator.organization = auth.scope_identifier || 'Unami Foundation Moments App'
        console.log(`✅ Using authority context: role="${auth.role}" → roleKey="${roleKey}", org="${creator.organization}"`)
      } else {
        console.log(`⚠️ No authority_context found, using fallback: content_source="${moment.content_source}", created_by="${moment.created_by}"`)
        if (moment.created_by?.startsWith('+')) {
        // Fallback: Lookup authority if phone number
        const { data: authority } = await supabase.rpc('lookup_authority', {
          p_user_identifier: moment.created_by
        })
        if (authority && authority.length > 0) {
          const auth = authority[0]
          creator.role = auth.role_label.toLowerCase().replace(/\s+/g, '_')
          creator.organization = auth.scope_identifier || 'Unami Foundation Moments App'
          console.log(`✅ Looked up authority: role=${creator.role}, org=${creator.organization}`)
        }
      }

      fullMessage = composeMomentMessage(moment, creator, moment.sponsors)
      console.log(`✅ Message composed: ${fullMessage.length} chars`)
    }

    // Validate message
    if (!fullMessage || !isValidMessage(fullMessage)) {
      return new Response(JSON.stringify({
        error: 'fullMessage must be 1-4096 characters'
      }), {
        status: 400,
        headers: corsHeaders
      })
    }

    // Validate phone numbers
    const invalidNumbers = recipients.filter(phone => !isValidPhoneNumber(phone))
    if (invalidNumbers.length > 0) {
      return new Response(JSON.stringify({
        error: `Invalid phone numbers: ${invalidNumbers.slice(0, 5).join(', ')}${invalidNumbers.length > 5 ? '...' : ''}`
      }), {
        status: 400,
        headers: corsHeaders
      })
    }

    console.log(`📢 Starting broadcast ${broadcast_id}`)
    console.log(`   - Message length: ${fullMessage.length} chars`)
    console.log(`   - Recipients: ${recipients.length}`)
    console.log(`   - Moment ID: ${moment_id || 'N/A'}`)
    console.log(`   - Using two-message pattern (template + attribution)`)

    // Batch processing for large broadcasts (>50 recipients)
    const BATCH_SIZE = 50
    const USE_BATCHING = recipients.length > BATCH_SIZE

    if (USE_BATCHING) {
      console.log(`📦 Using batch processing: ${Math.ceil(recipients.length / BATCH_SIZE)} batches`)
      try {
        return await processBatchedBroadcast(broadcast_id, message, recipients, moment_id)
      } catch (batchError) {
        console.warn(`⚠️ Batch processing failed, falling back to sequential: ${batchError.message}`)
        // Fall through to sequential processing
      }
    }

    let successCount = 0
    let failureCount = 0
    const failedRecipients = []

    // Update broadcast status to processing
    const { error: updateError } = await supabase
      .from('broadcasts')
      .update({
        status: 'processing',
        broadcast_started_at: new Date().toISOString()
      })
      .eq('id', broadcast_id)

    if (updateError) {
      console.error(`❌ Failed to update broadcast status: ${updateError.message}`)
    }

    // Send messages with rate limiting
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]

      try {
        const success = await sendMomentBroadcast(recipient, { fullMessage })
        if (success) {
          successCount++
        } else {
          failureCount++
          failedRecipients.push(recipient)
        }
      } catch (error) {
        console.error(`❌ Exception sending to ${recipient}: ${error.message}`)
        failureCount++
        failedRecipients.push(recipient)
      }

      // Rate limiting: 2 seconds per recipient (template + message)
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const duration = Date.now() - startTime

    // Update broadcast with final results
    const { error: finalError } = await supabase
      .from('broadcasts')
      .update({
        status: 'completed',
        success_count: successCount,
        failure_count: failureCount,
        broadcast_completed_at: new Date().toISOString()
      })
      .eq('id', broadcast_id)

    if (finalError) {
      console.error(`❌ Failed to finalize broadcast: ${finalError.message}`)
    }

    console.log(`✅ Broadcast ${broadcast_id} completed in ${duration}ms`)
    console.log(`   - Success: ${successCount}/${recipients.length}`)
    console.log(`   - Failed: ${failureCount}/${recipients.length}`)
    if (failedRecipients.length > 0) {
      if (failedRecipients.length <= 10) {
        console.log(`   - Failed recipients: ${failedRecipients.join(', ')}`)
      } else {
        console.log(`   - Failed recipients (first 10): ${failedRecipients.slice(0, 10).join(', ')}`)
        console.log(`   - Total failed: ${failedRecipients.length}`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      broadcast_id,
      success_count: successCount,
      failure_count: failureCount,
      total_recipients: recipients.length,
      duration_ms
      
      : duration,
      message: `Broadcast completed: ${successCount} sent, ${failureCount} failed`
    }), {
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error(`❌ Broadcast webhook fatal error: ${error.message}`)
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: corsHeaders
    })
  }
})