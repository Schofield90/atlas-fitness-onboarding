-- Migration: Team Chat System
-- Create comprehensive internal team communication system

-- =============================================
-- TEAM CHANNELS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.team_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 50),
  description TEXT,
  type TEXT NOT NULL DEFAULT 'channel' CHECK (type IN ('channel', 'direct_message', 'private')),
  is_private BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  archived_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique channel names per organization
  UNIQUE(organization_id, name)
);

-- =============================================
-- TEAM CHANNEL MEMBERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.team_channel_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.team_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  
  -- Ensure user can only be in a channel once
  UNIQUE(channel_id, user_id)
);

-- =============================================
-- TEAM MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.team_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.team_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  thread_id UUID REFERENCES public.team_messages(id) ON DELETE SET NULL, -- For threaded replies
  metadata JSONB DEFAULT '{}'::jsonb, -- Store additional data like file info, formatting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TEAM MESSAGE REACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.team_message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (length(emoji) > 0 AND length(emoji) <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure user can only react once per message per emoji
  UNIQUE(message_id, user_id, emoji)
);

-- =============================================
-- TEAM MESSAGE ATTACHMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.team_message_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT, -- For images/videos
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TEAM MESSAGE READS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.team_message_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.team_channels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure user can only have one read record per message
  UNIQUE(message_id, user_id)
);

-- =============================================
-- TEAM MENTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.team_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mentioned_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mention_type TEXT NOT NULL DEFAULT 'user' CHECK (mention_type IN ('user', 'channel', 'everyone')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique mentions per message per user
  UNIQUE(message_id, mentioned_user_id)
);

-- =============================================
-- TEAM TYPING INDICATORS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.team_typing_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.team_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 seconds'),
  
  -- Ensure user can only have one typing indicator per channel
  UNIQUE(channel_id, user_id)
);

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Team Channels
CREATE INDEX IF NOT EXISTS idx_team_channels_organization_id ON public.team_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_channels_type ON public.team_channels(type);
CREATE INDEX IF NOT EXISTS idx_team_channels_created_at ON public.team_channels(created_at DESC);

-- Team Channel Members
CREATE INDEX IF NOT EXISTS idx_team_channel_members_channel_id ON public.team_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_team_channel_members_user_id ON public.team_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_channel_members_organization_id ON public.team_channel_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_channel_members_last_read ON public.team_channel_members(last_read_at);

-- Team Messages
CREATE INDEX IF NOT EXISTS idx_team_messages_channel_id ON public.team_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_user_id ON public.team_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_organization_id ON public.team_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_created_at ON public.team_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_messages_thread_id ON public.team_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_channel_created ON public.team_messages(channel_id, created_at DESC);

-- Team Message Reactions
CREATE INDEX IF NOT EXISTS idx_team_message_reactions_message_id ON public.team_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_team_message_reactions_user_id ON public.team_message_reactions(user_id);

-- Team Message Attachments
CREATE INDEX IF NOT EXISTS idx_team_message_attachments_message_id ON public.team_message_attachments(message_id);

-- Team Message Reads
CREATE INDEX IF NOT EXISTS idx_team_message_reads_message_id ON public.team_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_team_message_reads_user_id ON public.team_message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_team_message_reads_channel_id ON public.team_message_reads(channel_id);

-- Team Mentions
CREATE INDEX IF NOT EXISTS idx_team_mentions_mentioned_user_id ON public.team_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_team_mentions_message_id ON public.team_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_team_mentions_read ON public.team_mentions(read);
CREATE INDEX IF NOT EXISTS idx_team_mentions_created_at ON public.team_mentions(created_at DESC);

