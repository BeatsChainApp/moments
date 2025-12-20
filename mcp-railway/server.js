import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { franc } from 'franc';

const app = express();
const PORT = process.env.PORT || process.env.RAILWAY_PORT || 3001;

// Only create Supabase client if credentials exist
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', supabase: !!supabase });
});

app.post('/advisory', async (req, res) => {
  const { message, language, media_type, from_number, timestamp } = req.body;
  
  const advisory = {
    language_confidence: detectLanguageConfidence(message, language),
    urgency_level: detectUrgency(message, media_type),
    harm_signals: detectHarm(message, media_type),
    spam_indicators: detectSpam(message, from_number),
    escalation_suggested: false,
    notes: 'Advisory processed'
  };
  
  advisory.escalation_suggested = advisory.harm_signals.confidence > 0.8 || 
                                  advisory.urgency_level === 'high';
  
  res.json(advisory);
});

const detectLanguageConfidence = (text, detectedLang) => {
  if (!text || text.length < 10) return 0.1;
  const reDetected = franc(text);
  return reDetected === detectedLang ? 0.8 : 0.5;
};

const detectUrgency = (text, mediaType) => {
  if (!text) return 'low';
  const urgentWords = /\b(urgent|emergency|help|asap|now|please|crisis)\b/i;
  return urgentWords.test(text) ? 'high' : 'low';
};

const detectHarm = (text, mediaType) => {
  if (!text) return { detected: false, type: 'none', confidence: 0, context: 'No text content' };
  
  const threatWords = /\b(kill|murder|bomb|attack|destroy)\b/i;
  const harassWords = /\b(stupid|idiot|hate you|go die)\b/i;
  
  if (threatWords.test(text)) {
    return { detected: true, type: 'violence', confidence: 0.7, context: 'Potential threat language' };
  }
  if (harassWords.test(text)) {
    return { detected: true, type: 'harassment', confidence: 0.4, context: 'Mild harassment indicators' };
  }
  
  return { detected: false, type: 'none', confidence: 0, context: 'No harm signals detected' };
};

const detectSpam = (text, fromNumber) => {
  if (!text) return { detected: false, patterns: [], confidence: 0 };
  
  const patterns = [];
  if (/\b(win|prize|money|free|click|link)\b/i.test(text)) patterns.push('promotional');
  if (text.length > 500) patterns.push('excessive_length');
  if (/(.)\1{4,}/.test(text)) patterns.push('repeated_chars');
  
  return {
    detected: patterns.length > 0,
    patterns,
    confidence: patterns.length * 0.3
  };
};

app.listen(PORT, () => {
  console.log(`MCP Advisory Service running on port ${PORT}`);
});