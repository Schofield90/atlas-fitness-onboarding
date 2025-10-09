-- Migration: Add Task Idempotency and Execution Safety
-- Date: 2025-10-09
-- Description: Prevents concurrent task execution and adds idempotency keys

-- 1. Add idempotency_key column for API deduplication
ALTER TABLE ai_agent_tasks
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

-- 2. Create index for fast idempotency lookups
CREATE INDEX IF NOT EXISTS idx_ai_agent_tasks_idempotency
ON ai_agent_tasks(idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- 3. Prevent concurrent execution of same task
-- This unique index ensures only ONE task can be in 'running' or 'queued' state at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agent_tasks_running_unique
ON ai_agent_tasks(id)
WHERE status IN ('running', 'queued');

-- 4. Add execution_started_at for better tracking
ALTER TABLE ai_agent_tasks
ADD COLUMN IF NOT EXISTS execution_started_at TIMESTAMP WITH TIME ZONE;

-- 5. Comment for documentation
COMMENT ON COLUMN ai_agent_tasks.idempotency_key IS 'Optional key for API request deduplication (e.g., UUID from client)';
COMMENT ON COLUMN ai_agent_tasks.execution_started_at IS 'When task execution actually started (vs last_run_at which may be retry time)';
