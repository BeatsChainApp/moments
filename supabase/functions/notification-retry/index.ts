import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get failed notifications from last 24 hours
    const { data: failed } = await supabase
      .from('authority_notifications')
      .select('*, authority_profiles(*)')
      .eq('delivered', false)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(10);

    let retried = 0;
    let succeeded = 0;

    for (const notif of failed || []) {
      const authority = notif.authority_profiles;
      if (!authority) continue;

      let message = '';
      if (notif.notification_type === 'granted') {
        message = `🎉 You're now a ${authority.role_label}!\n\n💡 Share what matters:\n• Local opportunities\n• Safety alerts\n• Community events\n\nKeep it short and clear.\n\n📱 Send your message here to broadcast\n📍 ${authority.region || 'National'} • Valid until ${new Date(authority.valid_until).toLocaleDateString()}\n\n🌐 moments.unamifoundation.org`;
      } else if (notif.notification_type === 'suspended') {
        message = `⏸️ Authority Suspended\n\nYour ${authority.role_label} authority has been temporarily suspended.\n\nPlease contact support for more information.\n\n🌐 moments.unamifoundation.org`;
      } else if (notif.notification_type === 'expiry_warning') {
        const urgency = notif.days_until_expiry <= 1 ? '🔴' : notif.days_until_expiry <= 3 ? '🟠' : '🟡';
        message = `${urgency} Authority Expiring Soon!\n\nYour ${authority.role_label} authority expires in ${notif.days_until_expiry} day${notif.days_until_expiry > 1 ? 's' : ''}.\n\nContact your admin to extend your authority.\n\n🌐 moments.unamifoundation.org`;
      }

      if (!message) continue;

      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${Deno.env.get('WHATSAPP_PHONE_ID')}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('WHATSAPP_TOKEN')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: authority.user_identifier,
              type: 'text',
              text: { body: message }
            })
          }
        );

        if (response.ok) {
          await supabase
            .from('authority_notifications')
            .update({ delivered: true, updated_at: new Date().toISOString() })
            .eq('id', notif.id);
          succeeded++;
        }
        retried++;
      } catch (error) {
        console.error(`Retry failed for ${authority.user_identifier}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, retried, succeeded }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
