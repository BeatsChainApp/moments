// Attribution Service - System-generated trust signals for Moments
// Implements governance standards for role-based attribution

const TRUST_LEVELS = {
  admin: { emoji: '🟢', label: 'Verified • Full Authority' },
  school: { emoji: '🟢', label: 'Verified • Institutional' },
  principal: { emoji: '🟢', label: 'Verified • Institutional' },
  community_leader: { emoji: '🟡', label: 'Verified • Limited Scope' },
  partner: { emoji: '🟢', label: 'Verified • Partner' },
  ngo: { emoji: '🟢', label: 'Verified • Partner' },
  general: null
};

const ROLE_LABELS = {
  admin: 'Administrator',
  school: 'School Official',
  principal: 'School Principal',
  community_leader: 'Community Leader',
  partner: 'Partner Organization',
  ngo: 'NGO Representative',
  general: 'Community Member'
};

export function buildAttributionBlock(moment, userProfile, sponsor = null) {
  if (sponsor) {
    return `💼 SPONSORED CONTENT
Presented by: ${sponsor.name || sponsor.display_name}
In partnership with: ${ROLE_LABELS[userProfile.role] || 'Community Member'} (Verified)

Scope: ${moment.region || 'National'}
📍 Coverage: ${moment.category || 'General'}
🏛️ Sponsor: ${sponsor.name || sponsor.display_name}
🟢 Trust Level: Verified • Sponsored

`;
  }
  
  const role = userProfile.role || 'general';
  const trustLevel = TRUST_LEVELS[role];
  if (!trustLevel) return '';
  
  return `📢 ${ROLE_LABELS[role]} (Verified)
Scope: ${moment.region || 'National'}
📍 Coverage: ${moment.category || 'General'}
🏛️ Affiliation: ${userProfile.organization || 'Unami Foundation Moments App'}
${trustLevel.emoji} Trust Level: ${trustLevel.label}

`;
}

export function buildFooter(canonicalUrl, sponsor = null) {
  let footer = `\n\n🌐 View details & respond:\n${canonicalUrl}\n\n`;
  
  if (sponsor) {
    footer += `💼 Sponsored by ${sponsor.name || sponsor.display_name}\n`;
    if (sponsor.website) footer += `Learn more: ${sponsor.website}\n\n`;
  }
  
  footer += `💬 Replies are received by Unami Foundation Moments App`;
  return footer;
}

export function generateAttributionMetadata(userProfile, sponsor = null) {
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
    sponsor_website: sponsor?.website || null,
    generated_at: new Date().toISOString()
  };
}