-- Team Typing Indicators
CREATE INDEX IF NOT EXISTS idx_team_typing_indicators_channel_id ON public.team_typing_indicators(channel_id);
CREATE INDEX IF NOT EXISTS idx_team_typing_indicators_expires_at ON public.team_typing_indicators(expires_at);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.team_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_typing_indicators ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Team Channels Policies
CREATE POLICY "Users can view channels in their organization" ON public.team_channels
  FOR SELECT USING (
    organization_id IN (
      SELECT org_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create channels" ON public.team_channels
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE org_id = organization_id 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Channel creators and admins can update channels" ON public.team_channels
  FOR UPDATE USING (
    created_by = auth.uid() OR
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE org_id = organization_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Team Channel Members Policies
CREATE POLICY "Users can view channel memberships in their organization" ON public.team_channel_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT org_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join/leave channels" ON public.team_channel_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT org_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own membership" ON public.team_channel_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can leave channels" ON public.team_channel_members
  FOR DELETE USING (user_id = auth.uid());

-- Team Messages Policies
CREATE POLICY "Users can view messages in channels they're members of" ON public.team_messages
  FOR SELECT USING (
    channel_id IN (
      SELECT channel_id FROM public.team_channel_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to channels they're members of" ON public.team_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    channel_id IN (
      SELECT channel_id FROM public.team_channel_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" ON public.team_messages
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON public.team_messages
  FOR DELETE USING (user_id = auth.uid());

-- Team Message Reactions Policies
CREATE POLICY "Users can view reactions on messages they can see" ON public.team_message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT tm.id FROM public.team_messages tm
      JOIN public.team_channel_members tcm ON tm.channel_id = tcm.channel_id
      WHERE tcm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add reactions to messages they can see" ON public.team_message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
      SELECT tm.id FROM public.team_messages tm
      JOIN public.team_channel_members tcm ON tm.channel_id = tcm.channel_id
      WHERE tcm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove their own reactions" ON public.team_message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- Team Message Attachments Policies
CREATE POLICY "Users can view attachments on messages they can see" ON public.team_message_attachments
  FOR SELECT USING (
    message_id IN (
      SELECT tm.id FROM public.team_messages tm
      JOIN public.team_channel_members tcm ON tm.channel_id = tcm.channel_id
      WHERE tcm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add attachments to their messages" ON public.team_message_attachments
  FOR INSERT WITH CHECK (
    message_id IN (
      SELECT id FROM public.team_messages 
      WHERE user_id = auth.uid()
    )
  );

-- Team Message Reads Policies
CREATE POLICY "Users can view their own read status" ON public.team_message_reads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can mark messages as read" ON public.team_message_reads
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
      SELECT tm.id FROM public.team_messages tm
      JOIN public.team_channel_members tcm ON tm.channel_id = tcm.channel_id
      WHERE tcm.user_id = auth.uid()
    )
  );

-- Team Mentions Policies
CREATE POLICY "Users can view mentions directed at them" ON public.team_mentions
  FOR SELECT USING (
    mentioned_user_id = auth.uid() OR
    mentioned_by_user_id = auth.uid()
  );

CREATE POLICY "Users can create mentions" ON public.team_mentions
  FOR INSERT WITH CHECK (
    mentioned_by_user_id = auth.uid() AND
    message_id IN (
      SELECT tm.id FROM public.team_messages tm
      JOIN public.team_channel_members tcm ON tm.channel_id = tcm.channel_id
      WHERE tcm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their mention status" ON public.team_mentions
  FOR UPDATE USING (mentioned_user_id = auth.uid());

-- Team Typing Indicators Policies
CREATE POLICY "Users can view typing indicators in their channels" ON public.team_typing_indicators
  FOR SELECT USING (
    channel_id IN (
      SELECT channel_id FROM public.team_channel_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own typing indicators" ON public.team_typing_indicators
  FOR ALL USING (user_id = auth.uid());

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_team_channels_updated_at 
  BEFORE UPDATE ON public.team_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_messages_updated_at 
  BEFORE UPDATE ON public.team_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean up expired typing indicators
CREATE OR REPLACE FUNCTION public.cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM public.team_typing_indicators
  WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION public.get_unread_message_count(user_uuid UUID)
RETURNS TABLE(channel_id UUID, unread_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH channel_last_read AS (
    SELECT tcm.channel_id, tcm.last_read_at
    FROM public.team_channel_members tcm
    WHERE tcm.user_id = user_uuid
  )
  SELECT clr.channel_id, COUNT(tm.id)::BIGINT as unread_count
  FROM channel_last_read clr
  JOIN public.team_messages tm ON tm.channel_id = clr.channel_id
  WHERE tm.created_at > clr.last_read_at
    AND tm.user_id != user_uuid  -- Don't count own messages
  GROUP BY clr.channel_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to mark channel as read
CREATE OR REPLACE FUNCTION public.mark_channel_as_read(channel_uuid UUID, user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.team_channel_members
  SET last_read_at = NOW()
  WHERE channel_id = channel_uuid AND user_id = user_uuid;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to create default channels for new organizations
CREATE OR REPLACE FUNCTION public.create_default_team_channels()
RETURNS TRIGGER AS $$
BEGIN
  -- Create general channel
  INSERT INTO public.team_channels (organization_id, name, description, created_by)
  SELECT 
    NEW.id, 
    'general', 
    'General team discussions',
    (SELECT user_id FROM public.organization_members WHERE org_id = NEW.id AND role = 'owner' LIMIT 1);
  
  -- Create random channel
  INSERT INTO public.team_channels (organization_id, name, description, created_by)
  SELECT 
    NEW.id, 
    'random', 
    'Random conversations and fun stuff',
    (SELECT user_id FROM public.organization_members WHERE org_id = NEW.id AND role = 'owner' LIMIT 1);
    
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create default channels when organization is created
CREATE TRIGGER create_default_channels_on_org_creation
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.create_default_team_channels();

-- Function to auto-add users to general channel
CREATE OR REPLACE FUNCTION public.auto_add_to_general_channel()
RETURNS TRIGGER AS $$
BEGIN
  -- Add user to general channel
  INSERT INTO public.team_channel_members (channel_id, user_id, organization_id)
  SELECT tc.id, NEW.user_id, NEW.org_id
  FROM public.team_channels tc
  WHERE tc.organization_id = NEW.org_id 
    AND tc.name = 'general'
  ON CONFLICT (channel_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-add users to general channel when they join organization
CREATE TRIGGER auto_add_to_general_channel_on_member_join
  AFTER INSERT ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_to_general_channel();

-- =============================================
-- REALTIME PUBLICATION
-- =============================================

-- Enable realtime for team chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_channel_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_message_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_mentions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_typing_indicators;