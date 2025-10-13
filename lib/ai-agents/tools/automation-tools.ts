/**
 * Automation Tools - Workflow and Task Automation
 */

import { z } from 'zod';
import { BaseTool, ToolExecutionContext, ToolExecutionResult } from './types';
import { createAdminClient } from '@/app/lib/supabase/admin';

/**
 * Trigger automation workflow
 */
export class TriggerWorkflowTool extends BaseTool {
  id = 'trigger_workflow';
  name = 'Trigger Workflow';
  description = 'Trigger an existing automation workflow with custom context data.';
  category = 'automation' as const;

  parametersSchema = z.object({
    workflowId: z.string().uuid().describe('ID of the workflow to trigger'),
    triggerData: z.record(z.any()).optional().describe('Optional data to pass to workflow execution'),
    priority: z.enum(['low', 'normal', 'high']).optional().default('normal').describe('Execution priority')
  });

  requiresPermission = 'automations:execute';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Verify workflow exists and is enabled
      const { data: workflow, error: workflowError } = await supabase
        .from('automations')
        .select('id, name, enabled')
        .eq('id', validated.workflowId)
        .eq('organization_id', context.organizationId)
        .single();

      if (workflowError || !workflow) {
        throw new Error('Workflow not found or access denied');
      }

      if (!workflow.enabled) {
        throw new Error('Workflow is disabled');
      }

      // Create workflow execution record
      const { data: execution, error: executionError } = await supabase
        .from('automation_executions')
        .insert({
          automation_id: validated.workflowId,
          organization_id: context.organizationId,
          status: 'queued',
          trigger_type: 'agent',
          trigger_data: {
            ...validated.triggerData,
            triggered_by_agent: context.agentId,
            conversation_id: context.conversationId,
            task_id: context.taskId
          },
          priority: validated.priority,
          metadata: {
            agent_id: context.agentId
          }
        })
        .select()
        .single();

      if (executionError) throw executionError;

