-- Simple fix for in-app messaging "pending" status issue
-- This works with your existing schema without adding new columns

-- 1. Create a trigger to auto-deliver in-app messages
CREATE OR REPLACE FUNCTION public.auto_deliver_inapp_messages()
RETURNS TRIGGER AS $$
BEGIN
  -- If it's an in-app message (via In-App channel or no specific SMS/email/WhatsApp type)
  -- Mark it as delivered immediately since it's already in the database
  IF (NEW.channel = 'in_app' OR NEW.channel = 'In-App' OR
      NEW.type = 'in_app' OR NEW.type = 'In-App' OR
      (NEW.type IS NULL OR NEW.type = '') OR
      (NEW.channel IS NULL AND NEW.type NOT IN ('sms', 'email', 'whatsapp', 'SMS', 'Email', 'WhatsApp'))) THEN
    NEW.status := 'delivered';
    NEW.sent_at := COALESCE(NEW.sent_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_deliver_inapp_trigger ON public.messages;

-- 3. Create the trigger
CREATE TRIGGER auto_deliver_inapp_trigger
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_deliver_inapp_messages();

-- 4. Fix all existing pending in-app messages
UPDATE public.messages
SET 
  status = 'delivered',
  sent_at = COALESCE(sent_at, created_at),
  updated_at = NOW()
WHERE 
  status = 'pending' AND
  (
    channel = 'in_app' OR 
    channel = 'In-App' OR
    type = 'in_app' OR 
    type = 'In-App' OR
    (channel IS NULL AND type IS NULL) OR
    (channel IS NULL AND type = '') OR
    (channel = '' AND type = '') OR
    (channel IS NULL AND type NOT IN ('sms', 'email', 'whatsapp', 'SMS', 'Email', 'WhatsApp'))
  );

-- 5. Also update messages that are clearly in-app based on not having phone/email delivery info
UPDATE public.messages
SET 
  status = 'delivered',
  sent_at = COALESCE(sent_at, created_at),
  updated_at = NOW()
WHERE 
  status = 'pending' AND
  to_number IS NULL AND 
  to_email IS NULL AND
  twilio_sid IS NULL AND
  resend_id IS NULL;

-- 6. Create an update trigger to fix status on updates too
CREATE OR REPLACE FUNCTION public.fix_inapp_message_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If updating a message and it's in-app but still pending, fix it
  IF NEW.status = 'pending' AND
     (NEW.channel = 'in_app' OR NEW.channel = 'In-App' OR
      NEW.type = 'in_app' OR NEW.type = 'In-App' OR
      (NEW.to_number IS NULL AND NEW.to_email IS NULL)) THEN
    NEW.status := 'delivered';
    NEW.sent_at := COALESCE(NEW.sent_at, NEW.created_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fix_inapp_status_trigger ON public.messages;
CREATE TRIGGER fix_inapp_status_trigger
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.fix_inapp_message_status();

-- 7. Get count of fixed messages
SELECT 
  COUNT(*) as fixed_messages,
  'Messages updated from pending to delivered' as description
FROM public.messages
WHERE 
  status = 'delivered' AND
  updated_at >= NOW() - INTERVAL '1 minute';

-- Success message
SELECT 'In-app messaging fix applied successfully! Pending messages have been marked as delivered.' as status;