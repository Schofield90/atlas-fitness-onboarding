-- Migration: General Automation Triggers
-- Created: 2025-08-06
-- Description: Creates tables and triggers for general automation needs including birthday reminders,
-- contact changes tracking, tags management, custom date reminders, and notes tracking

-- Create contact_tags table for better tag management
-- Purpose: Store tags separately with metadata for better organization and filtering
CREATE TABLE IF NOT EXISTS contact_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Tag details
  name text NOT NULL,
  description text,
  color text DEFAULT '#6B7280', -- Hex color for UI display
  category text DEFAULT 'general', -- 'general', 'status', 'behavior', 'source', 'custom'
  
  -- Usage tracking
  usage_count integer DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique tag names per organization
  CONSTRAINT contact_tags_unique UNIQUE (organization_id, name)
);

-- Create contact_tag_assignments table for many-to-many relationship
-- Purpose: Link contacts to tags with timestamp tracking
CREATE TABLE IF NOT EXISTS contact_tag_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES contact_tags(id) ON DELETE CASCADE,
  
  -- Assignment metadata
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate assignments
  CONSTRAINT contact_tag_assignments_unique UNIQUE (contact_id, tag_id)
);

-- Create birthday_reminders table
-- Purpose: Track birthday information and reminder settings for contacts
CREATE TABLE IF NOT EXISTS birthday_reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Birthday information
  birth_date date NOT NULL,
  birth_year integer, -- Optional, some people prefer not to share year
  
  -- Reminder settings
  reminder_enabled boolean DEFAULT true,
  reminder_days_before integer DEFAULT 1, -- Days before birthday to trigger
  custom_message text, -- Optional custom birthday message
  
  -- Automation tracking
  last_reminder_sent timestamptz,
  next_reminder_date date, -- Calculated field updated by trigger
  reminder_count integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One birthday record per contact
  CONSTRAINT birthday_reminders_contact_unique UNIQUE (contact_id)
);

-- Create custom_date_reminders table
-- Purpose: Store custom date-based reminders for contacts (anniversaries, appointments, etc.)
CREATE TABLE IF NOT EXISTS custom_date_reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Reminder details
  title text NOT NULL,
  description text,
  reminder_date date NOT NULL,
  reminder_type text NOT NULL DEFAULT 'one_time', -- 'one_time', 'annual', 'monthly', 'custom'
  
  -- Recurrence settings (for recurring reminders)
  recurrence_config jsonb DEFAULT '{}',
  /* Example recurrence_config:
  {
    "frequency": "annual", // 'annual', 'monthly', 'weekly', 'daily'
    "interval": 1, // Every X frequency units
    "end_date": "2025-12-31", // Optional end date
    "max_occurrences": 10 // Optional max occurrences
  }
  */
  
  -- Automation settings
  reminder_enabled boolean DEFAULT true,
  days_before integer DEFAULT 1, -- Days before date to trigger
  custom_message text,
  
  -- Execution tracking
  last_reminder_sent timestamptz,
  next_reminder_date date, -- Next calculated reminder date
  reminder_count integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contact_notes table
-- Purpose: Store notes about contacts with better organization and tracking
CREATE TABLE IF NOT EXISTS contact_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Note details
  title text,
  content text NOT NULL,
  note_type text DEFAULT 'general', -- 'general', 'call', 'meeting', 'important', 'follow_up'
  priority text DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  -- Organization
  tags text[] DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  is_private boolean DEFAULT false, -- Only visible to creator
  
  -- Related entities
  related_interaction_id uuid, -- Link to specific interaction
  related_task_id uuid, -- Link to staff task if applicable
  
  -- Metadata
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contact_change_log table
-- Purpose: Track all changes made to contact records for audit and automation triggers
CREATE TABLE IF NOT EXISTS contact_change_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Change details
  change_type text NOT NULL, -- 'created', 'updated', 'deleted', 'tag_added', 'tag_removed'
  field_name text, -- Which field was changed (for updates)
  old_value jsonb, -- Previous value
  new_value jsonb, -- New value
  
  -- Context
  change_source text DEFAULT 'manual', -- 'manual', 'automation', 'import', 'api', 'sync'
  change_reason text, -- Optional reason for the change
  
  -- User tracking
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_contact_tags_organization ON contact_tags(organization_id);
CREATE INDEX idx_contact_tags_category ON contact_tags(category);
CREATE INDEX idx_contact_tags_usage ON contact_tags(usage_count DESC);

CREATE INDEX idx_contact_tag_assignments_contact ON contact_tag_assignments(contact_id);
CREATE INDEX idx_contact_tag_assignments_tag ON contact_tag_assignments(tag_id);

