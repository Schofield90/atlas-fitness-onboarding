-- Mobile App Schema Migration
-- This migration adds tables and functions needed for the member mobile app

-- ============================================
-- 1. MEMBER PROFILES & PREFERENCES
-- ============================================

-- Member app preferences (per user per org)
CREATE TABLE IF NOT EXISTS member_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Notification preferences
  push_enabled BOOLEAN DEFAULT true,
  push_booking_reminders BOOLEAN DEFAULT true,
  push_class_changes BOOLEAN DEFAULT true,
  push_waitlist_updates BOOLEAN DEFAULT true,
  push_membership_updates BOOLEAN DEFAULT true,
  push_marketing BOOLEAN DEFAULT false,
  reminder_hours_before INTEGER DEFAULT 2,
  
  -- App preferences
  preferred_language VARCHAR(5) DEFAULT 'en',
  preferred_location_id UUID REFERENCES locations(id),
  calendar_sync_enabled BOOLEAN DEFAULT false,
  
  -- Privacy settings
  show_in_class_lists BOOLEAN DEFAULT true,
  allow_instructor_messaging BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, organization_id)
);

-- ============================================
-- 2. MOBILE SESSIONS & TOKENS
-- ============================================

-- Mobile device sessions for push notifications
CREATE TABLE IF NOT EXISTS member_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Device info
  device_token TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name TEXT,
  device_id TEXT,
  app_version TEXT,
  
  -- Push notification info
  push_enabled BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(device_token)
);

