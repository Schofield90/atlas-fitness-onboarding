-- Booking System Integration with Existing CRM
-- This migration creates booking tables that integrate with the existing gym CRM system

-- Programs offered by gyms
CREATE TABLE IF NOT EXISTS gym_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0.00,
    duration_minutes INTEGER DEFAULT 60,
    max_participants INTEGER DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Class schedules for programs
CREATE TABLE IF NOT EXISTS class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES gym_programs(id) ON DELETE CASCADE,
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    instructor_name VARCHAR,
    room_location VARCHAR,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    max_capacity INTEGER DEFAULT 20,
    current_bookings INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual bookings by clients
CREATE TABLE IF NOT EXISTS class_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES class_schedules(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    status VARCHAR DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    booked_at TIMESTAMP DEFAULT NOW(),
    cancelled_at TIMESTAMP NULL,
    notes TEXT
);

-- Waitlist for full classes
CREATE TABLE IF NOT EXISTS class_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES class_schedules(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR DEFAULT 'waiting' CHECK (status IN ('waiting', 'converted', 'expired'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gym_programs_gym_id ON gym_programs(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_programs_active ON gym_programs(gym_id, is_active);

CREATE INDEX IF NOT EXISTS idx_class_schedules_gym_id ON class_schedules(gym_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_program_id ON class_schedules(program_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_start_time ON class_schedules(start_time);

CREATE INDEX IF NOT EXISTS idx_class_bookings_schedule_id ON class_bookings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_client_id ON class_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_gym_id ON class_bookings(gym_id);

CREATE INDEX IF NOT EXISTS idx_class_waitlist_schedule_id ON class_waitlist(schedule_id);
CREATE INDEX IF NOT EXISTS idx_class_waitlist_client_id ON class_waitlist(client_id);

-- Create update triggers for updated_at fields
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gym_programs_updated_at 
    BEFORE UPDATE ON gym_programs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_schedules_updated_at 
    BEFORE UPDATE ON class_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE gym_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_waitlist ENABLE ROW LEVEL SECURITY;

-- Policies for gym_programs
CREATE POLICY "Gym staff can manage their gym's programs" ON gym_programs
    FOR ALL USING (
        gym_id IN (
            SELECT gym_id FROM users WHERE id = auth.uid()
        )
    );

-- Policies for class_schedules
CREATE POLICY "Gym staff can manage their gym's schedules" ON class_schedules
    FOR ALL USING (
        gym_id IN (
            SELECT gym_id FROM users WHERE id = auth.uid()
        )
    );

-- Policies for class_bookings
CREATE POLICY "Users can view bookings for their gym" ON class_bookings
    FOR SELECT USING (
        gym_id IN (
            SELECT gym_id FROM users WHERE id = auth.uid()
        )
        OR
        client_id IN (
            SELECT id FROM clients WHERE gym_id IN (
                SELECT gym_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create bookings for their gym's clients" ON class_bookings
    FOR INSERT WITH CHECK (
        gym_id IN (
            SELECT gym_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update bookings for their gym" ON class_bookings
    FOR UPDATE USING (
        gym_id IN (
            SELECT gym_id FROM users WHERE id = auth.uid()
        )
    );

-- Policies for class_waitlist
CREATE POLICY "Users can manage waitlist for their gym" ON class_waitlist
    FOR ALL USING (
        gym_id IN (
            SELECT gym_id FROM users WHERE id = auth.uid()
        )
    );

-- Function to automatically update current_bookings count
CREATE OR REPLACE FUNCTION update_class_booking_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        UPDATE class_schedules 
        SET current_bookings = current_bookings + 1
        WHERE id = NEW.schedule_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status changes
        IF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            UPDATE class_schedules 
            SET current_bookings = current_bookings - 1
            WHERE id = NEW.schedule_id;
        ELSIF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
            UPDATE class_schedules 
            SET current_bookings = current_bookings + 1
            WHERE id = NEW.schedule_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
        UPDATE class_schedules 
        SET current_bookings = current_bookings - 1
        WHERE id = OLD.schedule_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER booking_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON class_bookings
    FOR EACH ROW EXECUTE FUNCTION update_class_booking_count();

-- Function to handle waitlist automation
CREATE OR REPLACE FUNCTION process_waitlist_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    next_client_id UUID;
    schedule_capacity INTEGER;
    current_count INTEGER;
BEGIN
    -- Only process if a booking was cancelled or deleted
    IF (TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'cancelled') OR
       (TG_OP = 'DELETE' AND OLD.status = 'confirmed') THEN
        
        -- Get schedule info
        SELECT max_capacity, current_bookings INTO schedule_capacity, current_count
        FROM class_schedules 
        WHERE id = COALESCE(NEW.schedule_id, OLD.schedule_id);
        
        -- If there's now space and people on waitlist
        IF current_count < schedule_capacity THEN
            -- Get next person on waitlist
            SELECT client_id INTO next_client_id
            FROM class_waitlist 
            WHERE schedule_id = COALESCE(NEW.schedule_id, OLD.schedule_id)
              AND status = 'waiting'
            ORDER BY position ASC, joined_at ASC
            LIMIT 1;
            
            -- If someone is waiting, book them automatically
            IF next_client_id IS NOT NULL THEN
                -- Create booking
                INSERT INTO class_bookings (schedule_id, client_id, gym_id, status, notes)
                SELECT 
                    COALESCE(NEW.schedule_id, OLD.schedule_id),
                    next_client_id,
                    COALESCE(NEW.gym_id, OLD.gym_id),
                    'confirmed',
                    'Auto-booked from waitlist'
                WHERE NOT EXISTS (
                    SELECT 1 FROM class_bookings 
                    WHERE schedule_id = COALESCE(NEW.schedule_id, OLD.schedule_id)
                      AND client_id = next_client_id
                      AND status = 'confirmed'
                );
                
                -- Update waitlist status
                UPDATE class_waitlist 
                SET status = 'converted'
                WHERE schedule_id = COALESCE(NEW.schedule_id, OLD.schedule_id)
                  AND client_id = next_client_id
                  AND status = 'waiting';
                  
                -- Update positions for remaining waitlist
                UPDATE class_waitlist 
                SET position = position - 1
                WHERE schedule_id = COALESCE(NEW.schedule_id, OLD.schedule_id)
                  AND status = 'waiting'
                  AND position > (
                      SELECT position FROM class_waitlist 
                      WHERE schedule_id = COALESCE(NEW.schedule_id, OLD.schedule_id)
                        AND client_id = next_client_id
                        AND status = 'converted'
                  );
            END IF;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER waitlist_automation_trigger
    AFTER UPDATE OR DELETE ON class_bookings
    FOR EACH ROW EXECUTE FUNCTION process_waitlist_on_cancellation();