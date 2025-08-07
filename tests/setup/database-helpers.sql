-- Helper functions for testing

-- Check if a table has a specific column
CREATE OR REPLACE FUNCTION get_table_columns(table_name TEXT)
RETURNS TABLE(column_name TEXT, data_type TEXT, is_nullable TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = $1
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- Get specific column info
CREATE OR REPLACE FUNCTION get_column_info(table_name TEXT, column_name TEXT)
RETURNS TABLE(
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT,
  column_default TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT,
    c.column_default::TEXT
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = $1
    AND c.column_name = $2;
END;
$$ LANGUAGE plpgsql;

-- Check if an index exists
CREATE OR REPLACE FUNCTION check_index_exists(table_name TEXT, column_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = table_name
    AND indexdef LIKE '%' || column_name || '%';
  
  RETURN index_count > 0;
END;
$$ LANGUAGE plpgsql;