-- QR check-in tokens
CREATE TABLE IF NOT EXISTS qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Token info
  token TEXT NOT NULL UNIQUE,
  token_type VARCHAR(20) NOT NULL DEFAULT 'check_in', -- check_in, booking, access
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Optional booking reference
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Usage tracking
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  used_location_id UUID REFERENCES locations(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. CHECK-INS & ATTENDANCE
-- ============================================

-- Member check-ins (gym visits)
CREATE TABLE IF NOT EXISTS member_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  
  -- Check-in details
  check_in_at TIMESTAMPTZ DEFAULT NOW(),
  check_out_at TIMESTAMPTZ,
  check_in_method VARCHAR(20) DEFAULT 'qr', -- qr, manual, booking, nfc
  
  -- Optional booking reference
  booking_id UUID REFERENCES bookings(id),
  
  -- QR token used
  qr_token_id UUID REFERENCES qr_tokens(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. MOBILE-SPECIFIC VIEWS
-- ============================================

-- View for member's upcoming classes with all needed info
CREATE OR REPLACE VIEW member_upcoming_classes AS
SELECT 
  b.id as booking_id,
  b.user_id,
  b.organization_id,
  b.status as booking_status,
  cs.id as session_id,
  cs.start_at,
  cs.end_at,
  cs.capacity,
  cs.booking_count,
  cs.waitlist_count,
  c.id as class_id,
  c.name as class_name,
  c.description as class_description,
  c.duration_minutes,
  c.category,
  c.difficulty_level,
  c.image_url as class_image_url,
  i.id as instructor_id,
  i.full_name as instructor_name,
  i.bio as instructor_bio,
  i.image_url as instructor_image_url,
  l.id as location_id,
  l.name as location_name,
  l.address as location_address,
  l.latitude,
  l.longitude
FROM bookings b
JOIN class_sessions cs ON b.session_id = cs.id
JOIN classes c ON cs.class_id = c.id
LEFT JOIN instructors i ON cs.instructor_id = i.id
LEFT JOIN locations l ON cs.location_id = l.id
WHERE cs.start_at > NOW()
  AND b.status IN ('booked', 'waitlisted')
ORDER BY cs.start_at;

-- View for class schedule with availability
CREATE OR REPLACE VIEW mobile_class_schedule AS
SELECT 
  cs.id as session_id,
  cs.start_at,
  cs.end_at,
  cs.capacity,
  cs.booking_count,
  cs.waitlist_count,
  cs.status,
  (cs.capacity - cs.booking_count) as spots_available,
  CASE 
    WHEN cs.booking_count >= cs.capacity THEN 'full'
    WHEN cs.booking_count >= cs.capacity * 0.8 THEN 'almost_full'
    ELSE 'available'
  END as availability_status,
  c.id as class_id,
  c.name as class_name,
  c.description,
  c.duration_minutes,
  c.category,
  c.difficulty_level,
  c.image_url as class_image_url,
  c.requirements,
  i.id as instructor_id,
  i.full_name as instructor_name,
  i.image_url as instructor_image_url,
  l.id as location_id,
  l.name as location_name,
  l.address as location_address,
  cs.organization_id
FROM class_sessions cs
JOIN classes c ON cs.class_id = c.id
LEFT JOIN instructors i ON cs.instructor_id = i.id
LEFT JOIN locations l ON cs.location_id = l.id
WHERE cs.status = 'scheduled'
  AND cs.start_at > NOW();

-- ============================================
-- 5. FUNCTIONS FOR MOBILE APP
-- ============================================

-- Generate QR token for check-in
CREATE OR REPLACE FUNCTION generate_qr_token(
  p_user_id UUID,
  p_organization_id UUID,
  p_booking_id UUID DEFAULT NULL,
  p_token_type VARCHAR DEFAULT 'check_in'
)
RETURNS TABLE (
  token TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_client_id UUID;
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get client_id for user
  SELECT id INTO v_client_id
  FROM clients
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
  LIMIT 1;
  
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Client not found for user';
  END IF;
  
  -- Generate token (simplified - in production use proper JWT)
  v_token := encode(gen_random_bytes(32), 'base64');
  v_expires_at := NOW() + INTERVAL '60 seconds';
  
  -- Insert token
  INSERT INTO qr_tokens (
    user_id,
    organization_id,
    client_id,
    token,
    token_type,
    expires_at,
    booking_id
  ) VALUES (
    p_user_id,
    p_organization_id,
    v_client_id,
    v_token,
    p_token_type,
    v_expires_at,
    p_booking_id
  );
  
  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process QR check-in
CREATE OR REPLACE FUNCTION process_qr_check_in(
  p_token TEXT,
  p_location_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  check_in_id UUID
) AS $$
DECLARE
  v_token_record RECORD;
  v_check_in_id UUID;
BEGIN
  -- Validate token
  SELECT * INTO v_token_record
  FROM qr_tokens
  WHERE token = p_token
    AND expires_at > NOW()
    AND used = false;
    
  IF v_token_record IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid or expired token', NULL::UUID;
    RETURN;
  END IF;
  
  -- Mark token as used
  UPDATE qr_tokens
  SET used = true,
      used_at = NOW(),
      used_location_id = p_location_id
  WHERE id = v_token_record.id;
  
  -- Create check-in record
  INSERT INTO member_check_ins (
    user_id,
    organization_id,
    client_id,
    location_id,
    booking_id,
    qr_token_id,
    check_in_method
  ) VALUES (
    v_token_record.user_id,
    v_token_record.organization_id,
    v_token_record.client_id,
    p_location_id,
    v_token_record.booking_id,
    v_token_record.id,
    'qr'
  ) RETURNING id INTO v_check_in_id;
  
  -- If this is a booking check-in, update booking status
  IF v_token_record.booking_id IS NOT NULL THEN
    UPDATE bookings
    SET checked_in = true,
        checked_in_at = NOW()
    WHERE id = v_token_record.booking_id;
  END IF;
  
  RETURN QUERY SELECT true, 'Check-in successful', v_check_in_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get member stats for dashboard
CREATE OR REPLACE FUNCTION get_member_stats(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS TABLE (
  total_classes_attended INTEGER,
  current_streak INTEGER,
  this_week_classes INTEGER,
  this_month_classes INTEGER,
  favorite_class_name TEXT,
  favorite_instructor_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH attended_classes AS (
    SELECT 
      b.id,
      b.checked_in_at::DATE as class_date,
      c.name as class_name,
      i.full_name as instructor_name
    FROM bookings b
    JOIN class_sessions cs ON b.session_id = cs.id
    JOIN classes c ON cs.class_id = c.id
    LEFT JOIN instructors i ON cs.instructor_id = i.id
    WHERE b.user_id = p_user_id
      AND b.organization_id = p_organization_id
      AND b.checked_in = true
      AND b.status = 'booked'
  ),
  streaks AS (
    SELECT 
      class_date,
      class_date - (ROW_NUMBER() OVER (ORDER BY class_date))::INTEGER AS streak_group
    FROM attended_classes
    GROUP BY class_date
  ),
  current_streak_calc AS (
    SELECT 
      COUNT(*) as streak_length,
      MAX(class_date) as last_date
    FROM streaks
    GROUP BY streak_group
    HAVING MAX(class_date) >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY MAX(class_date) DESC
    LIMIT 1
  )
  SELECT 
    COUNT(DISTINCT ac.id)::INTEGER as total_classes_attended,
    COALESCE(cs.streak_length, 0)::INTEGER as current_streak,
    COUNT(DISTINCT ac.id) FILTER (WHERE ac.class_date >= DATE_TRUNC('week', CURRENT_DATE))::INTEGER as this_week_classes,
    COUNT(DISTINCT ac.id) FILTER (WHERE ac.class_date >= DATE_TRUNC('month', CURRENT_DATE))::INTEGER as this_month_classes,
    MODE() WITHIN GROUP (ORDER BY ac.class_name) as favorite_class_name,
    MODE() WITHIN GROUP (ORDER BY ac.instructor_name) as favorite_instructor_name
  FROM attended_classes ac
  CROSS JOIN current_streak_calc cs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE member_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_check_ins ENABLE ROW LEVEL SECURITY;

-- Member preferences policies
CREATE POLICY "Users can view own preferences" ON member_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON member_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON member_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Member devices policies
CREATE POLICY "Users can manage own devices" ON member_devices
  FOR ALL USING (auth.uid() = user_id);

-- QR tokens policies
CREATE POLICY "Users can view own tokens" ON qr_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all tokens" ON qr_tokens
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Check-ins policies
CREATE POLICY "Users can view own check-ins" ON member_check_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage check-ins" ON member_check_ins
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_member_preferences_user_org ON member_preferences(user_id, organization_id);
CREATE INDEX idx_member_devices_user ON member_devices(user_id);
CREATE INDEX idx_member_devices_token ON member_devices(device_token);
CREATE INDEX idx_qr_tokens_token ON qr_tokens(token);
CREATE INDEX idx_qr_tokens_expires ON qr_tokens(expires_at);
CREATE INDEX idx_member_check_ins_user ON member_check_ins(user_id);
CREATE INDEX idx_member_check_ins_date ON member_check_ins(check_in_at);

-- ============================================
-- 8. TRIGGERS
-- ============================================

-- Update timestamps
CREATE TRIGGER update_member_preferences_updated_at
  BEFORE UPDATE ON member_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_member_devices_updated_at
  BEFORE UPDATE ON member_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Clean up expired tokens periodically
CREATE OR REPLACE FUNCTION cleanup_expired_qr_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM qr_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. SAMPLE DATA FOR TESTING
-- ============================================

-- Note: Only run this in development
-- INSERT INTO member_preferences (user_id, organization_id) 
-- SELECT id, (SELECT id FROM organizations LIMIT 1) 
-- FROM auth.users 
-- LIMIT 1;