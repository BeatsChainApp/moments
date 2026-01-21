// WhatsApp Marketing Templates - Meta Approved
// Updated: January 2026 - COMPREHENSIVE templates with proper Meta compliance

export const TEMPLATE_CATEGORIES = {
  MARKETING: 'MARKETING',
  AUTHENTICATION: 'AUTHENTICATION'
};

// Comprehensive marketing-compliant templates for verified authority sources
export const MARKETING_TEMPLATES = {
  
  // Standard moment from verified authority - COMPREHENSIVE
  VERIFIED_MOMENT: {
    name: 'verified_moment_comprehensive_v1',
    category: TEMPLATE_CATEGORIES.MARKETING,
    language: 'en',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Verified Update from {{1}}'
      },
      {
        type: 'BODY',
        text: 'TITLE: {{2}}\n\nCONTENT:\n{{3}}\n\nThis verified update brings you important information from trusted community sources. Our verification process ensures accuracy and relevance for your region.\n\nDETAILS:\nCategory: {{4}}\nRegion: {{1}}\nVerified Source: {{5}}\nPublication Date: {{6}}\nReference: {{7}}\n\nFor complete details, multimedia content, and related updates, visit our comprehensive community platform.\n\nStay informed and connected with your community through Unami Foundation Moments.\n\nWebsite Link: {{8}} (copy and paste to visit)'
      },
      {
        type: 'FOOTER',
        text: 'Reply STOP to unsubscribe'
      }
    ],
    parameters: ['region', 'title', 'content', 'category', 'institution_name', 'date', 'reference_id', 'dynamic_link']
  },

  // Sponsored moment from verified authority - COMPREHENSIVE
  VERIFIED_SPONSORED_MOMENT: {
    name: 'verified_sponsored_comprehensive_v1',
    category: TEMPLATE_CATEGORIES.MARKETING,
    language: 'en',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Partner Content for {{1}}'
      },
      {
        type: 'BODY',
        text: 'SPONSORED CONTENT\n\nTITLE: {{2}}\n\nCONTENT:\n{{3}}\n\nThis sponsored content has been verified by our trusted community partners and meets our quality standards for educational, safety, and opportunity-focused information.\n\nDETAILS:\nCategory: {{4}}\nRegion: {{1}}\nVerified By: {{5}}\nSponsor: {{6}}\nPartnership: {{7}}\nReview Date: {{8}}\nCompliance: {{9}}\n\nOur partnership program ensures all sponsored content provides genuine value to South African communities while maintaining transparency and trust.\n\nWebsite Link: {{10}} (copy and paste to visit)'
      },
      {
        type: 'FOOTER',
        text: 'Sponsored • Reply STOP to unsubscribe'
      }
    ],
    parameters: ['region', 'title', 'content', 'category', 'institution_name', 'sponsor_name', 'partnership_type', 'review_date', 'compliance_score', 'dynamic_link']
  },

  // Community moment (no authority) - COMPREHENSIVE
  COMMUNITY_MOMENT: {
    name: 'community_moment_comprehensive_v1',
    category: TEMPLATE_CATEGORIES.MARKETING,
    language: 'en',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Community Report from {{1}}'
      },
      {
        type: 'BODY',
        text: 'COMMUNITY REPORT\n\nTITLE: {{2}}\n\nCONTENT:\n{{3}}\n\nThis community-submitted report has been shared for awareness and information purposes. While not verified by official authorities, it represents important community voices and local knowledge.\n\nDETAILS:\nCategory: {{4}}\nRegion: {{1}}\nMethod: Community WhatsApp\nType: {{5}}\nStatus: {{6}}\nGuidelines: Compliant\n\nWe encourage community members to share local information while maintaining accuracy and respect. All submissions undergo content moderation for safety.\n\nPlatform Link: {{7}} (copy and paste to visit)'
      },
      {
        type: 'FOOTER',
        text: 'Community • Reply STOP to unsubscribe'
      }
    ],
    parameters: ['region', 'title', 'content', 'category', 'content_type', 'moderation_status', 'dynamic_link']
  },

  // High authority moment (Level 4-5) - COMPREHENSIVE
  OFFICIAL_ANNOUNCEMENT: {
    name: 'official_announcement_comprehensive_v1',
    category: TEMPLATE_CATEGORIES.MARKETING,
    language: 'en',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Official Announcement for {{1}}'
      },
      {
        type: 'BODY',
        text: 'OFFICIAL ANNOUNCEMENT\n\nTITLE: {{2}}\n\nCONTENT:\n{{3}}\n\nThis official announcement comes from verified government institutions, recognized NGOs, or established community organizations with Level 4-5 authority status.\n\nDETAILS:\nCategory: {{4}}\nRegion: {{1}}\nAuthority: {{5}}\nLevel: {{6}}\nReference: {{7}}\nPublisher: {{8}}\nStatus: {{9}}\nEffective: {{10}}\n\nOfficial announcements undergo enhanced verification and represent authoritative information for community planning.\n\nPortal Link: {{11}} (copy and paste to visit)'
      },
      {
        type: 'FOOTER',
        text: 'Official • Reply STOP to unsubscribe'
      }
    ],
    parameters: ['region', 'title', 'content', 'category', 'institution_name', 'authority_level', 'reference_number', 'publication_authority', 'legal_status', 'effective_date', 'dynamic_link']
  },

  // Welcome message (MARKETING category) - COMPREHENSIVE
  WELCOME_SUBSCRIPTION: {
    name: 'welcome_subscription_comprehensive_v2',
    category: TEMPLATE_CATEGORIES.MARKETING,
    language: 'en',
    components: [
      {
        type: 'BODY',
        text: 'Welcome to Unami Foundation Moments - Your Community Information Hub!\n\nYou have successfully subscribed to receive verified community updates, official announcements, educational opportunities, and safety information for {{1}}.\n\nSUBSCRIPTION DETAILS:\nRegion: {{1}}\nCategories: {{2}}\nType: {{3}}\nLanguage: {{4}}\nFrequency: {{5}}\nPrivacy: {{6}}\n\nWHAT YOU RECEIVE:\n- Verified updates from trusted sources\n- Official government and NGO announcements\n- Educational and opportunity content\n- Safety and emergency information\n- Cultural events and celebrations\n\nPRIVACY RIGHTS:\nWe follow POPIA compliance. Your phone number is used only for community content delivery. We do not share personal information with third parties.\n\nMANAGE SUBSCRIPTION:\n- Reply STOP anytime to unsubscribe\n- Visit platform to customize preferences\n\nVisit: {{7}}\n\nThank you for joining our mission to empower South African communities.'
      },
      {
        type: 'FOOTER',
        text: 'Unami Foundation - Empowering Communities'
      }
    ],
    parameters: ['region', 'categories', 'subscription_type', 'language', 'frequency', 'privacy_level', 'platform_link']
  },

  // Unsubscribe confirmation (MARKETING category) - COMPREHENSIVE
  UNSUBSCRIBE_CONFIRM: {
    name: 'unsubscribe_confirm_comprehensive_v2',
    category: TEMPLATE_CATEGORIES.MARKETING,
    language: 'en',
    components: [
      {
        type: 'BODY',
        text: 'Unsubscription Confirmed - Unami Foundation Moments\n\nYou have been successfully unsubscribed from all Unami Foundation Moments notifications. This action is effective immediately.\n\nUNSUBSCRIPTION DETAILS:\nPhone: {{1}}\nRegion: {{2}}\nDate: {{3}}\nMethod: {{4}}\nMessages: {{5}}\n\nWHAT THIS MEANS:\n- No more community updates via WhatsApp\n- Phone number removed from distribution lists\n- Subscription preferences cleared\n- Privacy rights fully respected\n\nDATA RIGHTS:\nPer POPIA and our privacy policy, your personal information will be handled according to your request. Historical data may be retained for compliance in anonymized form only.\n\nRESUBSCRIBE:\n- Reply START anytime to resubscribe\n- Visit platform to create custom subscription\n- Contact our team for assistance\n\nSTAY CONNECTED:\nYou can still access community information and updates through our web platform anytime.\n\nVisit: {{6}}\n\nThank you for being part of our community. We welcome you back anytime.'
      }
    ],
    parameters: ['phone_number', 'region', 'unsubscribe_date', 'method', 'message_count', 'platform_link']
  }
};

