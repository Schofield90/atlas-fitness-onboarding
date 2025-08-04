ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES customer_memberships(id);