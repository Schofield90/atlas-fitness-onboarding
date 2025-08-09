-- Add category and other settings columns to programs table
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#F97316',
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

-- Add comment for clarity
COMMENT ON COLUMN public.programs.category IS 'Category for grouping classes (e.g. Strength Training, Cardio, Yoga)';
COMMENT ON COLUMN public.programs.color IS 'Hex color code for calendar display';
COMMENT ON COLUMN public.programs.duration_minutes IS 'Default duration in minutes for sessions of this class type';