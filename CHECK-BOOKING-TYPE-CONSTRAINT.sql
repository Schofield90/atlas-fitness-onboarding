-- Check what values are allowed for booking_type in class_bookings
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'class_bookings'::regclass
    AND contype = 'c'
    AND conname LIKE '%booking_type%';

-- Check the actual column definition
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'class_bookings'
    AND column_name = 'booking_type';

-- See what values are currently in the table
SELECT DISTINCT booking_type 
FROM class_bookings 
WHERE booking_type IS NOT NULL;