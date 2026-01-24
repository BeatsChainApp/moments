import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: notifications, error } = await supabase
      .from('notification_log')
      .select('*')
      .eq('channel', 'email')
      .eq('delivery_status', 'pending')
      .order('priority', { ascending: false })
      .limit(50)

    if (error) throw error

    const results = { sent: 0, failed: 0 }

    for (const notif of notifications || []) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Unami Moments <notifications@unamifoundation.org>',
            to: notif.recipient,
            subject: getSubject(notif.notification_type),
            html: formatEmail(notif),
          }),
        })

        if (response.ok) {
          await supabase
            .from('notification_log')
            .update({ 
              delivery_status: 'delivered',
              delivered_at: new Date().toISOString()
            })
            .eq('id', notif.id)
          results.sent++
        } else {
          throw new Error(await response.text())
        }
      } catch (err) {
        await supabase
          .from('notification_log')
          .update({ 
            delivery_status: 'failed',
            error_message: err.message
          })
          .eq('id', notif.id)
        results.failed++
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

function getSubject(type: string): string {
  const subjects = {
    admin_flagged_content: '⚠️ High-Confidence Content Flagged',
    admin_broadcast_completed: '✅ Broadcast Completed',
    admin_broadcast_failed: '🚨 Broadcast Failed',
    admin_campaign_pending: '📋 Campaign Pending Review',
    sponsor_campaign_approved: '✅ Campaign Approved',
    sponsor_campaign_completed: '🎉 Campaign Completed',
    sponsor_moment_published: '📢 Moment Published',
  }
  return subjects[type] || 'Unami Moments Notification'
}

function formatEmail(notif: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Unami Moments</h2>
        </div>
        <div class="content">
          <p>${notif.message_content}</p>
          ${notif.metadata ? `<p><small>Details: ${JSON.stringify(notif.metadata, null, 2)}</small></p>` : ''}
        </div>
        <div class="footer">
          <p>Unami Foundation | moments.unamifoundation.org</p>
        </div>
      </div>
    </body>
    </html>
  `
}
