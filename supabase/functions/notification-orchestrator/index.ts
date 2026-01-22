import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  const token = Deno.env.get('WHATSAPP_TOKEN')
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID')
  
  let normalizedPhone = to.replace(/\D/g, '')
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '27' + normalizedPhone.substring(1)
  } else if (!normalizedPhone.startsWith('27')) {
    normalizedPhone = '27' + normalizedPhone
  }

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: 'text',
      text: { body: message }
    })
  })

  return response.ok
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      notification_type, 
      recipient_phone, 
      priority = 2,
      message_content,
      metadata = {},
      scheduled_for,
      broadcast_id,
      moment_id,
      bypass_preferences = false, // Emergency bypass
      channel = 'whatsapp', // 'whatsapp', 'sms', 'email'
      emergency_alert_id
    } = await req.json()

    if (!notification_type || !recipient_phone) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: notification_type, recipient_phone' 
      }), { status: 400, headers: corsHeaders })
    }

    const { data: notifType, error: typeError } = await supabase
      .from('notification_types')
      .select('*')
      .eq('type_code', notification_type)
      .single()

    if (typeError || !notifType) {
      return new Response(JSON.stringify({ 
        error: `Invalid notification type: ${notification_type}` 
      }), { status: 400, headers: corsHeaders })
    }

    // Check preferences unless bypassed (emergency alerts)
    let shouldSend = true
    if (!bypass_preferences) {
      const { data: prefCheck } = await supabase
        .rpc('should_send_notification', {
          p_phone_number: recipient_phone,
          p_notification_type_id: notifType.id,
          p_priority: priority
        })
      shouldSend = prefCheck
    }

    if (!shouldSend) {
      await supabase.from('notification_log').insert({
        notification_type_id: notifType.id,
        recipient_phone,
        channel,
        priority,
        status: 'failed',
        failure_reason: 'User preferences blocked notification',
        message_content,
        metadata,
        broadcast_id,
        moment_id,
        bypass_preferences,
        emergency_alert_id
      })

      return new Response(JSON.stringify({ 
        success: false,
        reason: 'blocked_by_preferences'
      }), { status: 200, headers: corsHeaders })
    }

    const { data: logEntry, error: logError } = await supabase
      .from('notification_log')
      .insert({
        notification_type_id: notifType.id,
        recipient_phone,
        channel,
        priority,
        status: 'queued',
        template_used: notifType.template_name,
        message_content,
        metadata,
        scheduled_for,
        broadcast_id,
        moment_id,
        bypass_preferences,
        emergency_alert_id
      })
      .select()
      .single()

    if (logError) {
      return new Response(JSON.stringify({ error: 'Failed to log notification' }), {
        status: 500,
        headers: corsHeaders
      })
    }

    if (scheduled_for && new Date(scheduled_for) > new Date()) {
      return new Response(JSON.stringify({
        success: true,
        notification_id: logEntry.id,
        status: 'scheduled',
        scheduled_for
      }), { status: 200, headers: corsHeaders })
    }

    // Send via appropriate channel
    let sent = false
    if (channel === 'whatsapp') {
      sent = await sendWhatsAppMessage(recipient_phone, message_content)
    }
    // Future: Add SMS and email channels here

    await supabase
      .from('notification_log')
      .update({
        status: sent ? 'sent' : 'failed',
        sent_at: sent ? new Date().toISOString() : null,
        failed_at: sent ? null : new Date().toISOString(),
        failure_reason: sent ? null : `${channel} delivery failed`
      })
      .eq('id', logEntry.id)

    return new Response(JSON.stringify({
      success: sent,
      notification_id: logEntry.id,
      status: sent ? 'sent' : 'failed',
      channel
    }), { status: 200, headers: corsHeaders })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    })
  }
})
