#!/usr/bin/env node

// Clean up corrupted moment content that has attribution blocks mixed in
import { supabase } from './config/supabase.js';

async function cleanMomentContent() {
  try {
    console.log('🧹 Cleaning corrupted moment content...\n');
    
    // Get all moments that might have corrupted content
    const { data: moments, error } = await supabase
      .from('moments')
      .select('id, title, content')
      .or('content.like.*📢*,content.like.*🌐 More:*,content.like.*Verified by Unami Foundation*');
    
    if (error) {
      console.error('❌ Error fetching moments:', error.message);
      return;
    }
    
    console.log(`📊 Found ${moments?.length || 0} potentially corrupted moments`);
    
    let cleanedCount = 0;
    
    for (const moment of moments || []) {
      try {
        console.log(`\n🔍 Checking: "${moment.title.substring(0, 50)}..."`);
        
        let content = moment.content;
        let needsCleaning = false;
        
        // Remove attribution blocks that shouldn't be in content
        if (content.includes('📢') && content.includes('Verified by Unami Foundation')) {
          console.log('  ❌ Found attribution block in content');
          needsCleaning = true;
          
          // Extract just the actual message content
          const lines = content.split('\n');
          let actualContentStart = -1;
          let actualContentEnd = lines.length;
          
          // Find where actual content starts (after attribution block)
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && 
                !line.includes('📢') && 
                !line.includes('Verified by') && 
                !line.includes('Scope:') && 
                !line.includes('📍 Coverage:') && 
                !line.includes('🏛️ Affiliation:') && 
                !line.includes('🟢 Trust Level:') && 
                !line.includes('🟡 Trust Level:')) {
              actualContentStart = i;
              break;
            }
          }
          
          // Find where actual content ends (before footer)
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.includes('🌐 More:') || 
                line.includes('💬 Replies are received') ||
                line.includes('View details & respond')) {
              actualContentEnd = i;
              break;
            }
          }
          
          if (actualContentStart >= 0 && actualContentStart < actualContentEnd) {
            // Extract clean content
            const cleanLines = lines.slice(actualContentStart, actualContentEnd);
            content = cleanLines.join('\n').trim();
            
            // Remove any remaining duplicates
            const contentLines = content.split('\n');
            const uniqueLines = [];
            const seen = new Set();
            
            for (const line of contentLines) {
              const trimmed = line.trim();
              if (trimmed && !seen.has(trimmed)) {
                uniqueLines.push(line);
                seen.add(trimmed);
              } else if (!trimmed) {
                uniqueLines.push(line); // Keep empty lines for formatting
              }
            }
            
            content = uniqueLines.join('\n').trim();
          }
        }
        
        // Remove footer URLs that shouldn't be in content
        if (content.includes('🌐 More:') || content.includes('View details & respond')) {
          console.log('  ❌ Found footer in content');
          needsCleaning = true;
          
          content = content
            .replace(/🌐 More:.*$/gm, '')
            .replace(/🌐 View details & respond:.*$/gm, '')
            .replace(/💬 Replies are received.*$/gm, '')
            .replace(/Learn more:.*$/gm, '')
            .trim();
        }
        
        // Clean up extra whitespace and duplicates
        content = content
          .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove triple+ newlines
          .replace(/^\s+|\s+$/g, '') // Trim
          .replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
        
        if (needsCleaning && content !== moment.content) {
          console.log('  ✅ Cleaning content');
          console.log('  📝 Original length:', moment.content.length);
          console.log('  📝 Cleaned length:', content.length);
          
          // Update the moment with clean content
          const { error: updateError } = await supabase
            .from('moments')
            .update({ content })
            .eq('id', moment.id);
          
          if (updateError) {
            console.error(`  ❌ Failed to update moment ${moment.id}:`, updateError.message);
          } else {
            console.log('  ✅ Updated successfully');
            cleanedCount++;
          }
        } else {
          console.log('  ✅ Content is clean');
        }
        
      } catch (error) {
        console.error(`❌ Error processing moment ${moment.id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Cleaned ${cleanedCount} moments`);
    console.log('✨ Content cleanup complete!');
    
  } catch (error) {
    console.error('💥 Cleanup script error:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanMomentContent().then(() => {
  console.log('🏁 Cleanup finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Cleanup failed:', error.message);
  process.exit(1);
});