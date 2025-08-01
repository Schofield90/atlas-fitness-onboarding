-- LookInBody Integration for Multi-Tenant SaaS Platform
-- Each organization can connect their own LookInBody account

-- Body composition scan records
CREATE TABLE IF NOT EXISTS body_composition_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- LookInBody Identifiers
  lookinbody_user_token VARCHAR, -- Phone number used for matching
  lookinbody_scan_id VARCHAR,
  
  -- Basic Measurements
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  bmi DECIMAL(4,2),
  
  -- Body Composition
  total_body_water DECIMAL(5,2),
  intracellular_water DECIMAL(5,2),
  extracellular_water DECIMAL(5,2),
  ecw_tbw_ratio DECIMAL(5,4), -- Important health indicator
  
  -- Muscle & Fat Analysis
  lean_body_mass DECIMAL(5,2),
  skeletal_muscle_mass DECIMAL(5,2),
  body_fat_mass DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  
  -- Segmental Analysis (5 body segments)
  segmental_lean_mass JSONB, -- {right_arm, left_arm, trunk, right_leg, left_leg}
  segmental_fat_mass JSONB,
  
  -- Health Metrics
  basal_metabolic_rate INTEGER,
  visceral_fat_level INTEGER,
  visceral_fat_area DECIMAL(6,2), -- cm²
  phase_angle DECIMAL(4,2), -- Cellular health indicator
  
  -- InBody Scoring
  inbody_score INTEGER, -- Overall score 0-100
  body_cell_mass DECIMAL(5,2),
  
  -- Additional Metrics
  impedance_data JSONB, -- Raw impedance measurements by frequency
  target_values JSONB, -- Recommended target ranges
  
  -- Scan Context
  scan_date TIMESTAMP NOT NULL,
  scan_location VARCHAR,
  device_serial VARCHAR,
  
  -- Change Tracking (calculated fields)
  weight_change DECIMAL(5,2),
  body_fat_change DECIMAL(4,2),
  muscle_mass_change DECIMAL(5,2),
  days_since_last_scan INTEGER,
  
  -- Integration Metadata
  raw_api_response JSONB,
  sync_status VARCHAR DEFAULT 'synced',
  last_sync_at TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- LookInBody API Configuration (Per Organization)
CREATE TABLE IF NOT EXISTS lookinbody_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  
  -- API Credentials (Each org has their own LookInBody account)
  api_key VARCHAR NOT NULL,
  account_name VARCHAR NOT NULL,
  region VARCHAR DEFAULT 'usa', -- usa, eur, asia, uk
  
  -- Webhook Configuration (Unique per organization)
  webhook_secret VARCHAR DEFAULT gen_random_uuid()::VARCHAR,
  webhook_enabled BOOLEAN DEFAULT TRUE,
  
  -- Device Information
  device_serials TEXT[], -- Array of connected device serial numbers
  locations JSONB DEFAULT '[]'::jsonb, -- Multiple gym locations per org
  
  -- Settings (Customizable per organization)
  auto_sync_enabled BOOLEAN DEFAULT TRUE,
  alert_thresholds JSONB DEFAULT '{
    "significant_weight_change": 2.0,
    "significant_fat_change": 3.0,
    "high_visceral_fat": 13,
    "low_phase_angle": 4.0
  }'::jsonb,
  
  -- Billing & Usage Tracking
  api_calls_used_this_month INTEGER DEFAULT 0,
  api_plan VARCHAR DEFAULT 'basic', -- basic(500), professional(1500), enterprise(5000)
  billing_status VARCHAR DEFAULT 'active',
  
  -- Sync Status
  last_sync_at TIMESTAMP,
  total_synced_scans INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track API usage per organization for billing
CREATE TABLE IF NOT EXISTS lookinbody_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Usage Tracking
  date DATE NOT NULL,
  api_calls_count INTEGER DEFAULT 0,
  webhooks_received INTEGER DEFAULT 0,
  scans_processed INTEGER DEFAULT 0,
  
  -- Costs
  api_cost DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, date)
);

-- Health alerts and notifications based on scan results
CREATE TABLE IF NOT EXISTS body_composition_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES body_composition_scans(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Alert Details
  alert_type VARCHAR NOT NULL CHECK (alert_type IN ('achievement', 'health_risk', 'milestone', 'intervention_needed')),
  severity VARCHAR DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  
  -- Trigger Data
  trigger_metric VARCHAR, -- e.g., 'body_fat_percentage', 'visceral_fat_level'
  trigger_value DECIMAL(10,4),
  threshold_value DECIMAL(10,4),
  
  -- Actions Taken
  actions_triggered JSONB, -- Array of automated actions
  notification_sent BOOLEAN DEFAULT FALSE,
  trainer_notified BOOLEAN DEFAULT FALSE,
  
  -- Status
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Multi-location support for gym chains
CREATE TABLE IF NOT EXISTS gym_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR NOT NULL,
  address JSONB,
  device_serials TEXT[], -- InBody scanners at this location
  timezone VARCHAR DEFAULT 'Europe/London',
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add location reference to scans
ALTER TABLE body_composition_scans 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES gym_locations(id);

-- Client phone mapping for easier matching
CREATE TABLE IF NOT EXISTS client_phone_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  phone_number VARCHAR NOT NULL,
  normalized_phone VARCHAR NOT NULL, -- Standardized format
  verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR,
  verification_sent_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, normalized_phone)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_body_scans_client_date ON body_composition_scans(client_id, scan_date DESC);
