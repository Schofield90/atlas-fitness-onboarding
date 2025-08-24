-- Check what tables and columns exist
SELECT 
    table_name,
    column_name,
    data_type
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name IN ('facebook_pages', 'facebook_integrations', 'facebook_lead_forms', 'facebook_ad_accounts')
ORDER BY 
    table_name, ordinal_position;