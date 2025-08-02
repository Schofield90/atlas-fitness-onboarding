-- Add slug field to organizations table for public landing pages
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add hero image and other branding fields
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Generate slugs for existing organizations
UPDATE organizations
SET slug = LOWER(REPLACE(REPLACE(name, ' ', '-'), '.', ''))
WHERE slug IS NULL;

-- Add index for slug lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Create locations table if not exists
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  opening_hours TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_featured field to organization_staff for public display
ALTER TABLE organization_staff
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS specialties TEXT[];

-- Enable RLS on locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for locations
CREATE POLICY "locations_org_access" ON locations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Public read access for locations
CREATE POLICY "locations_public_read" ON locations
  FOR SELECT USING (is_active = true);

-- Update some sample data for Atlas Fitness
UPDATE organizations 
SET 
  slug = 'atlas-fitness',
  tagline = 'Transform Your Body, Transform Your Life',
  description = 'Atlas Fitness is Yorkshire''s premier fitness destination with state-of-the-art facilities in Harrogate and York. Join our community of fitness enthusiasts and achieve your goals with expert guidance.',
  logo_url = '/images/atlas-fitness-logo.png',
  hero_image_url = '/images/gym-hero.jpg'
WHERE name = 'Atlas Fitness';

-- Insert sample locations for Atlas Fitness
INSERT INTO locations (organization_id, name, address, phone, email, opening_hours)
SELECT 
  id,
  'Atlas Fitness Harrogate',
  'Unit 5, Claro Court Business Centre, Claro Road, Harrogate, HG1 4BA',
  '01423 555123',
  'harrogate@atlasfitness.co.uk',
  'Monday-Friday: 6am-10pm
Saturday: 7am-8pm
Sunday: 8am-6pm'
FROM organizations WHERE name = 'Atlas Fitness'
ON CONFLICT DO NOTHING;

INSERT INTO locations (organization_id, name, address, phone, email, opening_hours)
SELECT 
  id,
  'Atlas Fitness York',
  'Unit 12, Auster Road Business Park, Clifton Moor, York, YO30 4XA',
  '01904 666789',
  'york@atlasfitness.co.uk',
  'Monday-Friday: 6am-10pm
Saturday: 7am-8pm
Sunday: 8am-6pm'
FROM organizations WHERE name = 'Atlas Fitness'
ON CONFLICT DO NOTHING;

-- Update Sam Schofield as featured staff
UPDATE organization_staff
SET 
  is_featured = true,
  bio = 'With over 15 years of experience in the fitness industry, Sam specializes in strength training and helping clients achieve their transformation goals.',
  specialties = ARRAY['Strength Training', 'Weight Loss', 'Competition Prep', 'Business Fitness Consultancy']
WHERE name = 'Sam Schofield';

-- Add update trigger for locations
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();