CREATE INDEX idx_birthday_reminders_organization ON birthday_reminders(organization_id);
CREATE INDEX idx_birthday_reminders_contact ON birthday_reminders(contact_id);
CREATE INDEX idx_birthday_reminders_next_date ON birthday_reminders(next_reminder_date) WHERE reminder_enabled = true;
CREATE INDEX idx_birthday_reminders_birth_date ON birthday_reminders(birth_date);

CREATE INDEX idx_custom_date_reminders_organization ON custom_date_reminders(organization_id);
CREATE INDEX idx_custom_date_reminders_contact ON custom_date_reminders(contact_id);
CREATE INDEX idx_custom_date_reminders_next_date ON custom_date_reminders(next_reminder_date) WHERE reminder_enabled = true;
CREATE INDEX idx_custom_date_reminders_date ON custom_date_reminders(reminder_date);
CREATE INDEX idx_custom_date_reminders_type ON custom_date_reminders(reminder_type);

CREATE INDEX idx_contact_notes_organization ON contact_notes(organization_id);
CREATE INDEX idx_contact_notes_contact ON contact_notes(contact_id);
CREATE INDEX idx_contact_notes_type ON contact_notes(note_type);
CREATE INDEX idx_contact_notes_priority ON contact_notes(priority);
CREATE INDEX idx_contact_notes_created_by ON contact_notes(created_by);
CREATE INDEX idx_contact_notes_pinned ON contact_notes(is_pinned) WHERE is_pinned = true;

CREATE INDEX idx_contact_change_log_organization ON contact_change_log(organization_id);
CREATE INDEX idx_contact_change_log_contact ON contact_change_log(contact_id);
CREATE INDEX idx_contact_change_log_type ON contact_change_log(change_type);
CREATE INDEX idx_contact_change_log_date ON contact_change_log(changed_at DESC);
CREATE INDEX idx_contact_change_log_user ON contact_change_log(changed_by);

-- Create trigger functions
-- Function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE contact_tags 
    SET usage_count = usage_count + 1, last_used_at = now() 
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE contact_tags 
    SET usage_count = GREATEST(0, usage_count - 1) 
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Function to calculate next birthday reminder date
CREATE OR REPLACE FUNCTION calculate_next_birthday_reminder()
RETURNS TRIGGER AS $$
DECLARE
  current_year integer;
  birthday_this_year date;
  reminder_date date;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Calculate this year's birthday
  birthday_this_year := DATE(current_year || '-' || 
                             LPAD(EXTRACT(MONTH FROM NEW.birth_date)::text, 2, '0') || '-' || 
                             LPAD(EXTRACT(DAY FROM NEW.birth_date)::text, 2, '0'));
  
  -- If this year's birthday has passed, calculate for next year
  IF birthday_this_year < CURRENT_DATE THEN
    birthday_this_year := birthday_this_year + INTERVAL '1 year';
  END IF;
  
  -- Calculate reminder date
  reminder_date := birthday_this_year - INTERVAL '1 day' * COALESCE(NEW.reminder_days_before, 1);
  
  NEW.next_reminder_date := reminder_date;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate next custom date reminder
CREATE OR REPLACE FUNCTION calculate_next_custom_reminder()
RETURNS TRIGGER AS $$
DECLARE
  next_date date;
  config jsonb;
BEGIN
  config := COALESCE(NEW.recurrence_config, '{}'::jsonb);
  
  -- For one-time reminders
  IF NEW.reminder_type = 'one_time' THEN
    NEW.next_reminder_date := NEW.reminder_date - INTERVAL '1 day' * COALESCE(NEW.days_before, 1);
  
  -- For annual reminders
  ELSIF NEW.reminder_type = 'annual' THEN
    next_date := NEW.reminder_date;
    
    -- If this year's date has passed, move to next year
    IF NEW.reminder_date < CURRENT_DATE THEN
      next_date := NEW.reminder_date + INTERVAL '1 year';
    END IF;
    
    NEW.next_reminder_date := next_date - INTERVAL '1 day' * COALESCE(NEW.days_before, 1);
  
  -- For monthly reminders
  ELSIF NEW.reminder_type = 'monthly' THEN
    next_date := NEW.reminder_date;
    
    -- Find next occurrence
    WHILE next_date < CURRENT_DATE LOOP
      next_date := next_date + INTERVAL '1 month';
    END LOOP;
    
    NEW.next_reminder_date := next_date - INTERVAL '1 day' * COALESCE(NEW.days_before, 1);
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to log contact changes
CREATE OR REPLACE FUNCTION log_contact_changes()
RETURNS TRIGGER AS $$
DECLARE
  org_id uuid;
  change_type_val text;
