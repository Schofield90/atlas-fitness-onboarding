-- Meta Messenger Integration Schema
-- =============================================

-- Integration Accounts Table (stores connected Facebook Pages)
CREATE TABLE IF NOT EXISTS public.integration_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('facebook', 'instagram', 'whatsapp')),
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  page_access_token TEXT NOT NULL, -- Will be encrypted at application layer
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Token expiry if applicable
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'revoked')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, provider, page_id)
);

-- Channel Identity Table (maps platform IDs to our contacts)
CREATE TABLE IF NOT EXISTS public.channel_identities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('facebook', 'instagram', 'whatsapp', 'sms', 'email')),
  external_id TEXT NOT NULL, -- PSID for Facebook
  page_id TEXT, -- Facebook Page ID
  display_name TEXT,
  profile_pic_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, provider, external_id)
);

-- Messenger Conversations Table
CREATE TABLE IF NOT EXISTS public.messenger_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'facebook' CHECK (provider IN ('facebook', 'instagram', 'whatsapp')),
  channel_id TEXT NOT NULL, -- Page ID
  external_thread_id TEXT NOT NULL, -- Combination of pageId:psid
  last_inbound_at TIMESTAMP WITH TIME ZONE,
  last_outbound_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  unread_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, provider, external_thread_id)
);

-- Messenger Messages Table
CREATE TABLE IF NOT EXISTS public.messenger_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.messenger_conversations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'facebook' CHECK (provider IN ('facebook', 'instagram', 'whatsapp')),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  external_message_id TEXT UNIQUE,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'template', 'postback')),
  text TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Events Log (for debugging and replay)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, event_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_integration_accounts_org_provider ON public.integration_accounts(organization_id, provider);
CREATE INDEX IF NOT EXISTS idx_integration_accounts_status ON public.integration_accounts(status);
CREATE INDEX IF NOT EXISTS idx_channel_identities_org_provider ON public.channel_identities(organization_id, provider);
CREATE INDEX IF NOT EXISTS idx_channel_identities_contact ON public.channel_identities(contact_id);
CREATE INDEX IF NOT EXISTS idx_messenger_conversations_org ON public.messenger_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_messenger_conversations_contact ON public.messenger_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_messenger_conversations_last_inbound ON public.messenger_conversations(last_inbound_at);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_conversation ON public.messenger_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_external_id ON public.messenger_messages(external_message_id);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_created ON public.messenger_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status, created_at);

-- RLS Policies
ALTER TABLE public.integration_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Integration Accounts policies
CREATE POLICY "Users can view their org's integration accounts"
  ON public.integration_accounts FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage integration accounts"
  ON public.integration_accounts FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Channel Identities policies
CREATE POLICY "Users can view their org's channel identities"
  ON public.channel_identities FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage channel identities"
  ON public.channel_identities FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  ));

-- Messenger Conversations policies
CREATE POLICY "Users can view their org's messenger conversations"
  ON public.messenger_conversations FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage messenger conversations"
  ON public.messenger_conversations FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  ));

-- Messenger Messages policies
CREATE POLICY "Users can view their org's messenger messages"
  ON public.messenger_messages FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can send messenger messages"
  ON public.messenger_messages FOR INSERT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  ));

-- Webhook Events policies (admins only)
CREATE POLICY "Admins can view webhook events"
  ON public.webhook_events FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Helper function to check 24-hour messaging window
CREATE OR REPLACE FUNCTION is_within_messaging_window(conv_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_inbound TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT last_inbound_at INTO last_inbound
  FROM public.messenger_conversations
  WHERE id = conv_id;
  
  IF last_inbound IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if within 24 hours
  RETURN (NOW() - last_inbound) < INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_integration_accounts_updated_at BEFORE UPDATE ON public.integration_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channel_identities_updated_at BEFORE UPDATE ON public.channel_identities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messenger_conversations_updated_at BEFORE UPDATE ON public.messenger_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messenger_messages_updated_at BEFORE UPDATE ON public.messenger_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();