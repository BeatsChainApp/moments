import { supabase } from '../config/supabase.js';
import axios from 'axios';

export async function notifyAuthorityGranted(phoneNumber, authorityProfile) {
  const message = `✅ Authority Verified!

You've been verified as ${authorityProfile.role_label}

📊 Authority Level: ${authorityProfile.authority_level}
👥 Max Recipients: ${authorityProfile.blast_radius.toLocaleString()}
📍 Scope: ${authorityProfile.scope_identifier || 'N/A'}
🌍 Region: ${authorityProfile.region || 'National'}
⏰ Valid Until: ${new Date(authorityProfile.valid_until).toLocaleDateString()}

You can now broadcast messages to your community.

📱 Send messages here to broadcast
❓ Reply HELP for commands`;

  await sendWhatsAppMessage(phoneNumber, message);
  await logNotification(authorityProfile.id, 'granted');
}

export async function notifyAuthorityExtended(phoneNumber, authorityProfile, daysAdded) {
  const message = `🔄 Authority Extended!

Your ${authorityProfile.role_label} authority has been extended by ${daysAdded} days.

⏰ New Expiry: ${new Date(authorityProfile.valid_until).toLocaleDateString()}

Continue broadcasting to your community!`;

  await sendWhatsAppMessage(phoneNumber, message);
  await logNotification(authorityProfile.id, 'extended');
}

export async function notifyAuthoritySuspended(phoneNumber, authorityProfile) {
  const message = `⏸️ Authority Suspended

Your ${authorityProfile.role_label} authority has been temporarily suspended.

Please contact support for more information.`;

  await sendWhatsAppMessage(phoneNumber, message);
  await logNotification(authorityProfile.id, 'suspended');
}

export async function notifyAuthorityRevoked(phoneNumber, authorityProfile) {
  const message = `❌ Authority Revoked

Your ${authorityProfile.role_label} authority has been removed.

Thank you for your service to the community.`;

  await sendWhatsAppMessage(phoneNumber, message);
  await logNotification(authorityProfile.id, 'revoked');
}

export async function notifyExpiryWarning(phoneNumber, authorityProfile, daysLeft) {
  const urgency = daysLeft <= 1 ? '🔴' : daysLeft <= 3 ? '🟠' : '🟡';
  
  const message = `${urgency} Authority Expiring Soon!

Your ${authorityProfile.role_label} authority expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.

⏰ Expiry Date: ${new Date(authorityProfile.valid_until).toLocaleDateString()}

Contact your admin to extend your authority.`;

  await sendWhatsAppMessage(phoneNumber, message);
  await logNotification(authorityProfile.id, 'expiry_warning', daysLeft);
}

async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`Authority notification sent to ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('WhatsApp send error:', error.response?.data || error.message);
    return false;
  }
}

async function logNotification(authorityId, notificationType, daysUntilExpiry = null) {
  await supabase.from('authority_notifications').insert({
    authority_id: authorityId,
    notification_type: notificationType,
    days_until_expiry: daysUntilExpiry,
    delivered: true
  });
}