BEGIN
  -- Get organization_id (it might come from different sources)
  IF TG_OP = 'DELETE' THEN
    -- For contacts table, we need to get org_id differently since contacts doesn't have organization_id directly
    -- We'll assume it comes from the related lead or client
    SELECT COALESCE(l.organization_id, c.organization_id) INTO org_id
    FROM contacts ct
    LEFT JOIN leads l ON l.id = ct.lead_id  
    LEFT JOIN clients c ON c.id = ct.client_id
    WHERE ct.id = OLD.id;
    
    change_type_val := 'deleted';
    
    INSERT INTO contact_change_log (organization_id, contact_id, change_type, changed_by, changed_at)
    VALUES (org_id, OLD.id, change_type_val, auth.uid(), now());
    
    RETURN OLD;
  END IF;
  
  -- For INSERT and UPDATE
  SELECT COALESCE(l.organization_id, c.organization_id) INTO org_id
  FROM contacts ct
  LEFT JOIN leads l ON l.id = ct.lead_id  
  LEFT JOIN clients c ON c.id = ct.client_id
  WHERE ct.id = NEW.id;
  
  IF TG_OP = 'INSERT' THEN
    change_type_val := 'created';
    
    INSERT INTO contact_change_log (organization_id, contact_id, change_type, new_value, changed_by, changed_at)
    VALUES (org_id, NEW.id, change_type_val, row_to_json(NEW), auth.uid(), now());
    
  ELSIF TG_OP = 'UPDATE' THEN
    change_type_val := 'updated';
    
    -- Log specific field changes
    IF OLD.first_name IS DISTINCT FROM NEW.first_name THEN
      INSERT INTO contact_change_log (organization_id, contact_id, change_type, field_name, old_value, new_value, changed_by, changed_at)
      VALUES (org_id, NEW.id, change_type_val, 'first_name', to_jsonb(OLD.first_name), to_jsonb(NEW.first_name), auth.uid(), now());
    END IF;
    
    IF OLD.last_name IS DISTINCT FROM NEW.last_name THEN
      INSERT INTO contact_change_log (organization_id, contact_id, change_type, field_name, old_value, new_value, changed_by, changed_at)
      VALUES (org_id, NEW.id, change_type_val, 'last_name', to_jsonb(OLD.last_name), to_jsonb(NEW.last_name), auth.uid(), now());
    END IF;
    
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      INSERT INTO contact_change_log (organization_id, contact_id, change_type, field_name, old_value, new_value, changed_by, changed_at)
      VALUES (org_id, NEW.id, change_type_val, 'email', to_jsonb(OLD.email), to_jsonb(NEW.email), auth.uid(), now());
    END IF;
    
    IF OLD.phone IS DISTINCT FROM NEW.phone THEN
      INSERT INTO contact_change_log (organization_id, contact_id, change_type, field_name, old_value, new_value, changed_by, changed_at)
      VALUES (org_id, NEW.id, change_type_val, 'phone', to_jsonb(OLD.phone), to_jsonb(NEW.phone), auth.uid(), now());
    END IF;
    
    IF OLD.tags IS DISTINCT FROM NEW.tags THEN
      INSERT INTO contact_change_log (organization_id, contact_id, change_type, field_name, old_value, new_value, changed_by, changed_at)
      VALUES (org_id, NEW.id, change_type_val, 'tags', to_jsonb(OLD.tags), to_jsonb(NEW.tags), auth.uid(), now());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to log tag assignments
CREATE OR REPLACE FUNCTION log_tag_assignments()
RETURNS TRIGGER AS $$
DECLARE
  org_id uuid;
  tag_name text;
BEGIN
  -- Get organization_id and tag name
  SELECT ct.organization_id, cta.name INTO org_id, tag_name
  FROM contacts c
  LEFT JOIN leads l ON l.id = c.lead_id  
  LEFT JOIN clients cl ON cl.id = c.client_id
  LEFT JOIN contact_tags cta ON cta.id = COALESCE(NEW.tag_id, OLD.tag_id)
  WHERE c.id = COALESCE(NEW.contact_id, OLD.contact_id);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO contact_change_log (organization_id, contact_id, change_type, new_value, changed_by, changed_at)
    VALUES (org_id, NEW.contact_id, 'tag_added', to_jsonb(tag_name), auth.uid(), now());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO contact_change_log (organization_id, contact_id, change_type, old_value, changed_by, changed_at)
    VALUES (org_id, OLD.contact_id, 'tag_removed', to_jsonb(tag_name), auth.uid(), now());
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_tag_usage_on_assignment
  AFTER INSERT OR DELETE ON contact_tag_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER calculate_birthday_reminder_date
  BEFORE INSERT OR UPDATE ON birthday_reminders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_next_birthday_reminder();

