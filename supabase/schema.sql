-- Messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_id TEXT UNIQUE NOT NULL,
  from_number TEXT NOT NULL,
  message_type TEXT NOT NULL, -- text, image, audio, video, document
  content TEXT,
  media_url TEXT,
  media_id TEXT,
  language_detected TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media assets table
CREATE TABLE media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  whatsapp_media_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  original_url TEXT,
  storage_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advisory flags (MCP intelligence output)
CREATE TABLE advisories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  advisory_type TEXT NOT NULL, -- language, urgency, harm, spam
  confidence DECIMAL(3,2),
  details JSONB,
  escalation_suggested BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust & safety flags
CREATE TABLE flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL, -- low, medium, high
  action_taken TEXT, -- logged, warned, escalated
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies (basic)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisories ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('audio', 'audio', true),
  ('images', 'images', true),
  ('videos', 'videos', true),
  ('documents', 'documents', true);

-- Storage policies
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Service role upload" ON storage.objects FOR INSERT WITH CHECK (true);