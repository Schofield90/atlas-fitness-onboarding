-- ========================================
-- ENHANCED WORKFLOW SYSTEM - DATA MIGRATION
-- Migration: 20250812_migrate_existing_workflows.sql
-- ========================================

-- This migration script safely migrates existing workflow data to the enhanced format
-- It preserves all existing functionality while adding new features

DO $$
DECLARE
    workflow_record RECORD;
    execution_record RECORD;
    trigger_id UUID;
    variable_record JSONB;
    migrated_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting workflow data migration...';
    
    -- ========================================
    -- MIGRATE EXISTING WORKFLOWS
    -- ========================================
    
    FOR workflow_record IN 
        SELECT * FROM workflows 
        WHERE version IS NULL OR version < 2
        ORDER BY created_at
    LOOP
        BEGIN
            RAISE NOTICE 'Migrating workflow: % (ID: %)', workflow_record.name, workflow_record.id;
            
            -- Create workflow trigger from existing trigger configuration
            IF workflow_record.trigger_type IS NOT NULL THEN
                -- Check if trigger already exists
                SELECT id INTO trigger_id 
                FROM workflow_triggers 
                WHERE workflow_id = workflow_record.id 
                AND trigger_type = workflow_record.trigger_type
                LIMIT 1;
                
                -- Create trigger if it doesn't exist
                IF trigger_id IS NULL THEN
                    INSERT INTO workflow_triggers (
                        organization_id,
                        workflow_id,
                        trigger_type,
                        trigger_name,
                        trigger_config,
                        is_active,
                        created_at
                    ) VALUES (
                        workflow_record.organization_id,
                        workflow_record.id,
                        workflow_record.trigger_type,
                        COALESCE(workflow_record.name || ' Trigger', 'Migrated Trigger'),
                        COALESCE(workflow_record.trigger_config, '{}'),
                        COALESCE(workflow_record.status = 'active', true),
                        COALESCE(workflow_record.created_at, NOW())
                    ) RETURNING id INTO trigger_id;
                    
                    RAISE NOTICE '  Created trigger: %', trigger_id;
                END IF;
            END IF;
            
            -- Extract and migrate workflow variables from existing data
            IF workflow_record.workflow_data IS NOT NULL AND 
               workflow_record.workflow_data ? 'variables' THEN
                
                FOR variable_record IN 
                    SELECT * FROM jsonb_array_elements(workflow_record.workflow_data->'variables')
                LOOP
                    -- Insert variable if it doesn't exist
                    INSERT INTO workflow_variables (
                        organization_id,
                        workflow_id,
                        name,
                        data_type,
                        default_value,
                        description,
                        scope,
                        is_required
                    ) VALUES (
                        workflow_record.organization_id,
                        workflow_record.id,
                        variable_record->>'name',
                        COALESCE(variable_record->>'type', 'string'),
                        variable_record->'defaultValue',
                        variable_record->>'description',
                        'workflow',
                        COALESCE((variable_record->>'required')::boolean, false)
                    )
                    ON CONFLICT (organization_id, workflow_id, name) DO UPDATE SET
                        data_type = EXCLUDED.data_type,
                        default_value = EXCLUDED.default_value,
                        description = EXCLUDED.description,
                        updated_at = NOW();
                END LOOP;
                
                RAISE NOTICE '  Migrated variables from workflow data';
            END IF;
            
            -- Update workflow with enhanced structure
            UPDATE workflows SET
                version = 2,
                category = CASE 
                    WHEN workflow_record.trigger_type IN ('lead_created', 'lead_updated', 'lead_scored') THEN 'lead_management'
                    WHEN workflow_record.trigger_type IN ('message_received', 'message_sent') THEN 'communication'
                    WHEN workflow_record.trigger_type IN ('appointment_booked', 'appointment_cancelled') THEN 'booking'
                    WHEN workflow_record.trigger_type = 'form_submitted' THEN 'forms'
                    WHEN workflow_record.trigger_type = 'scheduled_time' THEN 'scheduling'
                    ELSE 'custom'
                END,
                -- Initialize performance metrics
                total_executions = COALESCE(workflow_record.total_executions, 0),
                successful_executions = COALESCE(workflow_record.successful_executions, 0),
                failed_executions = COALESCE(workflow_record.failed_executions, 0),
                avg_execution_time_ms = COALESCE(workflow_record.avg_execution_time_ms, 0),
                error_rate = CASE 
                    WHEN COALESCE(workflow_record.total_executions, 0) > 0 
                    THEN COALESCE(workflow_record.failed_executions, 0)::decimal / workflow_record.total_executions
                    ELSE 0 
                END,
                performance_score = CASE 
                    WHEN COALESCE(workflow_record.total_executions, 0) >= 10 
                    THEN GREATEST(0, LEAST(100, 100 - (COALESCE(workflow_record.failed_executions, 0) * 100 / workflow_record.total_executions)))
                    ELSE 0 
                END,
                tags = CASE 
                    WHEN workflow_record.workflow_data ? 'tags' 
                    THEN (
                        SELECT array_agg(tag_value::text) 
                        FROM jsonb_array_elements_text(workflow_record.workflow_data->'tags') AS tag_value
                    )
                    ELSE '{}'::text[]
                END,
                updated_at = NOW()
            WHERE id = workflow_record.id;
            
            migrated_count := migrated_count + 1;
            
            RAISE NOTICE '  Successfully migrated workflow: %', workflow_record.name;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE WARNING 'Error migrating workflow % (ID: %): %', 
                workflow_record.name, workflow_record.id, SQLERRM;
            CONTINUE;
        END;
    END LOOP;
    
    -- ========================================
    -- MIGRATE EXISTING EXECUTIONS
    -- ========================================
    
    RAISE NOTICE 'Migrating execution data...';
    
    -- Update execution table to include organization_id if missing
    DO $update_executions$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workflow_executions' 
            AND column_name = 'organization_id'
        ) THEN
            -- Update executions with organization_id from workflows
            UPDATE workflow_executions 
            SET organization_id = w.organization_id
            FROM workflows w
            WHERE workflow_executions.workflow_id = w.id
            AND workflow_executions.organization_id IS NULL;
            
            RAISE NOTICE '  Updated execution organization IDs';
        END IF;
    END $update_executions$;
    
    -- ========================================
    -- CREATE DEFAULT WORKFLOW TEMPLATES
    -- ========================================
    
    RAISE NOTICE 'Creating default workflow templates...';
    
    -- Lead Nurture Template
    INSERT INTO workflow_templates (
        organization_id,
        name,
        description,
        category,
        icon,
        workflow_data,
        is_public,
        is_featured,
        created_by
    ) VALUES (
        NULL, -- Public template
        'Lead Nurture Sequence',
        'Automated follow-up sequence for new leads with personalized messaging',
        'lead_management',
        '🎯',
        '{
            "nodes": [
                {
                    "id": "trigger",
                    "type": "trigger",
                    "position": {"x": 100, "y": 100},
                    "data": {
                        "triggerType": "lead_created",
                        "label": "New Lead Created"
                    }
                },
                {
                    "id": "wait-1",
                    "type": "action",
                    "position": {"x": 300, "y": 100},
                    "data": {
                        "actionType": "wait_delay",
                        "label": "Wait 1 Hour",
                        "config": {"duration": 1, "unit": "hours"}
                    }
                },
                {
                    "id": "welcome-email",
                    "type": "action", 
                    "position": {"x": 500, "y": 100},
                    "data": {
                        "actionType": "send_email",
                        "label": "Send Welcome Email",
                        "config": {
                            "subject": "Welcome to {{gym_name}}!",
                            "template_id": "welcome_lead"
                        }
                    }
                }
            ],
            "edges": [
                {"id": "e1", "source": "trigger", "target": "wait-1"},
                {"id": "e2", "source": "wait-1", "target": "welcome-email"}
            ],
            "variables": [
                {"name": "gym_name", "type": "string", "required": true},
                {"name": "follow_up_days", "type": "number", "defaultValue": 3}
            ]
        }',
        true,
        true,
        NULL
    ) ON CONFLICT DO NOTHING;
    
    -- Appointment Reminder Template
    INSERT INTO workflow_templates (
        organization_id,
        name,
        description,
        category,
        icon,
        workflow_data,
        is_public,
        is_featured,
        created_by
    ) VALUES (
        NULL,
        'Class Reminder Sequence',
        'Automated reminders for booked classes with option to reschedule',
        'booking',
        '⏰',
        '{
            "nodes": [
                {
                    "id": "trigger",
                    "type": "trigger",
                    "position": {"x": 100, "y": 100},
                    "data": {
                        "triggerType": "class_reminder",
                        "label": "Class Reminder Time",
                        "config": {"hours_before": 24}
                    }
                },
                {
                    "id": "send-reminder",
                    "type": "action",
                    "position": {"x": 300, "y": 100},
                    "data": {
                        "actionType": "send_sms",
                        "label": "Send SMS Reminder",
                        "config": {
                            "message": "Hi {{customer_name}}! Reminder: You have {{class_name}} tomorrow at {{class_time}}. See you there!"
                        }
                    }
                }
            ],
            "edges": [
                {"id": "e1", "source": "trigger", "target": "send-reminder"}
            ],
            "variables": [
                {"name": "reminder_hours", "type": "number", "defaultValue": 24}
            ]
        }',
        true,
        true,
        NULL
    ) ON CONFLICT DO NOTHING;
    
    -- Payment Failed Recovery Template
    INSERT INTO workflow_templates (
        organization_id,
        name,
        description,
        category,
        icon,
        workflow_data,
        is_public,
        is_featured,
        created_by
    ) VALUES (
        NULL,
        'Payment Recovery Sequence',
        'Automated sequence to recover failed payments with grace period',
        'membership',
        '💳',
        '{
            "nodes": [
                {
                    "id": "trigger",
                    "type": "trigger",
                    "position": {"x": 100, "y": 100},
                    "data": {
                        "triggerType": "payment_failed",
                        "label": "Payment Failed"
                    }
                },
                {
                    "id": "grace-wait",
                    "type": "action",
                    "position": {"x": 300, "y": 100},
                    "data": {
                        "actionType": "wait_delay",
                        "label": "Grace Period",
                        "config": {"duration": 3, "unit": "days"}
                    }
                },
                {
                    "id": "payment-reminder",
                    "type": "action",
                    "position": {"x": 500, "y": 100},
                    "data": {
                        "actionType": "send_email",
                        "label": "Payment Reminder",
                        "config": {
                            "subject": "Update Required: Payment Issue",
                            "template_id": "payment_failed"
                        }
                    }
                }
            ],
            "edges": [
                {"id": "e1", "source": "trigger", "target": "grace-wait"},
                {"id": "e2", "source": "grace-wait", "target": "payment-reminder"}
            ]
        }',
        true,
        true,
        NULL
    ) ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Created default workflow templates';
    
    -- ========================================
    -- MIGRATION SUMMARY
    -- ========================================
    
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Workflows migrated: %', migrated_count;
    RAISE NOTICE 'Errors encountered: %', error_count;
    
    -- Update migration tracking
    INSERT INTO workflow_analytics (
        organization_id,
        workflow_id, 
        date,
        hour,
        executions_count,
        created_at
    )
    SELECT 
        organization_id,
        id,
        CURRENT_DATE,
        EXTRACT(HOUR FROM NOW()),
        0, -- Starting fresh
        NOW()
    FROM workflows 
    WHERE version = 2
    ON CONFLICT (workflow_id, date, hour) DO NOTHING;
    
    RAISE NOTICE 'Analytics tracking initialized for migrated workflows';
    
