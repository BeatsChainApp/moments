// Broadcast Composition Service - Standardized message formatting
// Integrates attribution, content, and footer per governance standards

import { supabase } from '../config/supabase.js';
import { buildAttributionBlock, buildFooter, generateAttributionMetadata } from './attribution.js';

/**
 * Compose complete Moment message with attribution and footer
 * @param {string} momentId - Moment UUID
 * @returns {Promise<string>} Formatted message ready for broadcast
 */
export async function composeMomentMessage(momentId) {
  try {
    const { data: moment, error } = await supabase
      .from('moments')
      .select(`
        *,
        creator:created_by(role, organization),
        sponsor:sponsor_id(name, display_name, website)
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
    
    // Provide default creator if missing
    const creator = moment.creator || { role: 'admin', organization: 'Unami Foundation Moments App' };
    const sponsor = moment.sponsor || null;
    
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
