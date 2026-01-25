// WhatsApp Marketing Templates - Meta Approved
// Two-message pattern: Generic template + Full attributed moment

export const TEMPLATE_CATEGORIES = {
  MARKETING: 'MARKETING',
  AUTHENTICATION: 'AUTHENTICATION'
};

// Generic marketing template (Meta-safe, no authority claims)
export const MARKETING_TEMPLATES = {
  
  // Single generic template for all moments
  MOMENT_NOTIFICATION: {
    name: 'moment_notification',
    category: TEMPLATE_CATEGORIES.MARKETING,
    language: 'en',
    components: [
      {
        type: 'BODY',
        text: 'You have a new update from Unami Foundation Moments.\n\nThis message contains information shared by a verified community contributor.'
      },
      {
        type: 'FOOTER',
        text: 'Reply STOP to unsubscribe'
      }
    ],
    parameters: []
  }
};

// Template selector - always use generic shell
export function selectTemplate(moment, authorityContext, sponsor = null) {
  return MARKETING_TEMPLATES.MOMENT_NOTIFICATION;
}

// Build template parameters (none needed for generic shell)
export async function buildTemplateParams(moment, authorityContext, sponsor = null) {
  return []; // Generic template has no variables
}