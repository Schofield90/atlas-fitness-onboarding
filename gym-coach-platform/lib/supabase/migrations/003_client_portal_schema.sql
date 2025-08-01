-- Client Portal Schema Extensions
-- For Atlas Fitness Client-Side Booking & Management System

-- Enable necessary extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create client_sessions table for booking management
CREATE TABLE IF NOT EXISTS client_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Session Details
  session_type VARCHAR NOT NULL CHECK (session_type IN ('gym_class', 'personal_training', 'coaching_call')),
  title VARCHAR NOT NULL,
  description TEXT,
  
  -- Scheduling
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  timezone VARCHAR DEFAULT 'Europe/London',
  
  -- Assignment
  trainer_id UUID REFERENCES users(id),
  coach_id UUID REFERENCES users(id),
  room_or_location VARCHAR,
  
  -- Booking Status
  status VARCHAR DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  booking_status VARCHAR DEFAULT 'confirmed',
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  cancelled_by UUID REFERENCES users(id),
  
  -- Session Data
  max_participants INTEGER DEFAULT 1,
  current_participants INTEGER DEFAULT 0,
  session_notes TEXT,
  client_notes TEXT,
  
  -- Payment
  cost DECIMAL(10,2),
  currency VARCHAR DEFAULT 'GBP',
  payment_status VARCHAR DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_intent_id VARCHAR,
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule JSONB,
  parent_session_id UUID REFERENCES client_sessions(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create available_slots table
CREATE TABLE IF NOT EXISTS available_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Slot Details
  slot_type VARCHAR NOT NULL CHECK (slot_type IN ('gym_class', 'personal_training', 'coaching_call')),
  title VARCHAR NOT NULL,
  description TEXT,
  
  -- Timing
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  timezone VARCHAR DEFAULT 'Europe/London',
  
  -- Availability
  max_bookings INTEGER DEFAULT 1,
  current_bookings INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  
  -- Assignment
  trainer_id UUID REFERENCES users(id),
  coach_id UUID REFERENCES users(id),
  location VARCHAR,
  
  -- Pricing
  base_cost DECIMAL(10,2),
  member_cost DECIMAL(10,2),
  currency VARCHAR DEFAULT 'GBP',
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule JSONB,
  
  -- Rules
  booking_rules JSONB DEFAULT '{}', -- advance_booking_hours, cancellation_policy, etc.
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create client_payment_methods table
CREATE TABLE IF NOT EXISTS client_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Payment Provider
  provider VARCHAR NOT NULL CHECK (provider IN ('stripe', 'paypal')),
  provider_payment_method_id VARCHAR NOT NULL,
  
  -- Card/Account Details (encrypted)
  type VARCHAR NOT NULL CHECK (type IN ('card', 'bank_account', 'paypal')),
  last_four VARCHAR,
  brand VARCHAR,
  exp_month INTEGER,
  exp_year INTEGER,
  
  -- Status
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  billing_address JSONB,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Referrer
  referrer_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  referral_code VARCHAR UNIQUE NOT NULL,
  
  -- Referee
  referee_email VARCHAR,
  referee_phone VARCHAR,
  referee_client_id UUID REFERENCES clients(id),
  
  -- Status
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'activated', 'completed')),
  referred_at TIMESTAMP DEFAULT NOW(),
  signed_up_at TIMESTAMP,
  activated_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Rewards
  referrer_reward_type VARCHAR CHECK (referrer_reward_type IN ('credit', 'discount', 'free_session')),
  referrer_reward_amount DECIMAL(10,2),
  referrer_reward_applied BOOLEAN DEFAULT FALSE,
  
  referee_reward_type VARCHAR CHECK (referee_reward_type IN ('credit', 'discount', 'free_session')),
  referee_reward_amount DECIMAL(10,2),
  referee_reward_applied BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create client_notifications table
