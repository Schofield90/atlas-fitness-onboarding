-- Add payment_status column to payments table
-- This column tracks the detailed payment status from providers (Stripe, GoCardless)
-- While 'status' tracks the internal state (pending, completed, etc.)

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);

-- Populate payment_status from existing status column
UPDATE payments
SET payment_status = status
WHERE payment_status IS NULL;

COMMENT ON COLUMN payments.payment_status IS 'Detailed payment status from payment provider (paid, confirmed, paid_out, etc.)';