CREATE TRIGGER calculate_custom_reminder_date
  BEFORE INSERT OR UPDATE ON custom_date_reminders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_next_custom_reminder();

CREATE TRIGGER log_contact_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION log_contact_changes();

CREATE TRIGGER log_tag_assignments_trigger
  AFTER INSERT OR DELETE ON contact_tag_assignments
  FOR EACH ROW
  EXECUTE FUNCTION log_tag_assignments();

-- Create updated_at triggers for tables that need them
CREATE TRIGGER update_contact_tags_updated_at
  BEFORE UPDATE ON contact_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_birthday_reminders_updated_at
  BEFORE UPDATE ON birthday_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_date_reminders_updated_at
  BEFORE UPDATE ON custom_date_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_notes_updated_at
  BEFORE UPDATE ON contact_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthday_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_date_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_change_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Contact Tags policies
CREATE POLICY "Users can view tags from their organization"
  ON contact_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = contact_tags.organization_id
    )
  );

CREATE POLICY "Users can manage tags for their organization"
  ON contact_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = contact_tags.organization_id
    )
  );

-- Contact Tag Assignments policies
CREATE POLICY "Users can view tag assignments for their organization"
  ON contact_tag_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contact_tags ct
      JOIN users u ON u.organization_id = ct.organization_id
      WHERE ct.id = contact_tag_assignments.tag_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage tag assignments for their organization"
  ON contact_tag_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contact_tags ct
      JOIN users u ON u.organization_id = ct.organization_id
      WHERE ct.id = contact_tag_assignments.tag_id
      AND u.id = auth.uid()
    )
  );

-- Birthday Reminders policies
CREATE POLICY "Users can view birthday reminders from their organization"
  ON birthday_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = birthday_reminders.organization_id
    )
  );

CREATE POLICY "Users can manage birthday reminders for their organization"
  ON birthday_reminders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = birthday_reminders.organization_id
    )
  );

-- Custom Date Reminders policies
CREATE POLICY "Users can view custom reminders from their organization"
  ON custom_date_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = custom_date_reminders.organization_id
    )
  );

CREATE POLICY "Users can manage custom reminders for their organization"
  ON custom_date_reminders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = custom_date_reminders.organization_id
    )
  );

-- Contact Notes policies
CREATE POLICY "Users can view notes from their organization"
  ON contact_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = contact_notes.organization_id
    )
    AND (is_private = false OR created_by = auth.uid())
  );

CREATE POLICY "Users can manage notes for their organization"
  ON contact_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = contact_notes.organization_id
    )
  );

CREATE POLICY "Users can update their own notes"
  ON contact_notes FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own notes"
  ON contact_notes FOR DELETE
  USING (created_by = auth.uid());

-- Contact Change Log policies
CREATE POLICY "Users can view change log from their organization"
  ON contact_change_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = contact_change_log.organization_id
    )
  );

-- Service role can manage all (for automation)
CREATE POLICY "Service role can manage all general trigger tables"
  ON contact_tags FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all tag assignments"
  ON contact_tag_assignments FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all birthday reminders"
  ON birthday_reminders FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all custom reminders"
  ON custom_date_reminders FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all contact notes"
  ON contact_notes FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage contact change log"
  ON contact_change_log FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Add helpful comments
COMMENT ON TABLE contact_tags IS 'Organized tag system for contact categorization with usage tracking';
COMMENT ON TABLE contact_tag_assignments IS 'Many-to-many relationship between contacts and tags';
COMMENT ON TABLE birthday_reminders IS 'Birthday tracking and automated reminder system for contacts';
COMMENT ON TABLE custom_date_reminders IS 'Custom date-based reminders for contacts with recurrence support';
COMMENT ON TABLE contact_notes IS 'Enhanced note-taking system for contacts with organization features';
COMMENT ON TABLE contact_change_log IS 'Audit trail for all contact changes to trigger automations';

COMMENT ON COLUMN custom_date_reminders.recurrence_config IS 'JSON configuration for recurring reminders';
COMMENT ON COLUMN contact_notes.is_private IS 'Private notes only visible to the creator';
COMMENT ON COLUMN contact_change_log.change_source IS 'Source of the change for audit and automation purposes';