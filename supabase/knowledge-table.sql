-- Create knowledge table for AI training data
CREATE TABLE IF NOT EXISTS knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_created_at ON knowledge(created_at);

-- Enable Row Level Security
ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;

-- Create policies for access
CREATE POLICY "Enable read access for all users" ON knowledge
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON knowledge
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON knowledge
  FOR UPDATE USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_knowledge_updated_at BEFORE UPDATE ON knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial gym knowledge data
INSERT INTO knowledge (type, content, metadata) VALUES

-- Standard Operating Procedures (SOPs)
('sop', 'New Lead Process: 1) Respond within 5 minutes during business hours. 2) Ask about their fitness goals. 3) Offer a free trial or tour. 4) Collect contact details. 5) Book them for a specific time. 6) Send confirmation and reminder.', '{"category": "lead_management"}'),

('sop', 'Trial Booking Process: 1) Check availability in our calendar. 2) Offer 3 time options. 3) Collect name and email. 4) Explain what to bring (water, towel, workout clothes). 5) Send confirmation with location details. 6) Set reminder for 24 hours before.', '{"category": "booking"}'),

('sop', 'Objection Handling - Price: Acknowledge their concern. Emphasize value over cost. Mention: expert trainers, community support, flexible plans, results guarantee. Offer payment plans if available. Focus on ROI for their health.', '{"category": "sales"}'),

('sop', 'Follow-up Sequence: Day 1: Thank you message. Day 3: Check how trial went, address concerns. Day 5: Special offer with deadline. Day 7: Final offer reminder. Day 10: Value-based content. Day 14: Check-in and different offer.', '{"category": "nurturing"}'),

-- Frequently Asked Questions
('faq', 'What are your opening hours? We''re open Monday-Friday 5:30am-9pm, Saturday 7am-7pm, and Sunday 8am-5pm.', '{"priority": "high"}'),

('faq', 'How much does membership cost? We have flexible plans starting from £29.99/month for off-peak access, £39.99/month for standard, and £59.99/month for premium with classes included.', '{"priority": "high"}'),

('faq', 'Do you offer personal training? Yes! Personal training starts at £30/session with packages available. All trainers are certified and specialize in different areas.', '{"priority": "medium"}'),

('faq', 'Can I freeze my membership? Yes, you can freeze for up to 3 months per year with 7 days notice. There''s a £5/month freeze fee.', '{"priority": "medium"}'),

-- Pricing Information
('pricing', 'Membership Options: 1) Basic (£29.99): Gym access Mon-Fri 9am-4pm. 2) Standard (£39.99): Full gym access. 3) Premium (£59.99): Gym + unlimited classes. 4) VIP (£89.99): All access + monthly PT session.', '{"type": "membership"}'),

('pricing', 'Class Packages: Drop-in £8, 5-class pack £35, 10-class pack £60, Unlimited monthly £25 (members) or £45 (non-members).', '{"type": "classes"}'),

-- Policies
('policies', 'Cancellation Policy: 30 days notice required. Cancel anytime after initial 3-month period. No cancellation fees. Final payment covers notice period.', '{"type": "membership"}'),

('policies', 'Guest Policy: Members can bring 1 guest per month for free. Additional guests £5 day pass. Guests must complete health waiver.', '{"type": "guest"}'),

-- Interactive Quiz Content
('quiz', '{"question": "What are your main fitness goals?", "options": ["Lose weight", "Build muscle", "Improve fitness", "Train for event"], "responses": {"Lose weight": "Great! Our HIIT classes and nutrition guidance have helped members lose an average of 2kg per month.", "Build muscle": "Perfect! Our strength training area and expert PTs can help you gain lean muscle safely.", "Improve fitness": "Excellent! We have cardio equipment and classes to boost your endurance and energy.", "Train for event": "Awesome! Our PTs specialize in sport-specific training. What event are you training for?"}}', '{"order": 1}'),

('quiz', '{"question": "How often do you currently exercise?", "options": ["Never", "1-2 times/week", "3-4 times/week", "5+ times/week"], "responses": {"Never": "No worries! Our beginner-friendly approach will ease you in safely. We all start somewhere!", "1-2 times/week": "Good foundation! We can help you build consistency and see faster results.", "3-4 times/week": "Impressive! You''re already consistent. We can help optimize your workouts.", "5+ times/week": "You''re dedicated! Our variety of equipment and classes will keep you challenged."}}', '{"order": 2}'),

('quiz', '{"question": "What''s holding you back from joining a gym?", "options": ["Cost concerns", "Time constraints", "Intimidation", "Not sure how to start"], "responses": {"Cost concerns": "I understand. Consider this: £40/month is just £1.33/day - less than a coffee! Plus we offer flexible payment plans.", "Time constraints": "Our 5:30am opening and express 30-min classes fit busy schedules. Most members find they save time with our efficient workouts.", "Intimidation": "Totally normal! Our judgment-free zone and friendly community will make you feel at home from day one.", "Not sure how to start": "That''s what we''re here for! Every membership includes a free induction and program design."}}', '{"order": 3}'),

-- Training Style Guide
('style', 'Communication Tone: Friendly, encouraging, and professional. Use active language. Keep responses under 300 characters for WhatsApp. Always end with a question or clear call-to-action.', '{"platform": "whatsapp"}'),

('style', 'Sales Approach: Consultative not pushy. Focus on their goals and how we can help. Use social proof when relevant. Create urgency through limited offers, not pressure.', '{"type": "sales"}'),

-- Schedule
('schedule', 'Peak Hours: Weekdays 6-9am and 5-8pm. Saturdays 9am-12pm. Consider off-peak membership if you can train at quieter times for better equipment access and pricing.', '{"type": "busy_times"}'),

('schedule', 'Class Schedule Highlights: Morning HIIT at 6am Mon/Wed/Fri. Lunchtime Express classes 12:15pm daily. Evening Yoga 7pm Tue/Thu. Weekend Spin Saturdays 9am.', '{"type": "popular_classes"}');

-- Add a default SOP for unhandled queries
INSERT INTO knowledge (type, content, metadata) VALUES
('sop', 'For any questions I cannot answer: Apologize for not having that specific information, offer to have a team member call them back within 2 hours, collect their contact details, and pivot to booking a tour or trial where we can address all their questions in person.', '{"category": "fallback"}');