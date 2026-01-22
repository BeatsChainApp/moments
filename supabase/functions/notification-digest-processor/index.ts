import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

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
  try {
    const { frequency = 'daily' } = await req.json().catch(() => ({}))

    const { data: digestType } = await supabase
      .from('notification_types')
      .select('id')
      .eq('type_code', frequency === 'daily' ? 'digest_daily' : 'digest_weekly')
      .single()

    if (!digestType) {
      return new Response(JSON.stringify({ error: 'Digest type not found' }), { status: 400 })
    }

    const { data: subscribers } = await supabase
      .from('subscriptions')
      .select('phone_number, regions, digest_enabled, digest_frequency')
      .eq('opted_in', true)
      .eq('digest_enabled', true)
      .eq('digest_frequency', frequency)

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscribers for digest', processed: 0 }), { status: 200 })
    }

    const cutoffDate = frequency === 'daily' 
      ? new Date(Date.now() - 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    let successCount = 0
    let failureCount = 0

    for (const subscriber of subscribers) {
      try {
        const { data: moments } = await supabase
          .from('moments')
          .select('title, region, category')
          .eq('status', 'broadcasted')
          .gte('broadcasted_at', cutoffDate.toISOString())
          .in('region', subscriber.regions || ['National'])
          .order('broadcasted_at', { ascending: false })
          .limit(10)

        if (!moments || moments.length === 0) continue

        const digestMessage = `📊 ${frequency === 'daily' ? 'Daily' : 'Weekly'} Digest\n\n` +
          `${moments.length} new moments in your regions:\n\n` +
          moments.map((m, i) => `${i + 1}. ${m.title} (${m.region})`).join('\n') +
          `\n\n🌐 View all: moments.unamifoundation.org\n📱 Reply STOP to unsubscribe`

        const sent = await sendWhatsAppMessage(subscriber.phone_number, digestMessage)

        await supabase.from('notification_log').insert({
          notification_type_id: digestType.id,
          recipient_phone: subscriber.phone_number,
          channel: 'whatsapp',
          priority: 1,
          status: sent ? 'sent' : 'failed',
          message_content: digestMessage,
          metadata: { moment_count: moments.length, frequency },
          sent_at: sent ? new Date().toISOString() : null,
          failed_at: sent ? null : new Date().toISOString(),
          failure_reason: sent ? null : 'WhatsApp API error'
        })

        sent ? successCount++ : failureCount++
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        failureCount++
      }
    }

    return new Response(JSON.stringify({
      success: true,
      frequency,
      processed: subscribers.length,
      success_count: successCount,
      failure_count: failureCount
    }), { status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
