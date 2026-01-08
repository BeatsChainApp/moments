-- Community-First Onboarding Messages
-- These messages emphasize community ownership and peer-to-peer sharing

-- Update existing templates with community-first messaging
UPDATE whatsapp_templates 
SET components = '[
  {
    "type": "BODY",
    "text": "🌍 Welcome to your community space! \\n\\nYou''re now connected to Unami Foundation Moments - where YOUR community shares what matters most.\\n\\n✨ This is about YOUR moments, YOUR opportunities, YOUR community.\\n\\nWe simply help connect neighbors and share local insights.\\n\\nRegion: {{1}}\\nInterests: {{2}}\\n\\nReply HELP for options or STOP to leave anytime."
  },
  {
    "type": "FOOTER", 
    "text": "Your community, your moments 🤝"
  }
]'
WHERE name = 'welcome_confirmation';

UPDATE whatsapp_templates 
SET components = '[
  {
    "type": "BODY",
    "text": "Thank you for being part of our community! 🙏\\n\\nYou''ve left Unami Foundation Moments, but your community connections remain strong.\\n\\nReply START anytime to reconnect with local opportunities and community insights.\\n\\nStay connected, stay empowered! ✊"
  }
]'
WHERE name = 'unsubscribe_confirmation';

-- Insert new community-first templates
INSERT INTO whatsapp_templates (name, category, components, status) VALUES

('community_help', 'UTILITY', '[
  {
    "type": "BODY",
    "text": "🤝 Unami Foundation Moments - Community Help\\n\\nThis is YOUR community platform:\\n\\n📍 REGIONS: Reply with province name\\n   (KZN, WC, GP, EC, FS, LP, MP, NC, NW)\\n\\n🏷️ INTERESTS: Reply INTERESTS to choose\\n   (Education, Safety, Culture, Jobs, Health, etc.)\\n\\n📱 COMMANDS:\\n   • START - Join community updates\\n   • STOP - Leave (anytime)\\n   • HELP - This message\\n   • REGIONS - Change your area\\n   • INTERESTS - Update preferences\\n\\n💡 Share local opportunities by messaging us directly!\\n\\nYour community, your voice, your moments."
  }
]', 'pending'),

('region_selection', 'UTILITY', '[
  {
    "type": "BODY",
    "text": "📍 Choose your community region:\\n\\nReply with your province:\\n\\n🏙️ GP - Gauteng\\n🌊 WC - Western Cape\\n🏔️ KZN - KwaZulu-Natal\\n🦓 EC - Eastern Cape\\n🌾 FS - Free State\\n🌳 LP - Limpopo\\n⛰️ MP - Mpumalanga\\n🏜️ NC - Northern Cape\\n🌿 NW - North West\\n\\nExample: Reply ''KZN'' for KwaZulu-Natal\\n\\nYour region helps us share the most relevant community opportunities with you!"
  }
]', 'pending'),

('interests_selection', 'UTILITY', '[
  {
    "type": "BODY",
    "text": "🏷️ What matters most to your community?\\n\\nReply with numbers (e.g., ''1,3,5''):\\n\\n1️⃣ Education - Skills, training, learning\\n2️⃣ Safety - Community safety, awareness\\n3️⃣ Culture - Events, heritage, celebrations\\n4️⃣ Jobs - Employment, opportunities\\n5️⃣ Health - Wellness, clinic info\\n6️⃣ Technology - Digital skills, access\\n7️⃣ Environment - Conservation, green initiatives\\n8️⃣ Youth - Programs for young people\\n\\nExample: Reply ''1,4,5'' for Education, Jobs, and Health\\n\\nWe''ll share community moments that match your interests!"
  }
]', 'pending'),

('community_moment_share', 'UTILITY', '[
  {
    "type": "BODY",
    "text": "🌟 Thank you for sharing with your community!\\n\\nYour message: \\\"{{1}}\\\"\\n\\nWe''re reviewing it to share with neighbors who might benefit.\\n\\n✨ Community members like you make this platform valuable by sharing:\\n• Local opportunities\\n• Safety updates\\n• Cultural events\\n• Job openings\\n• Community resources\\n\\nKeep sharing what matters to your community! 🤝"
  }
]', 'pending'),

