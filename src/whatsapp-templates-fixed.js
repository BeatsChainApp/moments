// Fixed WhatsApp Marketing Templates - Meta Compliant
// Simplified for auto-deployment

export const FIXED_TEMPLATES = {
  
  // Simple verified moment
  VERIFIED_MOMENT: {
    name: 'verified_moment_v3',
    category: 'MARKETING',
    language: 'en',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Verified Update {{1}}'
      },
      {
        type: 'BODY',
        text: '{{2}}\n\n{{3}}\n\nCategory: {{4}}\nRegion: {{1}}\nFrom: {{5}}\n\nMore info: {{6}}\n\nReply STOP to unsubscribe'
      }
    ]
  },

  // Simple sponsored moment
  SPONSORED_MOMENT: {
    name: 'sponsored_moment_v3',
    category: 'MARKETING',
    language: 'en',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Partner Content {{1}}'
      },
      {
        type: 'BODY',
        text: '{{2}}\n\n{{3}}\n\nCategory: {{4}}\nRegion: {{1}}\nVerified by: {{5}}\nSponsored by: {{6}}\n\nMore info: {{7}}\n\nReply STOP to unsubscribe'
      }
    ]
  },

  // Simple community moment
  COMMUNITY_MOMENT: {
    name: 'community_moment_v3',
    category: 'MARKETING',
    language: 'en',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Community Report {{1}}'
      },
      {
        type: 'BODY',
        text: '{{2}}\n\nShared by community member for awareness.\n\nCategory: {{3}}\nRegion: {{1}}\n\nFull details: {{4}}\n\nReply STOP to unsubscribe'
      }
    ]
  },

  // Simple official announcement
  OFFICIAL_ANNOUNCEMENT: {
    name: 'official_announcement_v3',
    category: 'MARKETING',
    language: 'en',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Official Announcement {{1}}'
      },
      {
        type: 'BODY',
        text: '{{2}}\n\n{{3}}\n\nCategory: {{4}}\nRegion: {{1}}\nIssued by: {{5}}\n\nMore info: {{6}}\n\nReply STOP to unsubscribe'
      }
    ]
  },

  // Welcome message
  WELCOME_SUBSCRIPTION: {
    name: 'welcome_subscription_v3',
    category: 'MARKETING',
    language: 'en',
    components: [
      {
        type: 'BODY',
        text: 'Welcome to Unami Foundation Moments!\n\nYou are subscribed to community updates for {{1}}.\n\nCategories: {{2}}\n\nReply STOP anytime to unsubscribe.\n\nUnami Foundation - Empowering Communities'
      }
    ]
  },

  // Unsubscribe confirmation
  UNSUBSCRIBE_CONFIRM: {
    name: 'unsubscribe_confirm_v3',
    category: 'MARKETING',
    language: 'en',
    components: [
      {
        type: 'BODY',
        text: 'You have been unsubscribed from Unami Foundation Moments.\n\nReply START anytime to resubscribe.\n\nThank you for being part of our community!'
      }
    ]
  }
};