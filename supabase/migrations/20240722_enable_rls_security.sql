-- Enable RLS on all tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_integrations ENABLE ROW LEVEL SECURITY;

-- LEADS table policies
-- Users can only see leads from their organization
CREATE POLICY "Users can view their organization's leads" ON public.leads
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Users can insert leads for their organization
CREATE POLICY "Users can create leads for their organization" ON public.leads
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Users can update their organization's leads
CREATE POLICY "Users can update their organization's leads" ON public.leads
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Users can delete their organization's leads
CREATE POLICY "Users can delete their organization's leads" ON public.leads
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- USERS table policies
-- Users can only see users in their organization
CREATE POLICY "Users can view their organization members" ON public.users
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Only the user can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- ORGANIZATIONS table policies
-- Users can only see their own organization
CREATE POLICY "Users can view own organization" ON public.organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Organization admins can update their organization
CREATE POLICY "Admins can update organization" ON public.organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- FACEBOOK_PAGES table policies
-- Users can only see their organization's Facebook pages
CREATE POLICY "Users can view their organization's Facebook pages" ON public.facebook_pages
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Users can insert Facebook pages for their organization
CREATE POLICY "Users can create Facebook pages for their organization" ON public.facebook_pages
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Users can update their organization's Facebook pages
CREATE POLICY "Users can update their organization's Facebook pages" ON public.facebook_pages
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- FACEBOOK_INTEGRATIONS table policies
-- Users can only see their own integrations
CREATE POLICY "Users can view own integrations" ON public.facebook_integrations
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own integrations
CREATE POLICY "Users can update own integrations" ON public.facebook_integrations
  FOR UPDATE USING (user_id = auth.uid());

-- Users can insert their own integrations
CREATE POLICY "Users can insert own integrations" ON public.facebook_integrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can delete their own integrations
CREATE POLICY "Users can delete own integrations" ON public.facebook_integrations
  FOR DELETE USING (user_id = auth.uid());