CREATE INDEX IF NOT EXISTS idx_body_scans_organization ON body_composition_scans(organization_id);
CREATE INDEX IF NOT EXISTS idx_body_scans_phone ON body_composition_scans(lookinbody_user_token);
CREATE INDEX IF NOT EXISTS idx_body_alerts_client ON body_composition_alerts(client_id, status);
CREATE INDEX IF NOT EXISTS idx_lookinbody_usage_org_date ON lookinbody_api_usage(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_phone_mappings ON client_phone_mappings(organization_id, normalized_phone);

-- Create triggers for updated_at
CREATE TRIGGER update_body_scans_updated_at BEFORE UPDATE ON body_composition_scans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lookinbody_config_updated_at BEFORE UPDATE ON lookinbody_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_body_alerts_updated_at BEFORE UPDATE ON body_composition_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gym_locations_updated_at BEFORE UPDATE ON gym_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE body_composition_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookinbody_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookinbody_api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_composition_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_phone_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Body composition scans: Organization isolation
CREATE POLICY "View own organization scans" ON body_composition_scans
    FOR SELECT USING (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM clients WHERE id = auth.uid()
      )
    );

CREATE POLICY "Manage own organization scans" ON body_composition_scans
    FOR ALL USING (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    );

-- LookInBody config: Only org admins
CREATE POLICY "View own org config" ON lookinbody_config
    FOR SELECT USING (
      organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    );

CREATE POLICY "Manage own org config" ON lookinbody_config
    FOR ALL USING (
      organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    );

-- API usage: Organization admins only
CREATE POLICY "View own org usage" ON lookinbody_api_usage
    FOR SELECT USING (
      organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    );

-- Alerts: Organization staff can view
CREATE POLICY "View organization alerts" ON body_composition_alerts
    FOR SELECT USING (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    );

-- Locations: Organization staff can view
CREATE POLICY "View organization locations" ON gym_locations
    FOR SELECT USING (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    );

CREATE POLICY "Manage organization locations" ON gym_locations
    FOR ALL USING (
      organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    );

-- Phone mappings: Organization isolation
CREATE POLICY "View organization phone mappings" ON client_phone_mappings
    FOR SELECT USING (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    );

CREATE POLICY "Manage organization phone mappings" ON client_phone_mappings
    FOR ALL USING (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    );

-- Function to calculate scan changes
CREATE OR REPLACE FUNCTION calculate_scan_changes()
RETURNS TRIGGER AS $$
DECLARE
  previous_scan body_composition_scans%ROWTYPE;
BEGIN
  -- Find the previous scan for this client
  SELECT * INTO previous_scan
  FROM body_composition_scans
  WHERE client_id = NEW.client_id
    AND organization_id = NEW.organization_id
    AND scan_date < NEW.scan_date
  ORDER BY scan_date DESC
  LIMIT 1;

  IF previous_scan.id IS NOT NULL THEN
    NEW.weight_change := NEW.weight - previous_scan.weight;
    NEW.body_fat_change := NEW.body_fat_percentage - previous_scan.body_fat_percentage;
    NEW.muscle_mass_change := NEW.skeletal_muscle_mass - previous_scan.skeletal_muscle_mass;
    NEW.days_since_last_scan := EXTRACT(DAY FROM NEW.scan_date - previous_scan.scan_date);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to calculate changes on insert
CREATE TRIGGER calculate_scan_changes_trigger
    BEFORE INSERT ON body_composition_scans
    FOR EACH ROW
    EXECUTE FUNCTION calculate_scan_changes();

-- Function to track API usage
CREATE OR REPLACE FUNCTION track_lookinbody_api_usage(
  p_organization_id UUID,
  p_usage_type VARCHAR
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO lookinbody_api_usage (
    organization_id,
    date,
    api_calls_count,
    webhooks_received,
    scans_processed
  )
  VALUES (
    p_organization_id,
    CURRENT_DATE,
    CASE WHEN p_usage_type = 'api_call' THEN 1 ELSE 0 END,
    CASE WHEN p_usage_type = 'webhook' THEN 1 ELSE 0 END,
    CASE WHEN p_usage_type = 'scan' THEN 1 ELSE 0 END
  )
  ON CONFLICT (organization_id, date)
  DO UPDATE SET
    api_calls_count = lookinbody_api_usage.api_calls_count + 
      CASE WHEN p_usage_type = 'api_call' THEN 1 ELSE 0 END,
    webhooks_received = lookinbody_api_usage.webhooks_received + 
      CASE WHEN p_usage_type = 'webhook' THEN 1 ELSE 0 END,
    scans_processed = lookinbody_api_usage.scans_processed + 
      CASE WHEN p_usage_type = 'scan' THEN 1 ELSE 0 END;
      
  -- Update monthly usage in config
  IF p_usage_type = 'api_call' THEN
    UPDATE lookinbody_config
    SET api_calls_used_this_month = api_calls_used_this_month + 1
    WHERE organization_id = p_organization_id;
  END IF;
END;
$$ LANGUAGE plpgsql;