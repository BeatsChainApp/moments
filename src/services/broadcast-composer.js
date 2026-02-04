// Broadcast Composition Service - Standardized message formatting
// Integrates attribution, content, and footer per governance standards

import { supabase } from '../../config/supabase.js';
import { buildAttributionBlock, buildFooter, generateAttributionMetadata } from './attribution.js';

/**
 * Compose complete Moment message with attribution and footer
 * @param {string} momentId - Moment UUID
 * @returns {Promise<string>} Formatted message ready for broadcast
 */
export async function composeMomentMessage(momentId) {
  try {
    // Fetch moment with sponsor join only (created_by is not a foreign key)
    const { data: moment, error } = await supabase
      .from('moments')
      .select(`
        *,
        sponsors!sponsor_id(name, display_name, website_url)
      `)
      .eq('id', momentId)
      .single();
    
    if (error) {
      console.error('Database error fetching moment:', error);
      throw new Error(`Failed to fetch moment: ${error.message}`);
    }
    
    if (!moment) {
      throw new Error('Moment not found');
    }
    
    // Validate content exists
    if (!moment.content || moment.content.trim() === '') {
      throw new Error('Moment has no content');
    }
    
    // Ensure slug exists
    if (!moment.slug) {
      const slug = generateSlug(moment.title, moment.id);
      await supabase.from('moments').update({ slug }).eq('id', momentId);
      moment.slug = slug;
    }
    
    // Lookup authority profile for creator
    let creator = {
      role: moment.content_source || 'admin',
      organization: 'Unami Foundation Moments App',
      identifier: moment.created_by
    };
    
    // Priority 1: Use stored authority_context if available
    if (moment.authority_context) {
      creator = {
        role: moment.authority_context.role || moment.content_source || 'community_member',
        organization: moment.authority_context.scope_identifier || 'Unami Foundation Moments App',
        authority_level: moment.authority_context.level,
        scope: moment.authority_context.scope,
        identifier: moment.created_by
      };
      console.log(`Using stored authority_context: role=${creator.role}, org=${creator.organization}`);
    }
    // Priority 2: If created_by is a phone number, lookup authority
    else if (moment.created_by && moment.created_by.startsWith('+')) {
      try {
        const { data: authority } = await supabase.rpc('lookup_authority', {
          p_user_identifier: moment.created_by
        });
        
        if (authority && authority.length > 0) {
          const auth = authority[0];
          creator = {
            role: auth.role_label.toLowerCase().replace(/\s+/g, '_'),
            authority_level: auth.authority_level,
            scope: auth.scope,
            organization: auth.scope_identifier || 'Unami Foundation Moments App',
            identifier: moment.created_by
          };
          console.log(`Looked up authority: role=${creator.role}, org=${creator.organization}`);
        }
      } catch (authError) {
        console.warn('Authority lookup failed:', authError);
      }
    }
    // Priority 3: Parse created_by for role hints (legacy support)
    else {
      // For non-phone identifiers, check created_by for role hints first
      const createdByLower = (moment.created_by || '').toLowerCase();
      
      if (createdByLower.includes('community leader')) {
        creator.role = 'community_leader';
      } else if (createdByLower.includes('principal')) {
        creator.role = 'school_principal';
      } else if (createdByLower.includes('admin')) {
        creator.role = 'admin';
      } else {
        // Fall back to content source mapping
        const contentSourceRoleMap = {
          'admin': 'admin',
          'campaign': 'campaign', 
          'community': 'community_member',
          'whatsapp': 'community_member',
          'partner': 'partner',
          'ngo': 'ngo_representative'
        };
        
        if (contentSourceRoleMap[moment.content_source]) {
          creator.role = contentSourceRoleMap[moment.content_source];
        }
      }
    }
    
    // Get sponsor from join result
    const sponsor = moment.sponsors || null;
    
    // Generate and store attribution metadata
    try {
      const attributionMetadata = generateAttributionMetadata(creator, sponsor);
      await supabase
        .from('moments')
        .update({ attribution_data: attributionMetadata })
        .eq('id', momentId);
    } catch (attrError) {
      console.warn('Failed to store attribution metadata:', attrError);
      // Continue anyway - this is not critical
    }
    
    // Build message components
    const attribution = buildAttributionBlock(moment, creator, sponsor);
    const content = moment.content.trim();
    const canonicalUrl = `https://moments.unamifoundation.org/moments/${moment.slug}`;
    const footer = buildFooter(canonicalUrl, sponsor);
    
    // Compose final message
    const composedMessage = attribution + '\n\n' + content + '\n\n' + footer;
    
    if (!composedMessage || composedMessage.trim() === '') {
      throw new Error('Composed message is empty');
    }
    
    return composedMessage;
  } catch (error) {
    console.error('composeMomentMessage error:', error);
    throw error;
  }
}

/**
 * Generate slug from title and ID
 * @param {string} title - Moment title
 * @param {string} id - Moment UUID
 * @returns {string} Kebab-case slug with hash
 */
function generateSlug(title, id) {
  let slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
  
  slug += '-' + id.substring(0, 6);
  return slug;
}
