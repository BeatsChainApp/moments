// Attribution Service - System-generated trust signals for Moments
// Implements governance standards for role-based attribution

const TRUST_LEVELS = {
  admin: { emoji: '🟢', label: 'Verified • Full Authority' },
  campaign: { emoji: '🟢', label: 'Verified • Campaign' },
  school_principal: { emoji: '🟢', label: 'Verified • Institutional' },
  school_official: { emoji: '🟢', label: 'Verified • Institutional' },
  community_leader: { emoji: '🟡', label: 'Verified • Limited Scope' },
  community_member: { emoji: '🟡', label: 'Community Contribution' },
  community: { emoji: '🟡', label: 'Community Contribution' },
  partner: { emoji: '🟢', label: 'Verified • Partner' },
  ngo_representative: { emoji: '🟢', label: 'Verified • Partner' },
  general: null
};

const ROLE_LABELS = {
  admin: 'Administrator',
  campaign: 'Campaign',
  school_principal: 'School Principal',
  school_official: 'School Official',
  community_leader: 'Community Leader',
  community_member: 'Community Member',
  community: 'Community Member',
  partner: 'Partner Organization',
  ngo_representative: 'NGO Representative',
  general: 'Community Member'
};

export function buildAttributionBlock(moment, userProfile, sponsor = null) {
  // Validate inputs
  if (!moment) {
    console.warn('buildAttributionBlock: moment is null/undefined');
    return '';
  }
  
  if (!userProfile) {
    console.warn('buildAttributionBlock: userProfile is null/undefined, using default');
    userProfile = { role: 'admin', organization: 'Unami Foundation Moments App' };
  }
  
  if (sponsor) {
    const sponsorName = sponsor.name || sponsor.display_name || 'Unknown Sponsor';
    const roleLabel = ROLE_LABELS[userProfile.role] || 'Community Member';
    return `💼 SPONSORED CONTENT
Presented by: ${sponsorName}
In partnership with: ${roleLabel} (Verified)

Scope: ${moment.region || 'National'}
📍 Coverage: ${moment.category || 'General'}
🏛️ Sponsor: ${sponsorName}
🟢 Trust Level: Verified • Sponsored

`;
  }
  
  const role = userProfile.role || 'general';
  const trustLevel = TRUST_LEVELS[role];
  
  // For roles without trust levels (like 'general'), don't show attribution block
  if (!trustLevel) {
    console.log(`No attribution block for role: ${role}`);
    return '';
  }
  
  return `📢 ${ROLE_LABELS[role]} (Verified)
Scope: ${moment.region || 'National'}
📍 Coverage: ${moment.category || 'General'}
🏛️ Affiliation: ${userProfile.organization || 'Unami Foundation Moments App'}
${trustLevel.emoji} Trust Level: ${trustLevel.label}

`;
}

export function buildFooter(canonicalUrl, sponsor = null) {
  if (!canonicalUrl) {
    console.warn('buildFooter: canonicalUrl is missing');
    canonicalUrl = 'https://moments.unamifoundation.org';
  }
  
  let footer = `\n\n🌐 View details & respond:\n${canonicalUrl}\n\n`;
  
  if (sponsor) {
    const sponsorName = sponsor.name || sponsor.display_name || 'Unknown Sponsor';
    footer += `💼 Sponsored by ${sponsorName}\n`;
    if (sponsor.website_url) footer += `Learn more: ${sponsor.website_url}\n\n`;
  }
  
  footer += `💬 Replies are received by Unami Foundation Moments App`;
  return footer;
}

export function generateAttributionMetadata(userProfile, sponsor = null) {
  if (!userProfile) {
    console.warn('generateAttributionMetadata: userProfile is null/undefined, using defaults');
    userProfile = { role: 'admin', organization: 'Unami Foundation Moments App' };
  }
  
  const role = userProfile.role || 'general';
  const trustLevel = TRUST_LEVELS[role];
  
  return {
    role,
    role_label: ROLE_LABELS[role],
    trust_level: trustLevel?.label || null,
    trust_emoji: trustLevel?.emoji || null,
    affiliation: userProfile.organization || 'Unami Foundation Moments App',
    is_sponsored: !!sponsor,
    sponsor_name: sponsor?.name || sponsor?.display_name || null,
    sponsor_website: sponsor?.website_url || null,
    generated_at: new Date().toISOString()
  };
}
