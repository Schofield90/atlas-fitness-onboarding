-- Migration: Add Default Email Templates
-- Date: 2025-08-05
-- Description: Creates default email templates for common gym/fitness scenarios

-- Create function to add default templates for an organization
CREATE OR REPLACE FUNCTION create_default_email_templates(p_organization_id UUID)
RETURNS void AS $$
BEGIN
  -- Welcome Email Template
  INSERT INTO message_templates (
    organization_id,
    name,
    subject,
    type,
    category,
    content,
    variables,
    is_active,
    tags
  ) VALUES (
    p_organization_id,
    'Welcome to Atlas Fitness',
    'Welcome to {{organizationName}}, {{firstName}}! 🎉',
    'email',
    'welcome',
    E'Hi {{firstName}},\n\nWelcome to {{organizationName}}! We''re thrilled to have you join our fitness community.\n\nHere''s what happens next:\n\n1. **Book Your Free Consultation**: Reply to this email or call us to schedule your complimentary fitness assessment.\n\n2. **Download Our App**: Get instant access to class schedules, booking, and exclusive member content.\n\n3. **Join Our Community**: Follow us on social media for daily motivation, tips, and member spotlights.\n\nYour fitness journey starts now, and we''re here to support you every step of the way!\n\nIf you have any questions, don''t hesitate to reach out. We''re here to help.\n\nLet''s get stronger together!\n\nBest regards,\nThe {{organizationName}} Team\n\nP.S. As a welcome gift, enjoy 20% off your first personal training session. Just mention this email when booking!',
    ARRAY['firstName', 'organizationName'],
    true,
    ARRAY['welcome', 'new-lead', 'automated']
  );

  -- Follow-up Email Template
  INSERT INTO message_templates (
    organization_id,
    name,
    subject,
    type,
    category,
    content,
    variables,
    is_active,
    tags
  ) VALUES (
    p_organization_id,
    'Following Up - Ready to Start Your Fitness Journey?',
    'Quick check-in from {{organizationName}}, {{firstName}}',
    'email',
    'follow_up',
    E'Hi {{firstName}},\n\nI wanted to personally reach out since you recently expressed interest in {{organizationName}}.\n\nI know starting a fitness journey can feel overwhelming, but I''m here to make it simple and enjoyable for you.\n\nHere are a few ways we can help you get started:\n\n✅ **Free Trial Class**: Experience our most popular class with no commitment\n✅ **Facility Tour**: See our state-of-the-art equipment and meet our friendly team\n✅ **Custom Fitness Plan**: Get a personalized workout plan based on your goals\n\nWhat sounds most interesting to you?\n\nI''m available this week for a quick chat to answer any questions you might have. Would {{currentDate}} or {{currentTime}} work for a brief call?\n\nLooking forward to helping you achieve your fitness goals!\n\nBest,\n{{organizationName}} Team',
    ARRAY['firstName', 'organizationName', 'currentDate', 'currentTime'],
    true,
    ARRAY['follow-up', 'sales', 'automated']
  );

  -- Class Booking Confirmation Template
  INSERT INTO message_templates (
    organization_id,
    name,
    subject,
    type,
    category,
    content,
    variables,
    is_active,
    tags
  ) VALUES (
    p_organization_id,
    'Class Booking Confirmation',
    '✅ You''re booked for {{className}} on {{classDate}}',
    'email',
    'confirmation',
    E'Hi {{firstName}},\n\nGreat news! Your spot is confirmed for:\n\n📅 **Class**: {{className}}\n📆 **Date**: {{classDate}}\n⏰ **Time**: {{classTime}}\n👤 **Instructor**: {{instructorName}}\n📍 **Location**: {{location}}\n\n**What to Bring:**\n- Water bottle\n- Towel\n- Your energy and enthusiasm!\n\n**Arrival Tips:**\n- Please arrive 10 minutes early\n- Check in at reception\n- Let us know if you have any injuries or concerns\n\n**Need to Cancel?**\nLife happens! If you need to cancel, please do so at least 24 hours in advance through our app or by calling us.\n\nWe can''t wait to see you in class!\n\nSee you soon,\n{{organizationName}} Team',
    ARRAY['firstName', 'className', 'classDate', 'classTime', 'instructorName', 'location', 'organizationName'],
    true,
    ARRAY['booking', 'confirmation', 'transactional']
  );

  -- Membership Renewal Reminder Template
  INSERT INTO message_templates (
    organization_id,
    name,
    subject,
    type,
    category,
    content,
    variables,
    is_active,
    tags
  ) VALUES (
    p_organization_id,
    'Membership Renewal Reminder',
    '{{firstName}}, Your Membership Expires in {{daysUntilExpiry}} Days',
    'email',
    'reminder',
    E'Hi {{firstName}},\n\nWe hope you''ve been enjoying your fitness journey with us at {{organizationName}}!\n\nThis is a friendly reminder that your {{membershipType}} membership will expire on {{expiryDate}}.\n\n**Continue Your Progress!**\n\nDon''t let your hard work go to waste. Renew now and:\n\n🎯 Keep your momentum going\n💪 Lock in your current rate\n🎁 Get an exclusive renewal bonus\n\n**Special Renewal Offer**\nRenew before {{expiryDate}} and receive:\n- 1 FREE personal training session\n- Priority booking for all classes\n- Exclusive member-only workshops\n\n**Ready to Renew?**\n[Click here to renew online] or visit us at reception.\n\nQuestions about other membership options? I''d be happy to discuss what works best for your goals and schedule.\n\nThank you for being part of our fitness family!\n\nBest regards,\n{{organizationName}} Team',
    ARRAY['firstName', 'organizationName', 'membershipType', 'expiryDate', 'daysUntilExpiry'],
    true,
    ARRAY['renewal', 'retention', 'membership']
  );

  -- Win-Back Email Template
  INSERT INTO message_templates (
    organization_id,
    name,
    subject,
    type,
    category,
    content,
    variables,
    is_active,
    tags
  ) VALUES (
    p_organization_id,
    'We Miss You - Special Comeback Offer',
    '{{firstName}}, We''d Love to See You Back at {{organizationName}}! 🏃‍♀️',
    'email',
    'marketing',
    E'Hi {{firstName}},\n\nIt''s been a while since we''ve seen you at {{organizationName}}, and we wanted to check in.\n\nWe know life gets busy, and sometimes fitness takes a back seat. But we also know how amazing you feel when you''re taking care of yourself!\n\n**We''ve Made Some Exciting Changes:**\n\n🆕 New equipment and renovated facilities\n🏋️ Fresh class formats including HIIT, Yoga Flow, and Strength Training\n👥 New expert trainers on our team\n📱 Upgraded app with on-demand workouts\n\n**Your Exclusive Comeback Offer:**\n\nBecause we value you as a past member, here''s a special offer just for you:\n\n✨ **50% OFF your first month back**\n✨ **2 FREE personal training sessions**\n✨ **No joining fee**\n✨ **Flexible membership options**\n\nThis offer expires in 7 days, so don''t wait!\n\n**Ready to Restart Your Fitness Journey?**\n\nSimply reply to this email or call us at {{phoneNumber}} to claim your offer.\n\nWe''d love to welcome you back and help you achieve your fitness goals!\n\nMissing you,\n{{organizationName}} Team\n\nP.S. No pressure - if now''s not the right time, we''ll be here when you''re ready! 💪',
    ARRAY['firstName', 'organizationName', 'phoneNumber'],
    true,
    ARRAY['win-back', 'retention', 'marketing', 'special-offer']
  );

  -- Birthday Email Template
  INSERT INTO message_templates (
    organization_id,
    name,
    subject,
    type,
    category,
    content,
    variables,
    is_active,
    tags
  ) VALUES (
    p_organization_id,
    'Happy Birthday Message',
    '🎂 Happy Birthday, {{firstName}}! Here''s Your Special Gift',
    'email',
    'marketing',
    E'Hi {{firstName}},\n\nHAPPY BIRTHDAY! 🎉🎂\n\nThe entire team at {{organizationName}} wants to wish you an amazing day filled with joy, laughter, and maybe a little cake (you''ve earned it!)\n\n**Your Birthday Gift:**\n\nTo celebrate YOU, we have a special birthday present:\n\n🎁 **1 FREE Personal Training Session** (Value: £60)\n🎁 **Bring a Friend for FREE** to any class this month\n🎁 **20% OFF** any merchandise\n\nYour birthday voucher code: BDAY{{firstName}}{{currentYear}}\n\nValid for 30 days from your birthday.\n\n**Birthday Workout Challenge:**\nHow about celebrating with a special birthday workout? Do your age in reps of:\n- Squats\n- Push-ups\n- Sit-ups\n- High-fives (because you''re awesome!)\n\nWe''re so grateful to have you as part of our fitness family. Here''s to another year of crushing goals and feeling amazing!\n\nHave a fantastic birthday!\n\nWith birthday wishes,\n{{organizationName}} Team 🎈',
    ARRAY['firstName', 'organizationName', 'currentYear'],
    true,
    ARRAY['birthday', 'celebration', 'retention', 'automated']
  );

  -- SMS Templates
  
  -- SMS Welcome Template
  INSERT INTO message_templates (
    organization_id,
    name,
    subject,
    type,
    category,
    content,
    variables,
    is_active,
    tags
  ) VALUES (
    p_organization_id,
    'SMS Welcome Message',
    'Welcome SMS',
    'sms',
    'welcome',
    E'Hi {{firstName}}! Welcome to {{organizationName}} 💪 Ready to start your fitness journey? Book your free consultation: {{bookingLink}} or reply YES for a callback!',
    ARRAY['firstName', 'organizationName', 'bookingLink'],
    true,
    ARRAY['welcome', 'sms', 'automated']
  );

  -- SMS Class Reminder Template
  INSERT INTO message_templates (
    organization_id,
    name,
    subject,
    type,
    category,
    content,
    variables,
    is_active,
    tags
  ) VALUES (
    p_organization_id,
    'SMS Class Reminder',
    'Class Reminder SMS',
    'sms',
    'reminder',
    E'Hi {{firstName}}! Reminder: You have {{className}} tomorrow at {{classTime}}. See you there! 🏃‍♀️ Reply STOP to opt out.',
    ARRAY['firstName', 'className', 'classTime'],
    true,
    ARRAY['reminder', 'sms', 'class', 'automated']
  );

  -- WhatsApp Templates
  
  -- WhatsApp Quick Response Template
  INSERT INTO message_templates (
    organization_id,
    name,
    subject,
    type,
    category,
    content,
    variables,
    is_active,
    tags
  ) VALUES (
    p_organization_id,
    'WhatsApp Quick Response',
    'WhatsApp Quick Response',
    'whatsapp',
    'follow_up',
    E'Hi {{firstName}}! 👋\n\nThanks for your interest in {{organizationName}}!\n\nI can help you with:\n1️⃣ Class schedules\n2️⃣ Membership options\n3️⃣ Free trial booking\n4️⃣ Facility tour\n\nJust reply with a number or let me know what you''re interested in!',
    ARRAY['firstName', 'organizationName'],
    true,
    ARRAY['whatsapp', 'quick-response', 'automated']
  );

END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create default templates for new organizations
CREATE OR REPLACE FUNCTION create_default_templates_for_new_org()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create templates if this is a new organization (not an update)
  IF TG_OP = 'INSERT' THEN
    PERFORM create_default_email_templates(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS create_default_templates_on_org_create ON organizations;
CREATE TRIGGER create_default_templates_on_org_create
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_templates_for_new_org();

-- Create default templates for existing organizations that don't have any templates
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN 
    SELECT o.id 
    FROM organizations o
    LEFT JOIN message_templates mt ON o.id = mt.organization_id
    WHERE mt.id IS NULL
    GROUP BY o.id
  LOOP
    PERFORM create_default_email_templates(org_record.id);
  END LOOP;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION create_default_email_templates IS 'Creates a set of default email/SMS/WhatsApp templates for a new organization';
COMMENT ON TRIGGER create_default_templates_on_org_create ON organizations IS 'Automatically creates default message templates when a new organization is created';