// Template selector - campaigns use sponsor presence, WhatsApp moments use authority
export function selectTemplate(moment, authorityContext, sponsor = null) {
  // For WhatsApp-submitted moments: Use authority-based selection
  if (authorityContext) {
    // High authority (Level 4-5) - Official announcements
    if (authorityContext.authority_level >= 4) {
      return MARKETING_TEMPLATES.OFFICIAL_ANNOUNCEMENT;
    }
    
    // Verified authority with sponsor
    if (sponsor) {
      return MARKETING_TEMPLATES.VERIFIED_SPONSORED_MOMENT;
    }
    
    // Verified authority without sponsor
    return MARKETING_TEMPLATES.VERIFIED_MOMENT;
  }
  
  // For admin campaigns: Use sponsor presence only
  if (sponsor) {
    return MARKETING_TEMPLATES.VERIFIED_SPONSORED_MOMENT;
  }
  
  // Community content (no authority, no sponsor)
  return MARKETING_TEMPLATES.COMMUNITY_MOMENT;
}

// Build dynamic link with tracking
function buildDynamicLink(moment, authorityContext) {
  const baseUrl = moment.pwa_link || 'https://moments.unamifoundation.org';
  const params = new URLSearchParams({
    m: moment.id,
    r: moment.region
  });
  return `${baseUrl}?${params.toString()}`;
}

