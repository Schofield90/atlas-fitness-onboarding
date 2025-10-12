# Deployment Trigger

Last updated: October 12, 2025 15:05:42

## Recent Deployments

### October 12, 2025 15:05 - CRITICAL FIX: Conversations API 500 Error
- **ROOT CAUSE**: Query referenced `users.full_name` column which doesn't exist
- **FIX**: Changed to `users.name` (actual column name)
- PostgreSQL error code 42703 was causing 500 Internal Server Error
- Query now works: returns 32 conversations successfully
- This fixes: chat history not loading, second messages disappearing