      return {
        success: true,
        data: {
          executionId: execution.id,
          workflowName: workflow.name,
          status: 'queued'
        },
        metadata: {
          recordsAffected: 1,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Schedule task for later execution
 */
export class ScheduleTaskTool extends BaseTool {
  id = 'schedule_task';
  name = 'Schedule Task';
  description = 'Schedule a task to be executed at a specific time or on a recurring schedule.';
  category = 'automation' as const;

  parametersSchema = z.object({
    title: z.string().describe('Task title'),
    description: z.string().optional().describe('Detailed task description'),
    executeAt: z.string().optional().describe('ISO 8601 datetime to execute task (for one-time tasks)'),
    cronExpression: z.string().optional().describe('Cron expression for recurring tasks (e.g., "0 9 * * 1" = Monday 9am)'),
    taskType: z.enum(['data_export', 'report_generation', 'cleanup', 'notification', 'custom']).describe('Type of scheduled task'),
    taskData: z.record(z.any()).optional().describe('Task execution data/parameters')
  });

  requiresPermission = 'tasks:create';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    // Validate that either executeAt or cronExpression is provided
    if (!validated.executeAt && !validated.cronExpression) {
      return {
        success: false,
        error: 'Either executeAt or cronExpression must be provided'
      };
    }

    try {
      const supabase = createAdminClient();

      // Calculate next_run_at from executeAt or current time for cron tasks
      const nextRunAt = validated.executeAt || new Date().toISOString();

      const { data: task, error } = await supabase
        .from('ai_agent_tasks')
        .insert({
          agent_id: context.agentId,
          organization_id: context.organizationId,
          title: validated.title,
          description: validated.description,
          task_type: validated.cronExpression ? 'scheduled' : 'adhoc',
          status: 'pending',
          next_run_at: nextRunAt,
          schedule_cron: validated.cronExpression || null,
          context: validated.taskData || {},
          metadata: {
            conversation_id: context.conversationId,
            original_task_type: validated.taskType,
            created_by_tool: 'schedule_task'
          }
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          taskId: task.id,
          scheduled: true,
          recurring: !!validated.cronExpression,
          nextExecution: validated.executeAt || 'Calculated from cron'
        },
        metadata: {
          recordsAffected: 1,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Update client tags/segments
 */
export class UpdateClientTagsTool extends BaseTool {
  id = 'update_client_tags';
  name = 'Update Client Tags';
  description = 'Add or remove tags/segments for clients. Useful for organizing and targeting specific member groups.';
  category = 'automation' as const;

  parametersSchema = z.object({
    clientIds: z.array(z.string().uuid()).describe('Array of client IDs to update'),
    tagsToAdd: z.array(z.string()).optional().describe('Tags to add to clients'),
    tagsToRemove: z.array(z.string()).optional().describe('Tags to remove from clients')
  });

  requiresPermission = 'clients:update';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!validated.tagsToAdd?.length && !validated.tagsToRemove?.length) {
      return {
        success: false,
        error: 'Must specify either tagsToAdd or tagsToRemove'
      };
    }

    try {
      const supabase = createAdminClient();
      let updatedCount = 0;

      // Update each client
      for (const clientId of validated.clientIds) {
        const { data: client } = await supabase
          .from('clients')
          .select('tags, metadata')
          .eq('id', clientId)
          .eq('organization_id', context.organizationId)
          .single();

        if (!client) continue;

        let tags = new Set(client.tags || []);

        // Add tags
        if (validated.tagsToAdd) {
          validated.tagsToAdd.forEach(tag => tags.add(tag));
        }

        // Remove tags
        if (validated.tagsToRemove) {
          validated.tagsToRemove.forEach(tag => tags.delete(tag));
        }

        // Update client
        const { error } = await supabase
          .from('clients')
          .update({
            tags: Array.from(tags),
            metadata: {
              ...client.metadata,
              tags_updated_by_agent: context.agentId,
              tags_updated_at: new Date().toISOString()
            }
          })
          .eq('id', clientId);

        if (!error) updatedCount++;
      }

      return {
        success: true,
        data: {
          updatedCount,
          totalRequested: validated.clientIds.length,
          tagsAdded: validated.tagsToAdd || [],
          tagsRemoved: validated.tagsToRemove || []
        },
        metadata: {
          recordsAffected: updatedCount,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Export data to file
 */
export class ExportDataTool extends BaseTool {
  id = 'export_data';
  name = 'Export Data';
  description = 'Export data to CSV or JSON format. Useful for reporting and data analysis.';
  category = 'automation' as const;

  parametersSchema = z.object({
    dataType: z.enum(['clients', 'payments', 'bookings', 'subscriptions']).describe('Type of data to export'),
    format: z.enum(['csv', 'json']).optional().default('csv').describe('Export format'),
    filters: z.record(z.any()).optional().describe('Optional filters to apply to export'),
    startDate: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date filter (YYYY-MM-DD)')
  });

  requiresPermission = 'data:export';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Create export job
      const { data: exportJob, error } = await supabase
        .from('data_exports')
        .insert({
          organization_id: context.organizationId,
          data_type: validated.dataType,
          format: validated.format,
          filters: validated.filters || {},
          date_range: {
            start: validated.startDate,
            end: validated.endDate
          },
          status: 'queued',
          created_by_agent: context.agentId,
          metadata: {
            conversation_id: context.conversationId,
            task_id: context.taskId
          }
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          exportId: exportJob.id,
          status: 'queued',
          message: 'Export job created. You will be notified when the export is ready for download.',
          dataType: validated.dataType,
          format: validated.format
        },
        metadata: {
          recordsAffected: 1,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Create retention campaign workflow
 */
export class CreateRetentionCampaignTool extends BaseTool {
  id = 'create_retention_campaign';
  name = 'Create Retention Campaign';
  description = 'Create an automated retention campaign workflow to re-engage inactive members or prevent churn.';
  category = 'automation' as const;

  parametersSchema = z.object({
    name: z.string().describe('Campaign name (e.g., "Win Back Inactive Members - Q4 2025")'),
    description: z.string().optional().describe('Campaign description and goals'),
    targetAudience: z.object({
      status: z.enum(['active', 'inactive', 'all']).optional().default('inactive').describe('Target member status'),
      inactiveDays: z.number().optional().describe('Number of days inactive (for inactive members)'),
      lastVisitBefore: z.string().optional().describe('Last visit before date (YYYY-MM-DD)'),
      tags: z.array(z.string()).optional().describe('Member tags to target')
    }).describe('Audience targeting criteria'),
    actions: z.array(z.object({
      type: z.enum(['send_email', 'send_sms', 'create_task', 'send_whatsapp']).describe('Action type'),
      delayMinutes: z.number().default(0).describe('Delay in minutes after trigger or previous action'),
      config: z.record(z.any()).describe('Action-specific configuration (template_id, message, etc.)')
    })).describe('Campaign workflow actions'),
    startDate: z.string().optional().describe('Campaign start date (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('Campaign end date (YYYY-MM-DD)')
  });

  requiresPermission = 'campaigns:write';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          organization_id: context.organizationId,
          name: validated.name,
          description: validated.description || `Retention campaign targeting ${validated.targetAudience.status} members`,
          platform: 'automation',
          status: 'active',
          start_date: validated.startDate,
          end_date: validated.endDate,
          target_audience: validated.targetAudience
          // ai_insights column doesn't exist yet - removed to prevent schema error
        })
        .select('id, name, status')
        .single();

      if (campaignError) throw campaignError;

      // Create automation workflow
      const { data: automation, error: automationError } = await supabase
        .from('automations')
        .insert({
          organization_id: context.organizationId,
          name: `${validated.name} - Workflow`,
          description: `Automated workflow for ${validated.name}`,
          is_active: true,
          trigger_type: 'manual',
          trigger_config: {
            campaign_id: campaign.id,
            target_audience: validated.targetAudience
          },
          actions: validated.actions
        })
        .select('id, name, is_active')
        .single();

      if (automationError) throw automationError;

      return {
        success: true,
        data: {
          campaign: {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status
          },
          automation: {
            id: automation.id,
            name: automation.name,
            isActive: automation.is_active
          },
          message: `Retention campaign "${validated.name}" created successfully with ${validated.actions.length} automated actions.`
        },
        metadata: {
          recordsAffected: 2,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Create lead task
 */
export class CreateLeadTaskTool extends BaseTool {
  id = 'create_lead_task';
  name = 'Create Lead Task';
  description = 'Assign a task to a staff member for follow-up with a lead or client.';
  category = 'automation' as const;

  parametersSchema = z.object({
    title: z.string().describe('Task title (e.g., "Follow up with John about trial class")'),
    description: z.string().optional().describe('Detailed task description'),
    assignedTo: z.string().optional().describe('User ID of staff member to assign to'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').describe('Task priority'),
    dueDate: z.string().optional().describe('Due date in YYYY-MM-DD HH:MM format'),
    category: z.enum(['follow_up', 'meeting', 'document', 'call', 'email', 'other']).default('follow_up').describe('Task category'),
    relatedLeadId: z.string().optional().describe('Lead ID this task relates to'),
    relatedClientId: z.string().optional().describe('Client ID this task relates to')
  });

  requiresPermission = 'tasks:write';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Validate that at least one related entity is provided
      if (!validated.relatedLeadId && !validated.relatedClientId) {
        throw new Error('Either relatedLeadId or relatedClientId must be provided');
      }

      // If no assignee specified, assign to task creator or first available staff
      let assignedTo = validated.assignedTo;
      if (!assignedTo && context.userId) {
        assignedTo = context.userId;
      }

      const { data: task, error } = await supabase
        .from('staff_tasks')
        .insert({
          organization_id: context.organizationId,
          assigned_to: assignedTo,
          created_by: context.userId,
          title: validated.title,
          description: validated.description,
          task_type: 'ai_generated',
          category: validated.category,
          priority: validated.priority,
          due_date: validated.dueDate,
          status: 'pending',
          related_lead_id: validated.relatedLeadId,
          related_client_id: validated.relatedClientId,
          ai_generated: true,
          ai_context: {
            created_by_agent: context.agentId,
            conversation_id: context.conversationId,
            task_id: context.taskId
          }
        })
        .select('id, title, priority, status, due_date')
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          task: {
            id: task.id,
            title: task.title,
            priority: task.priority,
            status: task.status,
            dueDate: task.due_date
          },
          message: `Task "${validated.title}" created successfully and assigned.`
        },
        metadata: {
          recordsAffected: 1,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Schedule social media post
 */
export class ScheduleSocialPostTool extends BaseTool {
  id = 'schedule_social_post';
  name = 'Schedule Social Post';
  description = 'Schedule a social media post for future publishing on configured platforms.';
  category = 'automation' as const;

  parametersSchema = z.object({
    content: z.string().describe('Post content/caption'),
    platforms: z.array(z.enum(['facebook', 'instagram', 'twitter', 'linkedin'])).describe('Platforms to post on'),
    scheduledFor: z.string().describe('Scheduled publish time (YYYY-MM-DD HH:MM format)'),
    mediaUrls: z.array(z.string()).optional().describe('URLs of images/videos to attach'),
    hashtags: z.array(z.string()).optional().describe('Hashtags to include'),
    autoPublish: z.boolean().default(true).describe('Automatically publish at scheduled time')
  });

  requiresPermission = 'social_media:write';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      // Add hashtags to content if provided
      let finalContent = validated.content;
      if (validated.hashtags && validated.hashtags.length > 0) {
        const hashtagString = validated.hashtags.map(tag =>
          tag.startsWith('#') ? tag : `#${tag}`
        ).join(' ');
        finalContent = `${finalContent}\n\n${hashtagString}`;
      }

      // Create social media post record
      const { data: post, error } = await supabase
        .from('social_media_posts')
        .insert({
          organization_id: context.organizationId,
          content: finalContent,
          platforms: validated.platforms,
          scheduled_for: validated.scheduledFor,
          status: validated.autoPublish ? 'scheduled' : 'draft',
          media_urls: validated.mediaUrls || [],
          metadata: {
            created_by_agent: context.agentId,
            conversation_id: context.conversationId,
            auto_publish: validated.autoPublish,
            hashtags: validated.hashtags
          }
        })
        .select('id, content, platforms, scheduled_for, status')
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          post: {
            id: post.id,
            platforms: post.platforms,
            scheduledFor: post.scheduled_for,
            status: post.status
          },
          message: `Social media post scheduled for ${new Date(validated.scheduledFor).toLocaleString()} on ${validated.platforms.join(', ')}.`
        },
        metadata: {
          recordsAffected: 1,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Generate social media content using AI
 */
export class GenerateSocialContentTool extends BaseTool {
  id = 'generate_social_content';
  name = 'Generate Social Content';
  description = 'Generate engaging social media post content using AI based on topic, tone, and platform.';
  category = 'automation' as const;

  parametersSchema = z.object({
    topic: z.string().describe('Topic or theme for the post (e.g., "new yoga class", "member success story")'),
    platform: z.enum(['facebook', 'instagram', 'twitter', 'linkedin']).describe('Target platform (affects character limits and style)'),
    tone: z.enum(['professional', 'casual', 'motivational', 'educational', 'promotional']).default('motivational').describe('Content tone'),
    includeCallToAction: z.boolean().default(true).describe('Include a call-to-action'),
    maxLength: z.number().optional().describe('Maximum character length (platform defaults apply if not specified)')
  });

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      // Platform character limits
      const platformLimits: Record<string, number> = {
        twitter: 280,
        instagram: 2200,
        facebook: 63206,
        linkedin: 3000
      };

      const maxLength = validated.maxLength || platformLimits[validated.platform];

      // Generate content (placeholder - in production use OpenAI/Anthropic)
      const contentPrompts: Record<string, string> = {
        professional: `Create a professional ${validated.platform} post about ${validated.topic}.`,
        casual: `Write a friendly, casual ${validated.platform} post about ${validated.topic}.`,
        motivational: `Create an inspiring ${validated.platform} post about ${validated.topic}.`,
        educational: `Write an educational ${validated.platform} post about ${validated.topic}.`,
        promotional: `Create a promotional ${validated.platform} post about ${validated.topic}.`
      };

      const content = `${contentPrompts[validated.tone]} Keep it under ${maxLength} characters${validated.includeCallToAction ? ' and include a call-to-action' : ''}.`;

      return {
        success: true,
        data: {
          content: content,
          platform: validated.platform,
          characterCount: content.length,
          maxLength,
          tone: validated.tone,
          message: 'Social media content generated. Review and edit before scheduling.'
        },
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Generate relevant hashtags
 */
export class GenerateHashtagsTool extends BaseTool {
  id = 'generate_hashtags';
  name = 'Generate Hashtags';
  description = 'Generate relevant hashtags for social media posts based on content and industry.';
  category = 'automation' as const;

  parametersSchema = z.object({
    content: z.string().describe('Post content to analyze'),
    count: z.number().min(3).max(30).default(10).describe('Number of hashtags to generate (3-30)'),
    industry: z.enum(['fitness', 'yoga', 'crossfit', 'martial_arts', 'pilates', 'general']).default('fitness').describe('Industry/niche for relevant hashtags'),
    includeLocation: z.boolean().default(false).describe('Include location-based hashtags'),
    location: z.string().optional().describe('Location for geo-targeted hashtags (e.g., "London", "NYC")')
  });

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      // Industry-specific hashtag banks
      const industryHashtags: Record<string, string[]> = {
        fitness: ['FitnessMotivation', 'FitLife', 'GymLife', 'FitnessJourney', 'GetFit', 'WorkoutMotivation', 'FitnessGoals', 'TrainHard', 'FitFam', 'HealthyLifestyle'],
        yoga: ['YogaLife', 'YogaPractice', 'YogaEveryday', 'YogaInspiration', 'YogaCommunity', 'Mindfulness', 'YogaLove', 'YogaFlow', 'YogaTeacher', 'Namaste'],
        crossfit: ['CrossFit', 'CrossFitCommunity', 'CrossFitLife', 'WOD', 'CrossFitAthlete', 'FunctionalFitness', 'CrossFitTraining', 'CrossFitBox', 'CrossFitWomen', 'CrossFitGames'],
        martial_arts: ['MartialArts', 'MMA', 'BJJ', 'Karate', 'Taekwondo', 'MartialArtsLife', 'SelfDefense', 'Discipline', 'MartialArtist', 'WarriorSpirit'],
        pilates: ['Pilates', 'PilatesLife', 'PilatesPractice', 'CoreStrength', 'PilatesInstructor', 'PilatesLove', 'Reformer', 'PilatesBody', 'MindBodySpirit', 'PilatesCommunity'],
        general: ['Fitness', 'Workout', 'Health', 'Wellness', 'Exercise', 'Motivation', 'Strength', 'Training', 'HealthyLiving', 'FitnessGoals']
      };

      let hashtags = [...industryHashtags[validated.industry]].slice(0, validated.count);

      if (validated.includeLocation && validated.location) {
        const locationTags = [
          `${validated.location}Fitness`,
          `${validated.location}Gym`,
          validated.location
        ];
        hashtags = [...locationTags, ...hashtags].slice(0, validated.count);
      }

      hashtags = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);

      return {
        success: true,
        data: {
          hashtags,
          count: hashtags.length,
          industry: validated.industry,
          copyText: hashtags.join(' '),
          message: `Generated ${hashtags.length} relevant hashtags for ${validated.industry} content.`
        },
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * View calendar events
 */
export class ViewCalendarEventsTool extends BaseTool {
  id = 'view_calendar_events';
  name = 'View Calendar Events';
  description = 'Get upcoming calendar events, class schedules, and appointments.';
  category = 'automation' as const;

  parametersSchema = z.object({
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD format, defaults to today)'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD format, defaults to 7 days from start)'),
    eventType: z.enum(['all', 'class', 'appointment', 'meeting']).default('all').describe('Filter by event type'),
    limit: z.number().min(1).max(100).default(20).describe('Maximum number of events to return')
  });

  requiresPermission = 'calendar:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      const startDate = validated.startDate || new Date().toISOString().split('T')[0];
      const endDate = validated.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: classes, error: classError } = await supabase
        .from('class_sessions')
        .select(`
          id,
          start_time,
          end_time,
          capacity,
          bookings:class_bookings(count),
          class_type:class_types(name, description)
        `)
        .eq('organization_id', context.organizationId)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: true })
        .limit(validated.limit);

      if (classError) throw classError;

      const events = (classes || []).map((session: any) => ({
        id: session.id,
        type: 'class',
        title: session.class_type?.name || 'Class',
        description: session.class_type?.description,
        startTime: session.start_time,
        endTime: session.end_time,
        capacity: session.capacity,
        booked: session.bookings?.[0]?.count || 0,
        spotsAvailable: session.capacity - (session.bookings?.[0]?.count || 0)
      }));

      return {
        success: true,
        data: {
          events,
          count: events.length,
          dateRange: {
            start: startDate,
            end: endDate
          },
          message: `Found ${events.length} upcoming events.`
        },
        metadata: {
          recordsAffected: events.length,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Book trial class
 */
export class BookTrialClassTool extends BaseTool {
  id = 'book_trial_class';
  name = 'Book Trial Class';
  description = 'Book a trial class for a lead or new member.';
  category = 'automation' as const;

  parametersSchema = z.object({
    leadId: z.string().optional().describe('Lead ID to book trial for'),
    clientId: z.string().optional().describe('Client ID to book trial for'),
    classSessionId: z.string().describe('Class session ID to book'),
    notes: z.string().optional().describe('Booking notes or special requirements'),
    sendConfirmation: z.boolean().default(true).describe('Send confirmation email/SMS')
  });

  requiresPermission = 'bookings:write';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      if (!validated.leadId && !validated.clientId) {
        throw new Error('Either leadId or clientId must be provided');
      }

      const { data: session, error: sessionError } = await supabase
        .from('class_sessions')
        .select(`
          id,
          capacity,
          start_time,
          class_type:class_types(name),
          bookings:class_bookings(count)
        `)
        .eq('id', validated.classSessionId)
        .single();

      if (sessionError) throw sessionError;
      if (!session) throw new Error('Class session not found');

      const bookedCount = session.bookings?.[0]?.count || 0;
      if (bookedCount >= session.capacity) {
        throw new Error('Class is fully booked');
      }

      const { data: booking, error: bookingError } = await supabase
        .from('class_bookings')
        .insert({
          organization_id: context.organizationId,
          class_session_id: validated.classSessionId,
          client_id: validated.clientId,
          lead_id: validated.leadId,
          status: 'confirmed',
          booking_type: 'trial',
          notes: validated.notes,
          metadata: {
            booked_by_agent: context.agentId,
            conversation_id: context.conversationId
          }
        })
        .select('id, status, booking_type')
        .single();

      if (bookingError) throw bookingError;

      if (validated.leadId) {
        await supabase
          .from('staff_tasks')
          .insert({
            organization_id: context.organizationId,
            title: `Follow up with trial class attendee`,
            description: `Check in after trial class on ${new Date(session.start_time).toLocaleDateString()}`,
            task_type: 'ai_generated',
            category: 'follow_up',
            priority: 'high',
            due_date: new Date(new Date(session.start_time).getTime() + 24 * 60 * 60 * 1000).toISOString(),
            related_lead_id: validated.leadId,
            ai_generated: true,
            ai_context: {
              created_by_agent: context.agentId,
              trigger: 'trial_class_booking',
              class_session_id: validated.classSessionId
            }
          });
      }

      return {
        success: true,
        data: {
          booking: {
            id: booking.id,
            status: booking.status,
            type: booking.booking_type
          },
          classDetails: {
            name: session.class_type?.name,
            startTime: session.start_time,
            spotsRemaining: session.capacity - bookedCount - 1
          },
          message: `Trial class booked successfully for ${session.class_type?.name} on ${new Date(session.start_time).toLocaleString()}.`
        },
        metadata: {
          recordsAffected: 2,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Schedule facility tour
 */
export class ScheduleFacilityTourTool extends BaseTool {
  id = 'schedule_facility_tour';
  name = 'Schedule Facility Tour';
  description = 'Schedule a facility tour for a prospective member.';
  category = 'automation' as const;

  parametersSchema = z.object({
    leadId: z.string().describe('Lead ID to schedule tour for'),
    tourDate: z.string().describe('Tour date and time (YYYY-MM-DD HH:MM format)'),
    duration: z.number().default(30).describe('Tour duration in minutes'),
    assignedStaff: z.string().optional().describe('Staff member ID to conduct tour'),
    notes: z.string().optional().describe('Tour notes or special requests'),
    sendReminder: z.boolean().default(true).describe('Send reminder 24 hours before tour')
  });

  requiresPermission = 'tours:write';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      const supabase = createAdminClient();

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone')
        .eq('id', validated.leadId)
        .eq('organization_id', context.organizationId)
        .single();

      if (leadError) throw leadError;
      if (!lead) throw new Error('Lead not found');

      const tourEndTime = new Date(new Date(validated.tourDate).getTime() + validated.duration * 60 * 1000);

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          organization_id: context.organizationId,
          title: `Facility Tour - ${lead.first_name} ${lead.last_name}`,
          description: validated.notes || 'Facility tour for prospective member',
          appointment_type: 'tour',
          start_time: validated.tourDate,
          end_time: tourEndTime.toISOString(),
          status: 'scheduled',
          lead_id: validated.leadId,
          assigned_to: validated.assignedStaff,
          metadata: {
            scheduled_by_agent: context.agentId,
            conversation_id: context.conversationId,
            send_reminder: validated.sendReminder,
            lead_contact: {
              email: lead.email,
              phone: lead.phone
            }
          }
        })
        .select('id, title, start_time, status')
        .single();

      if (appointmentError) throw appointmentError;

      await supabase
        .from('staff_tasks')
        .insert({
          organization_id: context.organizationId,
          assigned_to: validated.assignedStaff,
          title: `Prepare for facility tour with ${lead.first_name} ${lead.last_name}`,
          description: `Review lead profile and prepare tour materials for ${new Date(validated.tourDate).toLocaleString()}`,
          task_type: 'ai_generated',
          category: 'meeting',
          priority: 'high',
          due_date: new Date(new Date(validated.tourDate).getTime() - 60 * 60 * 1000).toISOString(),
          related_lead_id: validated.leadId,
          ai_generated: true,
          ai_context: {
            created_by_agent: context.agentId,
            trigger: 'facility_tour_scheduled',
            appointment_id: appointment.id
          }
        });

      await supabase
        .from('staff_tasks')
        .insert({
          organization_id: context.organizationId,
          assigned_to: validated.assignedStaff,
          title: `Follow up after facility tour with ${lead.first_name} ${lead.last_name}`,
          description: `Send follow-up message and membership options after tour`,
          task_type: 'ai_generated',
          category: 'follow_up',
          priority: 'high',
          due_date: new Date(tourEndTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          related_lead_id: validated.leadId,
          ai_generated: true,
          ai_context: {
            created_by_agent: context.agentId,
            trigger: 'facility_tour_scheduled',
            appointment_id: appointment.id
          }
        });

      return {
        success: true,
        data: {
          appointment: {
            id: appointment.id,
            title: appointment.title,
            startTime: appointment.start_time,
            status: appointment.status
          },
          lead: {
            name: `${lead.first_name} ${lead.last_name}`,
            email: lead.email,
            phone: lead.phone
          },
          message: `Facility tour scheduled for ${lead.first_name} ${lead.last_name} on ${new Date(validated.tourDate).toLocaleString()}.`
        },
        metadata: {
          recordsAffected: 3,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

// Export all automation tools
export const AUTOMATION_TOOLS = [
  new CreateRetentionCampaignTool(),
  new CreateLeadTaskTool(),
  new ScheduleSocialPostTool(),
  new GenerateSocialContentTool(),
  new GenerateHashtagsTool(),
  new ViewCalendarEventsTool(),
  new BookTrialClassTool(),
  new ScheduleFacilityTourTool(),
  new TriggerWorkflowTool(),
  new ScheduleTaskTool(),
  new UpdateClientTagsTool(),
  new ExportDataTool()
];
