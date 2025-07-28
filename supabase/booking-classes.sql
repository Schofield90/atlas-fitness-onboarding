-- Create class_types table
CREATE TABLE IF NOT EXISTS class_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  color text DEFAULT 'slate',
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create instructors table
CREATE TABLE IF NOT EXISTS instructors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  bio text,
  specialties text[],
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE class_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for class_types
CREATE POLICY "Users can view their own class types" ON class_types
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own class types" ON class_types
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own class types" ON class_types
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own class types" ON class_types
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for instructors
CREATE POLICY "Users can view their own instructors" ON instructors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own instructors" ON instructors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own instructors" ON instructors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own instructors" ON instructors
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_class_types_user_id ON class_types(user_id);
CREATE INDEX idx_instructors_user_id ON instructors(user_id);

-- Create updated_at triggers
CREATE TRIGGER update_class_types_updated_at 
  BEFORE UPDATE ON class_types 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instructors_updated_at 
  BEFORE UPDATE ON instructors 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();