-- Programs/Classes offered
CREATE TABLE IF NOT EXISTS public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_weeks INTEGER,
    price_pennies INTEGER, -- Store in pence for UK currency
    max_participants INTEGER DEFAULT 12,
    program_type VARCHAR(50) DEFAULT 'challenge', -- challenge, ongoing, trial, taster
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class sessions/time slots
CREATE TABLE IF NOT EXISTS public.class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name VARCHAR(255),
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    max_capacity INTEGER DEFAULT 12,
    current_bookings INTEGER DEFAULT 0,
    room_location VARCHAR(100),
    session_status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, running, completed, cancelled
    repeat_pattern JSONB, -- For recurring classes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.leads(id) ON DELETE CASCADE, -- Using leads table as customers
    class_session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE,
    booking_status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, cancelled, no_show, attended, waitlist
    booking_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
    stripe_payment_intent_id VARCHAR(255),
    attended_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Waitlist management
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    class_session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    auto_book BOOLEAN DEFAULT true, -- Automatically book when space available
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membership subscriptions
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
    stripe_subscription_id VARCHAR(255),
    membership_status VARCHAR(50) DEFAULT 'active', -- active, paused, cancelled, expired
    start_date DATE NOT NULL,
    end_date DATE,
    credits_remaining INTEGER, -- For credit-based systems
    unlimited_access BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class credits system
CREATE TABLE IF NOT EXISTS public.class_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
    credits_purchased INTEGER NOT NULL,
    credits_used INTEGER DEFAULT 0,
    credits_remaining INTEGER GENERATED ALWAYS AS (credits_purchased - credits_used) STORED,
    expiry_date DATE,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_sessions_org_time ON public.class_sessions(organization_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_session ON public.bookings(customer_id, class_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_session_status ON public.bookings(class_session_id, booking_status);
CREATE INDEX IF NOT EXISTS idx_waitlist_session_position ON public.waitlist(class_session_id, position);
CREATE INDEX IF NOT EXISTS idx_memberships_customer_status ON public.memberships(customer_id, membership_status);
CREATE INDEX IF NOT EXISTS idx_class_sessions_program ON public.class_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_trainer ON public.class_sessions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_programs_org ON public.programs(organization_id);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_customer_session 
    ON public.bookings(customer_id, class_session_id) 
    WHERE booking_status IN ('confirmed', 'attended');

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_unique_customer_session 
    ON public.waitlist(customer_id, class_session_id);

-- Enable RLS on all new tables
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_credits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for programs
CREATE POLICY "Users can view their organization's programs" ON public.programs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create programs for their organization" ON public.programs
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's programs" ON public.programs
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their organization's programs" ON public.programs
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

-- RLS Policies for class_sessions
CREATE POLICY "Users can view their organization's class sessions" ON public.class_sessions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create class sessions for their organization" ON public.class_sessions
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's class sessions" ON public.class_sessions
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their organization's class sessions" ON public.class_sessions
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

-- RLS Policies for bookings
CREATE POLICY "Users can view bookings for their organization" ON public.bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.class_sessions cs
            WHERE cs.id = bookings.class_session_id
            AND cs.organization_id IN (
                SELECT organization_id FROM public.users 
                WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create bookings for their organization" ON public.bookings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.class_sessions cs
            WHERE cs.id = class_session_id
            AND cs.organization_id IN (
                SELECT organization_id FROM public.users 
                WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update bookings for their organization" ON public.bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.class_sessions cs
            WHERE cs.id = bookings.class_session_id
            AND cs.organization_id IN (
                SELECT organization_id FROM public.users 
                WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete bookings for their organization" ON public.bookings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.class_sessions cs
            WHERE cs.id = bookings.class_session_id
            AND cs.organization_id IN (
                SELECT organization_id FROM public.users 
                WHERE id = auth.uid()
            )
        )
    );

-- RLS Policies for waitlist
CREATE POLICY "Users can view waitlist for their organization" ON public.waitlist
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.class_sessions cs
            WHERE cs.id = waitlist.class_session_id
            AND cs.organization_id IN (
                SELECT organization_id FROM public.users 
                WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage waitlist for their organization" ON public.waitlist
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.class_sessions cs
            WHERE cs.id = waitlist.class_session_id
            AND cs.organization_id IN (
                SELECT organization_id FROM public.users 
                WHERE id = auth.uid()
            )
        )
    );

-- RLS Policies for memberships
CREATE POLICY "Users can view memberships for their organization" ON public.memberships
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM public.leads 
            WHERE organization_id IN (
                SELECT organization_id FROM public.users 
                WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage memberships for their organization" ON public.memberships
    FOR ALL USING (
        customer_id IN (
            SELECT id FROM public.leads 
            WHERE organization_id IN (
                SELECT organization_id FROM public.users 
                WHERE id = auth.uid()
            )
        )
    );

-- RLS Policies for class_credits
CREATE POLICY "Users can view class credits for their organization" ON public.class_credits
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM public.leads 
            WHERE organization_id IN (
                SELECT organization_id FROM public.users 
                WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage class credits for their organization" ON public.class_credits
    FOR ALL USING (
        customer_id IN (
            SELECT id FROM public.leads 
            WHERE organization_id IN (
                SELECT organization_id FROM public.users 
                WHERE id = auth.uid()
            )
        )
    );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_sessions_updated_at BEFORE UPDATE ON public.class_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update current_bookings count
CREATE OR REPLACE FUNCTION update_class_session_bookings_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.booking_status IN ('confirmed', 'attended') THEN
        UPDATE public.class_sessions 
        SET current_bookings = current_bookings + 1
        WHERE id = NEW.class_session_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- If status changed from confirmed/attended to something else
        IF OLD.booking_status IN ('confirmed', 'attended') AND 
           NEW.booking_status NOT IN ('confirmed', 'attended') THEN
            UPDATE public.class_sessions 
            SET current_bookings = current_bookings - 1
            WHERE id = NEW.class_session_id;
        -- If status changed to confirmed/attended from something else
        ELSIF OLD.booking_status NOT IN ('confirmed', 'attended') AND 
              NEW.booking_status IN ('confirmed', 'attended') THEN
            UPDATE public.class_sessions 
            SET current_bookings = current_bookings + 1
            WHERE id = NEW.class_session_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.booking_status IN ('confirmed', 'attended') THEN
        UPDATE public.class_sessions 
        SET current_bookings = current_bookings - 1
        WHERE id = OLD.class_session_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic booking count updates
CREATE TRIGGER update_class_bookings_count
    AFTER INSERT OR UPDATE OR DELETE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_class_session_bookings_count();