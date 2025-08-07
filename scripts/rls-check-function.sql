-- Function to check if RLS is enabled on a table
CREATE OR REPLACE FUNCTION check_rls_enabled(table_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity 
  INTO rls_enabled
  FROM pg_class 
  WHERE relname = table_name 
    AND relnamespace = (
      SELECT oid FROM pg_namespace WHERE nspname = 'public'
    );
  
  RETURN COALESCE(rls_enabled, FALSE);
END;
$$ LANGUAGE plpgsql;