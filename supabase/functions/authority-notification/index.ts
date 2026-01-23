import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import axios from 'https://esm.sh/axios@1.6.0';

Deno.serve(async (req) => {
  try {
    const { authority_id, notification_type } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: authority } = await supabase
      .from('authority_profiles')
      .select('*')
      .eq('id', authority_id)
      .single();

    if (!authority) throw new Error('Authority not found');

    let message = '';
    
    if (notification_type === 'granted') {
      message = `✅ Authority Verified!

You've been verified as ${authority.role_label}

📊 Authority Level: ${authority.authority_level}
👥 Max Recipients: ${authority.blast_radius.toLocaleString()}
📍 Scope: ${authority.scope_identifier || 'N/A'}
🌍 Region: ${authority.region || 'National'}
⏰ Valid Until: ${new Date(authority.valid_until).toLocaleDateString()}

You can now broadcast messages to your community.

📱 Send messages here to broadcast
❓ Reply HELP for commands`;
    } else if (notification_type === 'extended') {
      message = `🔄 Authority Extended!

Your ${authority.role_label} authority has been extended.

⏰ New Expiry: ${new Date(authority.valid_until).toLocaleDateString()}

Continue broadcasting to your community!`;
    } else if (notification_type === 'suspended') {
      message = `⏸️ Authority Suspended

Your ${authority.role_label} authority has been temporarily suspended.

Please contact support for more information.`;
    }

    await axios.post(
      `https://graph.facebook.com/v18.0/${Deno.env.get('WHATSAPP_PHONE_ID')}/messages`,
      {
        messaging_product: 'whatsapp',
        to: authority.user_identifier,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('WHATSAPP_TOKEN')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    await supabase.from('authority_notifications').insert({
      authority_id,
      notification_type,
      delivered: true
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
