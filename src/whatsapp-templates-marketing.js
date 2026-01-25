// WhatsApp Marketing Templates - Meta Approved
// Updated: January 2026 - Aligned with Attribution Service Standards

export const TEMPLATE_CATEGORIES = {
  MARKETING: 'MARKETING',
  AUTHENTICATION: 'AUTHENTICATION'
};

// Marketing-compliant templates matching attribution service
export const MARKETING_TEMPLATES = {
  
  // Standard verified moment (matches buildAttributionBlock)
  VERIFIED_MOMENT: {
    name: 'verified_moment_v2',
    category: TEMPLATE_CATEGORIES.MARKETING,
    language: 'en',
    components: [
      {
        type: 'BODY',
        text: '📢 {{1}} (Verified)\nScope: {{2}}\n📍 Coverage: {{3}}\n🏛️ Affiliation: {{4}}\n{{5}} Trust Level: {{6}}\n\n{{7}}\n\n🌐 View details & respond:\n{{8}}\n\n💬 Replies are received by Unami Foundation Moments App'
      },
      {
        type: 'FOOTER',
        text: 'Reply STOP to unsubscribe'
      }
    ],
    parameters: ['role_label', 'region', 'category', 'organization', 'trust_emoji', 'trust_label', 'content', 'canonical_url']
  },

  // Sponsored moment (matches buildAttributionBlock sponsored)
  SPONSORED_MOMENT: {
    name: 'sponsored_moment_v2',
    category: TEMPLATE_CATEGORIES.MARKETING,
    language: 'en',
    components: [
      {
        type: 'BODY',
        text: '💼 SPONSORED CONTENT\nPresented by: {{1}}\nIn partnership with: {{2}} (Verified)\n\nScope: {{3}}\n📍 Coverage: {{4}}\n🏛️ Sponsor: {{1}}\n🟢 Trust Level: Verified • Sponsored\n\n{{5}}\n\n🌐 View details & respond:\n{{6}}\n\n💼 Sponsored by {{1}}\nLearn more: {{7}}\n\n💬 Replies are received by Unami Foundation Moments App'
      },
      {
        type: 'FOOTER',
        text: 'Reply STOP to unsubscribe'
      }
    ],
    parameters: ['sponsor_name', 'role_label', 'region', 'category', 'content', 'canonical_url', 'sponsor_website']
  },

  // Community moment (no attribution block, footer only)
  COMMUNITY_MOMENT: {
    name: 'community_moment_v2',
    category: TEMPLATE_CATEGORIES.MARKETING,
    language: 'en',
    components: [
      {
        type: 'BODY',
        text: '📢 Community Update\n\n{{1}}\n\n🌐 View details & respond:\n{{2}}\n\n💬 Replies are received by Unami Foundation Moments App'
      },
      {
        type: 'FOOTER',
        text: 'Reply STOP to unsubscribe'
      }
    ],
    parameters: ['content', 'canonical_url']
  }
};

// Template selector - uses attribution service logic
export function selectTemplate(moment, authorityContext, sponsor = null) {
  // Sponsored content
  if (sponsor) {
    return MARKETING_TEMPLATES.SPONSORED_MOMENT;
  }
  
  // Authority or admin content
  if (authorityContext || moment.content_source === 'admin' || moment.content_source === 'campaign') {
    return MARKETING_TEMPLATES.VERIFIED_MOMENT;
  }
  
  // Community content (no attribution block)
  return MARKETING_TEMPLATES.COMMUNITY_MOMENT;
}



// Build template parameters matching attribution service
export async function buildTemplateParams(moment, authorityContext, sponsor = null) {
  const template = selectTemplate(moment, authorityContext, sponsor);
  const slug = moment.slug || `${moment.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 60)}-${moment.id.substring(0, 6)}`;
  const canonicalUrl = `https://moments.unamifoundation.org/moments/${slug}`;
  
  // Map role to attribution service format
  const ROLE_LABELS = {
    admin: 'Administrator',
    campaign: 'Campaign',
    school_principal: 'School Principal',
    school_official: 'School Official',
    community_leader: 'Community Leader',
    community_member: 'Community Member',
    community: 'Community Member',
    partner: 'Partner Organization',
    ngo_representative: 'NGO Representative'
  };
  
  const TRUST_LEVELS = {
    admin: { emoji: '🟢', label: 'Verified • Full Authority' },
    campaign: { emoji: '🟢', label: 'Verified • Campaign' },
    school_principal: { emoji: '🟢', label: 'Verified • Institutional' },
    school_official: { emoji: '🟢', label: 'Verified • Institutional' },
    community_leader: { emoji: '🟡', label: 'Verified • Limited Scope' },
    community_member: { emoji: '🟡', label: 'Community Contribution' },
    community: { emoji: '🟡', label: 'Community Contribution' },
    partner: { emoji: '🟢', label: 'Verified • Partner' },
    ngo_representative: { emoji: '🟢', label: 'Verified • Partner' }
  };
  
  // Determine role from authority or content_source
  let role = moment.content_source || 'admin';
  if (authorityContext?.role_label) {
    role = authorityContext.role_label.toLowerCase().replace(/\s+/g, '_');
  }
  
  const roleLabel = ROLE_LABELS[role] || 'Administrator';
  const trustLevel = TRUST_LEVELS[role] || TRUST_LEVELS.admin;
  const organization = authorityContext?.scope_identifier || 'Unami Foundation Moments App';
  
  switch (template.name) {
    case 'sponsored_moment_v2':
      return [
        sponsor.display_name || sponsor.name,
        roleLabel,
        moment.region || 'National',
        moment.category || 'General',
        moment.content,
        canonicalUrl,
        sponsor.website_url || 'https://moments.unamifoundation.org'
      ];
      
    case 'verified_moment_v2':
      return [
        roleLabel,
        moment.region || 'National',
        moment.category || 'General',
        organization,
        trustLevel.emoji,
        trustLevel.label,
        moment.content,
        canonicalUrl
      ];
      
    case 'community_moment_v2':
      return [
        moment.content,
        canonicalUrl
      ];
      
    default:
      return [];
  }
}