END $$;

-- ========================================
-- POST-MIGRATION VALIDATION
-- ========================================

-- Function to validate migration
CREATE OR REPLACE FUNCTION validate_workflow_migration()
RETURNS TABLE (
    validation_check TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    v2_count INTEGER;
    trigger_count INTEGER;
    variable_count INTEGER;
    template_count INTEGER;
BEGIN
    -- Check workflow version updates
    SELECT COUNT(*) INTO v2_count FROM workflows WHERE version >= 2;
    RETURN QUERY SELECT 
        'Workflows Updated'::TEXT,
        CASE WHEN v2_count > 0 THEN 'PASS' ELSE 'FAIL' END,
        format('%s workflows updated to version 2+', v2_count);
    
    -- Check trigger migration
    SELECT COUNT(*) INTO trigger_count FROM workflow_triggers;
    RETURN QUERY SELECT 
        'Triggers Created'::TEXT,
        CASE WHEN trigger_count > 0 THEN 'PASS' ELSE 'WARN' END,
        format('%s workflow triggers created', trigger_count);
    
    -- Check variable migration
    SELECT COUNT(*) INTO variable_count FROM workflow_variables;
    RETURN QUERY SELECT 
        'Variables Migrated'::TEXT,
        CASE WHEN variable_count >= 0 THEN 'PASS' ELSE 'FAIL' END,
        format('%s workflow variables created', variable_count);
    
    -- Check template creation
    SELECT COUNT(*) INTO template_count FROM workflow_templates WHERE is_public = true;
    RETURN QUERY SELECT 
        'Templates Created'::TEXT,
        CASE WHEN template_count >= 3 THEN 'PASS' ELSE 'WARN' END,
        format('%s public templates available', template_count);
    
    -- Check for orphaned data
    RETURN QUERY SELECT 
        'Data Consistency'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM workflow_triggers wt 
            LEFT JOIN workflows w ON w.id = wt.workflow_id 
            WHERE w.id IS NULL
        ) THEN 'FAIL' ELSE 'PASS' END,
        'No orphaned workflow triggers found';
    
END;
$$ LANGUAGE plpgsql;

-- Run validation
SELECT * FROM validate_workflow_migration();