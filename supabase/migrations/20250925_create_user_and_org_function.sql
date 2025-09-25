-- Function to create user and organization atomically
-- This runs with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION create_user_and_org(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_org_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_slug TEXT;
  v_result JSON;
BEGIN
  -- Generate slug from organization name
  v_slug := lower(regexp_replace(regexp_replace(p_org_name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g'));
  
  -- Insert user (ignore if already exists)
  INSERT INTO users (id, email, name)
  VALUES (p_user_id, p_email, p_name)
  ON CONFLICT (id) DO NOTHING;
  
  -- Check if user already has an organization
  SELECT organization_id INTO v_org_id
  FROM user_organizations
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- If no organization exists, create one
  IF v_org_id IS NULL THEN
    -- Create organization
    INSERT INTO organizations (name, slug, email, phone, subscription_status)
    VALUES (p_org_name, v_slug, p_email, '', 'trialing')
    RETURNING id INTO v_org_id;
    
    -- Link user to organization
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (p_user_id, v_org_id, 'owner');
  END IF;
  
  -- Return result
  v_result := json_build_object(
    'user_id', p_user_id,
    'organization_id', v_org_id,
    'success', true
  );
  
  RETURN v_result;
END;
$$;