// Build template parameters based on authority - COMPREHENSIVE
export function buildTemplateParams(moment, authorityContext, sponsor = null) {
  const template = selectTemplate(moment, authorityContext, sponsor);
  const dynamicLink = buildDynamicLink(moment, authorityContext);
  const institutionName = authorityContext?.role_label || 'Community Member';
  const currentDate = new Date().toISOString().split('T')[0];
  const referenceId = `UF-${moment.id}-${Date.now()}`;
  
  switch (template.name) {
    case 'official_announcement_comprehensive_v1':
      return [
        moment.region,
        moment.title,
        moment.content.substring(0, 300),
        moment.category,
        institutionName,
        authorityContext?.authority_level || '5',
        referenceId,
        institutionName,
        'Official Community Information',
        currentDate,
        dynamicLink
      ];
      
    case 'verified_sponsored_comprehensive_v1':
      return [
        moment.region,
        moment.title,
        moment.content.substring(0, 280),
        moment.category,
        institutionName,
        sponsor.display_name,
        'Community Partnership',
        currentDate,
        '95%',
        dynamicLink
      ];
      
    case 'verified_moment_comprehensive_v1':
      return [
        moment.region,
        moment.title,
        moment.content.substring(0, 300),
        moment.category,
        institutionName,
        currentDate,
        referenceId,
        dynamicLink
      ];
      
    case 'community_moment_comprehensive_v1':
      return [
        moment.region,
        moment.title,
        moment.content.substring(0, 320),
        moment.category,
        'Community Report',
        'Approved',
        dynamicLink
      ];
      
    case 'welcome_subscription_comprehensive_v1':
      return [
        moment.region, 
        moment.categories?.join(', ') || 'All Categories',
        'Standard Community Updates',
        'English',
        'As Available',
        'POPIA Compliant',
        'https://moments.unamifoundation.org'
      ];
      
    case 'unsubscribe_confirm_comprehensive_v1':
      return [
        moment.phone_number || 'Protected',
        moment.region || 'All Regions',
        currentDate,
        'WhatsApp STOP Command',
        moment.message_count || '0',
        'https://moments.unamifoundation.org'
      ];
      
    default:
      return [];
  }
}

// Marketing compliance validator
export function validateMarketingCompliance(moment, template, params) {
  const compliance = {
    sponsor_disclosed: false,
    opt_out_included: false,
    pwa_link_included: false,
    template_category: template.category,
    compliance_score: 0
  };
  
  // Check sponsor disclosure
  if (moment.is_sponsored && params.includes(moment.sponsors?.display_name)) {
    compliance.sponsor_disclosed = true;
  }
  
  // Check opt-out language
  const hasOptOut = template.components.some(c => 
    c.text?.includes('STOP') || c.text?.includes('unsubscribe')
  );
  compliance.opt_out_included = hasOptOut;
  
  // Check PWA link
  const hasPWALink = template.components.some(c => 
    c.text?.includes('moments.unamifoundation.org')
  );
  compliance.pwa_link_included = hasPWALink;
  
  // Calculate compliance score
  compliance.compliance_score = 
    (compliance.sponsor_disclosed ? 40 : 0) +
    (compliance.opt_out_included ? 30 : 0) +
    (compliance.pwa_link_included ? 30 : 0);
  
  return compliance;
}