CREATE TABLE IF NOT EXISTS client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Notification Details
  type VARCHAR NOT NULL CHECK (type IN ('booking_reminder', 'payment_due', 'session_cancelled', 'referral_reward', 'general')),
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  
  -- Delivery
  channels VARCHAR[] DEFAULT ARRAY['in_app'],
  priority VARCHAR DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  -- Scheduling
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  
  -- Related Data
  related_session_id UUID REFERENCES client_sessions(id),
  related_data JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add additional columns to existing clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type VARCHAR DEFAULT 'gym_member' CHECK (client_type IN ('gym_member', 'coaching_client', 'both'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referral_code VARCHAR UNIQUE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES clients(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS medical_conditions JSONB DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS fitness_goals JSONB DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_sessions_client_time ON client_sessions(client_id, start_time);
CREATE INDEX IF NOT EXISTS idx_client_sessions_organization ON client_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_status ON client_sessions(status);
CREATE INDEX IF NOT EXISTS idx_available_slots_time_type ON available_slots(start_time, slot_type, is_available);
CREATE INDEX IF NOT EXISTS idx_available_slots_organization ON available_slots(organization_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_client_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_unread ON client_notifications(client_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_client_payment_methods_client ON client_payment_methods(client_id);

-- Create triggers for updated_at
CREATE TRIGGER update_client_sessions_updated_at BEFORE UPDATE ON client_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_available_slots_updated_at BEFORE UPDATE ON available_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_payment_methods_updated_at BEFORE UPDATE ON client_payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE client_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for client_sessions
CREATE POLICY "Clients can view their own sessions" ON client_sessions
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Staff can view all sessions in their organization" ON client_sessions
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Clients can create their own sessions" ON client_sessions
    FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can update their own sessions" ON client_sessions
    FOR UPDATE USING (client_id = auth.uid());

-- Create RLS policies for available_slots
CREATE POLICY "Everyone can view available slots" ON available_slots
    FOR SELECT USING (is_available = TRUE);

CREATE POLICY "Staff can manage slots in their organization" ON available_slots
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Create RLS policies for client_payment_methods
CREATE POLICY "Clients can view their own payment methods" ON client_payment_methods
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Clients can manage their own payment methods" ON client_payment_methods
    FOR ALL USING (client_id = auth.uid());

-- Create RLS policies for referrals
CREATE POLICY "Clients can view their own referrals" ON referrals
    FOR SELECT USING (referrer_client_id = auth.uid() OR referee_client_id = auth.uid());

CREATE POLICY "Staff can view all referrals in their organization" ON referrals
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Clients can create referrals" ON referrals
    FOR INSERT WITH CHECK (referrer_client_id = auth.uid());

-- Create RLS policies for client_notifications
CREATE POLICY "Clients can view their own notifications" ON client_notifications
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Clients can update their own notifications" ON client_notifications
    FOR UPDATE USING (client_id = auth.uid());

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR AS $$
DECLARE
    code VARCHAR;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 8-character alphanumeric code
        code := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM referrals WHERE referral_code = code) INTO exists_check;
        
        -- If code doesn't exist, return it
        IF NOT exists_check THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle referral code generation for new clients
CREATE OR REPLACE FUNCTION generate_client_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate referral codes for new clients
CREATE TRIGGER generate_referral_code_trigger
    BEFORE INSERT ON clients
    FOR EACH ROW
    EXECUTE FUNCTION generate_client_referral_code();

-- Create function to calculate session availability
CREATE OR REPLACE FUNCTION update_slot_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update current bookings count
        UPDATE available_slots 
        SET current_bookings = current_bookings + 1,
            is_available = (current_bookings + 1 < max_bookings)
        WHERE id = (
            SELECT id FROM available_slots 
            WHERE start_time = NEW.start_time 
            AND slot_type = NEW.session_type
            AND organization_id = NEW.organization_id
            LIMIT 1
        );
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status = 'cancelled') THEN
        -- Decrease current bookings count
        UPDATE available_slots 
        SET current_bookings = GREATEST(0, current_bookings - 1),
            is_available = TRUE
        WHERE id = (
            SELECT id FROM available_slots 
            WHERE start_time = COALESCE(OLD.start_time, NEW.start_time)
            AND slot_type = COALESCE(OLD.session_type, NEW.session_type)
            AND organization_id = COALESCE(OLD.organization_id, NEW.organization_id)
            LIMIT 1
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update slot availability
CREATE TRIGGER update_slot_availability_trigger
    AFTER INSERT OR UPDATE OR DELETE ON client_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_slot_availability();