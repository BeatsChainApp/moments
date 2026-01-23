import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import axios from 'https://esm.sh/axios@1.6.0';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: expiring, error } = await supabase.rpc('check_expiring_authorities');
    
    if (error) throw error;

    console.log(`Found ${expiring?.length || 0} expiring authorities`);

    for (const authority of expiring || []) {
      await sendExpiryWarning(
        authority.phone_number,
        authority.role_label,
        authority.days_left
      );
      
      await supabase.from('authority_notifications').insert({
        authority_id: authority.authority_id,
        notification_type: 'expiry_warning',
        days_until_expiry: authority.days_left,
        delivered: true
      });
    }

    return new Response(
      JSON.stringify({ success: true, notified: expiring?.length || 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Expiry check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function sendExpiryWarning(phoneNumber, roleLabel, daysLeft) {
  const urgency = daysLeft <= 1 ? '🔴' : daysLeft <= 3 ? '🟠' : '🟡';
  
  const message = `${urgency} Authority Expiring Soon!

Your ${roleLabel} authority expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.

Contact your admin to extend your authority.`;

  await axios.post(
    `https://graph.facebook.com/v18.0/${Deno.env.get('WHATSAPP_PHONE_ID')}/messages`,
    {
      messaging_product: 'whatsapp',
      to: phoneNumber,
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
}
