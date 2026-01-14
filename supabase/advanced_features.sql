-- ADVANCED FEATURES
-- Comment threads, user profiles, notifications, analytics

-- Comment threads (replies)
CREATE TABLE IF NOT EXISTS comment_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  from_number TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 500),
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_threads_parent ON comment_threads(parent_comment_id);

-- User profiles (anonymous but trackable)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT CHECK (length(bio) <= 200),
  reputation_score INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_featured INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone_number);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('comment_reply','comment_featured','moment_update','system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  read BOOLEAN DEFAULT false,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_phone, read);

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_phone TEXT,
  moment_id UUID REFERENCES moments(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_moment ON analytics_events(moment_id);

-- Moment engagement stats
CREATE TABLE IF NOT EXISTS moment_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID UNIQUE REFERENCES moments(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moment_stats_moment ON moment_stats(moment_id);

-- RLS policies
ALTER TABLE comment_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access" ON comment_threads FOR ALL USING (is_admin());
CREATE POLICY "Admin access" ON user_profiles FOR ALL USING (is_admin());
CREATE POLICY "Admin access" ON notifications FOR ALL USING (is_admin());
CREATE POLICY "Admin access" ON analytics_events FOR ALL USING (is_admin());
CREATE POLICY "Admin access" ON moment_stats FOR ALL USING (is_admin());

CREATE POLICY "Public read approved threads" ON comment_threads FOR SELECT USING (moderation_status = 'approved');
CREATE POLICY "Public read profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Public read stats" ON moment_stats FOR SELECT USING (true);

-- Trigger to update comment count
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE moment_stats SET comment_count = comment_count + 1 WHERE moment_id = NEW.moment_id;
    UPDATE user_profiles SET total_comments = total_comments + 1 WHERE phone_number = NEW.from_number;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE moment_stats SET comment_count = GREATEST(0, comment_count - 1) WHERE moment_id = OLD.moment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_count_trigger AFTER INSERT OR DELETE ON comments 
FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- Trigger to update reply count
CREATE OR REPLACE FUNCTION update_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.parent_comment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reply_count_trigger AFTER INSERT OR DELETE ON comment_threads 
FOR EACH ROW EXECUTE FUNCTION update_reply_count();

-- Initialize moment stats for existing moments
INSERT INTO moment_stats (moment_id)
SELECT id FROM moments
ON CONFLICT (moment_id) DO NOTHING;
