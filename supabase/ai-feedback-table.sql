-- Create table for AI response feedback and training examples
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  preferred_response TEXT NOT NULL,
  feedback_category TEXT CHECK (feedback_category IN ('tone', 'accuracy', 'length', 'sales_approach', 'information', 'other')),
  context_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for active feedback
CREATE INDEX IF NOT EXISTS idx_ai_feedback_active ON ai_feedback(is_active) WHERE is_active = true;

-- Create index for category
CREATE INDEX IF NOT EXISTS idx_ai_feedback_category ON ai_feedback(feedback_category);

-- Enable RLS
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all access for authenticated users" ON ai_feedback
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_feedback_updated_at
  BEFORE UPDATE ON ai_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some example feedback
INSERT INTO ai_feedback (user_message, ai_response, preferred_response, feedback_category, context_notes) VALUES
(
  'What are your prices?',
  'We offer various membership options! Our monthly unlimited is £45. Want to book a tour to discuss? 💪',
  'Great question! We have 3 membership options:\n• Monthly Unlimited: £45\n• Pay As You Go: £8/class\n• 10 Class Pack: £70\n\nWhich works best for your fitness goals?',
  'information',
  'Be more specific with pricing options upfront'
),
(
  'Where are you?',
  'We''re located in Harrogate and York! Which location works better for you?',
  'We have 2 convenient locations:\n📍 Harrogate: Unit 7 Claro Court Business Centre, HG1 4BA\n📍 York: Unit 5B Auster Road, YO30 4XA\n\nWhich is closer to you?',
  'accuracy',
  'Always include full addresses with postcodes'
);