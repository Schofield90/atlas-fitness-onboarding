-- Create a test gym owner user for E2E testing
-- This script creates a user with full organization access

-- First, create the auth user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  'test-owner-2024-01-20'::uuid,
  'test.owner@gymtest.com',
  crypt('TestOwner123!', gen_salt('bf')), -- Password: TestOwner123!
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test Owner","role":"owner"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = NOW();

-- Create the organization for the test owner
INSERT INTO organizations (
  id,
  name,
  owner_id,
  subdomain,
  created_at,
  updated_at
) VALUES (
  'test-org-2024-01-20'::uuid,
  'Test Gym Organization',
  'test-owner-2024-01-20'::uuid,
  'testgym',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Link the user to the organization via organization_staff
INSERT INTO organization_staff (
  user_id,
  organization_id,
  role,
  is_active,
  created_at
) VALUES (
  'test-owner-2024-01-20'::uuid,
  'test-org-2024-01-20'::uuid,
  'owner',
  true,
  NOW()
) ON CONFLICT (user_id, organization_id) DO UPDATE SET
  role = 'owner',
  is_active = true;

-- Also add to organization_members for backward compatibility
INSERT INTO organization_members (
  user_id,
  organization_id,
  role,
  is_active,
  created_at
) VALUES (
  'test-owner-2024-01-20'::uuid,
  'test-org-2024-01-20'::uuid,
  'owner',
  true,
  NOW()
) ON CONFLICT (user_id, organization_id) DO UPDATE SET
  role = 'owner',
  is_active = true;

-- Add to user_organizations table
INSERT INTO user_organizations (
  user_id,
  organization_id,
  role,
  created_at
) VALUES (
  'test-owner-2024-01-20'::uuid,
  'test-org-2024-01-20'::uuid,
  'owner',
  NOW()
) ON CONFLICT (user_id, organization_id) DO UPDATE SET
  role = 'owner';

-- Output the credentials
SELECT 
  'Test User Created Successfully!' as status,
  'test.owner@gymtest.com' as email,
  'TestOwner123!' as password,
  'test-org-2024-01-20' as organization_id,
  'Test Gym Organization' as organization_name;