-- Insert sample waiver templates
-- Note: You'll need to replace the organization_id with actual organization IDs from your database

-- Sample Liability Waiver
INSERT INTO waivers (organization_id, title, content, version, is_active, required_for) VALUES 
(
    '00000000-0000-0000-0000-000000000000', -- Replace with actual organization ID
    'General Liability Waiver',
    'I, the undersigned, acknowledge that I am participating in fitness activities at Atlas Fitness at my own risk. I understand that physical exercise involves inherent risks including, but not limited to, muscle strains, pulls, tears, broken bones, shin splints, heat prostration, faintness, or worse injuries, and even death.

I hereby waive, release, and discharge Atlas Fitness, its owners, employees, and agents from any and all claims, demands, or causes of action arising out of or related to any loss, damage, or injury that may be sustained by me while participating in such activities or while on the premises.

I understand that this waiver is intended to be as broad and inclusive as permitted by law, and I agree that if any portion is held invalid, the remainder will continue in full legal force and effect.

By signing below, I acknowledge that I have read this waiver, understand its contents, and sign it voluntarily.',
    1,
    true,
    ARRAY['membership', 'trial']
),
(
    '00000000-0000-0000-0000-000000000000', -- Replace with actual organization ID
    'Medical Information Release',
    'I hereby authorize Atlas Fitness staff to obtain emergency medical treatment for me in case of injury or illness during my participation in fitness activities.

I understand that Atlas Fitness does not provide medical coverage for injuries sustained during activities, and I am responsible for my own medical insurance coverage.

I certify that I am physically fit and have not been advised by a qualified medical professional to not participate in physical activities. I agree to immediately inform Atlas Fitness staff of any changes to my health status.

Medical Conditions/Allergies (if any): _______________

Emergency Contact: _______________
Phone: _______________

By signing below, I acknowledge that the information provided is accurate and complete.',
    1,
    true,
    ARRAY['membership']
),
(
    '00000000-0000-0000-0000-000000000000', -- Replace with actual organization ID
    'Photo/Video Release',
    'I hereby grant Atlas Fitness the right to use photographs, videos, or other recordings of me taken during my participation in activities at the facility.

This includes the right to use such materials for:
- Marketing and promotional materials
- Social media content
- Website content
- Advertising materials
- Educational purposes

I understand that I will not receive compensation for the use of these materials, and I waive any right to inspect or approve the finished materials.

I understand that these materials may be used indefinitely and may be distributed worldwide.

If I do not wish to be photographed or recorded, I will inform Atlas Fitness staff immediately.

By signing below, I grant permission for the use of my likeness as described above.',
    1,
    true,
    ARRAY['membership', 'class']
);

-- Note: After running this migration, update the organization_id values with actual IDs from your organizations table