('preferences_updated', 'UTILITY', '[
  {
    "type": "BODY",
    "text": "✅ Your community preferences updated!\\n\\nRegion: {{1}}\\nInterests: {{2}}\\n\\nYou''ll now receive community moments that match your preferences.\\n\\n💡 Remember: This platform thrives because community members like you share local opportunities and insights.\\n\\nReply HELP anytime for options.\\n\\nYour community, your moments! 🌍"
  }
]', 'pending');

-- Community-first broadcast templates
UPDATE whatsapp_templates 
SET components = '[
  {
    "type": "HEADER",
    "format": "TEXT",
    "text": "🌍 Community Moment — {{1}}"
  },
  {
    "type": "BODY",
    "text": "{{2}}\\n\\n{{3}}\\n\\n📍 {{4}} • 🏷️ {{5}}\\n\\nShared by your community network"
  },
  {
    "type": "FOOTER",
    "text": "Reply STOP to leave • Your community, your moments"
  }
]'
WHERE name = 'moment_broadcast';

UPDATE whatsapp_templates 
SET components = '[
  {
    "type": "HEADER",
    "format": "TEXT", 
    "text": "🤝 Community Opportunity — {{1}}"
  },
  {
    "type": "BODY",
    "text": "{{2}}\\n\\n{{3}}\\n\\n📍 {{4}} • 🏷️ {{5}}\\n\\n✨ Proudly supported by {{6}}\\n\\nThis opportunity was identified through community partnerships to benefit local residents."
  },
  {
    "type": "FOOTER",
    "text": "Reply STOP to leave • Community-first platform"
  }
]'
WHERE name = 'sponsored_moment';

-- Command processing templates
INSERT INTO whatsapp_templates (name, category, components, status) VALUES

('region_updated', 'UTILITY', '[
  {
    "type": "BODY",
    "text": "📍 Region updated to {{1}}!\\n\\nYou''ll now receive community moments and opportunities relevant to your area.\\n\\n🤝 Help your neighbors by sharing local opportunities, events, and important community information.\\n\\nReply INTERESTS to update what matters most to you."
  }
]', 'pending'),

('invalid_region', 'UTILITY', '[
  {
    "type": "BODY",
    "text": "❓ We didn''t recognize that region.\\n\\nPlease reply with one of these:\\n\\nGP, WC, KZN, EC, FS, LP, MP, NC, NW\\n\\nExample: Reply ''KZN'' for KwaZulu-Natal\\n\\nReply HELP for more options."
  }
]', 'pending'),

('interests_updated', 'UTILITY', '[
  {
    "type": "BODY",
    "text": "🏷️ Interests updated: {{1}}\\n\\nYou''ll receive community moments matching these topics.\\n\\n💡 Share opportunities in these areas with your community by messaging us directly!\\n\\nYour input helps neighbors discover relevant opportunities.\\n\\nReply REGIONS to change your area."
  }
]', 'pending'),

('invalid_interests', 'UTILITY', '[
  {
    "type": "BODY",
    "text": "❓ Please reply with numbers 1-8 separated by commas.\\n\\nExample: ''1,4,5'' for Education, Jobs, Health\\n\\n1️⃣ Education  2️⃣ Safety  3️⃣ Culture  4️⃣ Jobs\\n5️⃣ Health  6️⃣ Technology  7️⃣ Environment  8️⃣ Youth\\n\\nReply HELP for all options."
  }
]', 'pending');

-- Function to get community-appropriate template
CREATE OR REPLACE FUNCTION get_community_template(template_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    template_data RECORD;
    result JSON;
BEGIN
    SELECT * INTO template_data
    FROM whatsapp_templates
    WHERE name = template_name AND status = 'approved';
    
    IF NOT FOUND THEN
        -- Return fallback template
        result := json_build_object(
            'name', template_name,
            'components', json_build_array(
                json_build_object(
                    'type', 'BODY',
                    'text', 'Thank you for connecting with your community! 🤝'
                )
            ),
            'category', 'UTILITY'
        );
    ELSE
        result := json_build_object(
            'name', template_data.name,
            'components', template_data.components,
            'category', template_data.category,
            'language_code', template_data.language_code
        );
    END IF;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_community_template TO service_role;

COMMENT ON TABLE whatsapp_templates IS 'Community-first WhatsApp message templates emphasizing peer-to-peer sharing and local ownership';