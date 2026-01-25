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
        
        // Remove attribution blocks that shouldn't be in content\n        if (content.includes('📢') && content.includes('Verified by Unami Foundation')) {\n          console.log('  ❌ Found attribution block in content');\n          needsCleaning = true;\n          \n          // Extract just the actual message content\n          const lines = content.split('\\n');\n          let actualContentStart = -1;\n          let actualContentEnd = lines.length;\n          \n          // Find where actual content starts (after attribution block)\n          for (let i = 0; i < lines.length; i++) {\n            const line = lines[i].trim();\n            if (line && \n                !line.includes('📢') && \n                !line.includes('Verified by') && \n                !line.includes('Scope:') && \n                !line.includes('📍 Coverage:') && \n                !line.includes('🏛️ Affiliation:') && \n                !line.includes('🟢 Trust Level:') && \n                !line.includes('🟡 Trust Level:')) {\n              actualContentStart = i;\n              break;\n            }\n          }\n          \n          // Find where actual content ends (before footer)\n          for (let i = lines.length - 1; i >= 0; i--) {\n            const line = lines[i].trim();\n            if (line.includes('🌐 More:') || \n                line.includes('💬 Replies are received') ||\n                line.includes('View details & respond')) {\n              actualContentEnd = i;\n              break;\n            }\n          }\n          \n          if (actualContentStart >= 0 && actualContentStart < actualContentEnd) {\n            // Extract clean content\n            const cleanLines = lines.slice(actualContentStart, actualContentEnd);\n            content = cleanLines.join('\\n').trim();\n            \n            // Remove any remaining duplicates\n            const contentLines = content.split('\\n');\n            const uniqueLines = [];\n            const seen = new Set();\n            \n            for (const line of contentLines) {\n              const trimmed = line.trim();\n              if (trimmed && !seen.has(trimmed)) {\n                uniqueLines.push(line);\n                seen.add(trimmed);\n              } else if (!trimmed) {\n                uniqueLines.push(line); // Keep empty lines for formatting\n              }\n            }\n            \n            content = uniqueLines.join('\\n').trim();\n          }\n        }\n        \n        // Remove footer URLs that shouldn't be in content\n        if (content.includes('🌐 More:') || content.includes('View details & respond')) {\n          console.log('  ❌ Found footer in content');\n          needsCleaning = true;\n          \n          content = content\n            .replace(/🌐 More:.*$/gm, '')\n            .replace(/🌐 View details & respond:.*$/gm, '')\n            .replace(/💬 Replies are received.*$/gm, '')\n            .replace(/Learn more:.*$/gm, '')\n            .trim();\n        }\n        \n        // Clean up extra whitespace and duplicates\n        content = content\n          .replace(/\\n\\s*\\n\\s*\\n/g, '\\n\\n') // Remove triple+ newlines\n          .replace(/^\\s+|\\s+$/g, '') // Trim\n          .replace(/\\n{3,}/g, '\\n\\n'); // Max 2 consecutive newlines\n        \n        if (needsCleaning && content !== moment.content) {\n          console.log('  ✅ Cleaning content');\n          console.log('  📝 Original length:', moment.content.length);\n          console.log('  📝 Cleaned length:', content.length);\n          \n          // Update the moment with clean content\n          const { error: updateError } = await supabase\n            .from('moments')\n            .update({ content })\n            .eq('id', moment.id);\n          \n          if (updateError) {\n            console.error(`  ❌ Failed to update moment ${moment.id}:`, updateError.message);\n          } else {\n            console.log('  ✅ Updated successfully');\n            cleanedCount++;\n          }\n        } else {\n          console.log('  ✅ Content is clean');\n        }\n        \n      } catch (error) {\n        console.error(`❌ Error processing moment ${moment.id}:`, error.message);\n      }\n    }\n    \n    console.log(`\\n🎉 Cleaned ${cleanedCount} moments`);\n    console.log('✨ Content cleanup complete!');\n    \n  } catch (error) {\n    console.error('💥 Cleanup script error:', error.message);\n    process.exit(1);\n  }\n}\n\n// Run the cleanup\ncleanMomentContent().then(() => {\n  console.log('🏁 Cleanup finished');\n  process.exit(0);\n}).catch(error => {\n  console.error('💥 Cleanup failed:', error.message);\n  process.exit(1);\n});