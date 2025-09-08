-- Test the membership join query that the API is using

-- 1. Test the exact query structure the API uses
SELECT 
    cm.customer_id,
    cm.status,
    mp.name as plan_name
FROM customer_memberships cm
LEFT JOIN membership_plans mp ON mp.id = cm.membership_plan_id
WHERE cm.customer_id = '65bca601-ae69-41da-88dd-fe2c08ac6859'
AND cm.status = 'active';

-- 2. Check if the foreign key relationship exists
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='customer_memberships'
AND kcu.column_name = 'membership_plan_id';