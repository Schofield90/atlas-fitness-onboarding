-- Check bookings table columns
SELECT 'bookings' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN ('id', 'customer_id', 'client_id', 'class_session_id', 'status')

UNION ALL

-- Check class_bookings table columns  
SELECT 'class_bookings' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'class_bookings'
AND column_name IN ('id', 'customer_id', 'client_id', 'class_session_id', 'status')

ORDER BY table_name, column_name;