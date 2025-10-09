/**
 * AI Agent Workflow Integration Examples
 *
 * This file demonstrates how to use AI agents within automation workflows
 */

import type {
  EnhancedWorkflow,
  WorkflowNode,
  WorkflowEdge,
} from "@/app/lib/workflow/types";

/**
 * Example 1: Lead Scoring and Qualification Workflow
 *
 * This workflow demonstrates:
 * - Using AI agent for lead scoring
 * - Conditional branching based on score
 * - Automated task creation for sales team
 */
export const leadScoringWorkflow: Partial<EnhancedWorkflow> = {
  name: "AI Lead Scoring & Qualification",
  description: "Automatically score and qualify leads using AI agent",
  trigger_type: "lead.created",
  nodes: [
    {
      id: "trigger_1",
      type: "trigger",
      position: { x: 100, y: 100 },
      data: {
        label: "New Lead Created",
        description: "Triggers when a new lead is created",
      },
    },
    {
      id: "agent_score",
      type: "action",
      position: { x: 100, y: 200 },
      data: {
        label: "Score Lead with AI",
        description: "Use AI agent to analyze and score the lead",
        actionType: "ai_agent_analysis",
        agentId: "{{variables.lead_scoring_agent_id}}", // Set in workflow variables
        dataToAnalyze: "{{trigger.lead}}",
        analysisType: "lead_scoring",
      },
    },
    {
      id: "condition_1",
      type: "condition",
      position: { x: 100, y: 300 },
      data: {
        label: "Check Lead Score",
        conditions: [
          {
            field: "agent_score.output.analysis.score",
            operator: "greater_than_or_equal",
            value: 70,
          },
        ],
        logicOperator: "AND",
      },
    },
    {
      id: "task_high_value",
      type: "action",
      position: { x: 50, y: 400 },
      data: {
        label: "Create High-Value Task",
        actionType: "create_task",
        title: "HOT Lead: {{trigger.lead.name}}",
        description:
          "Score: {{agent_score.output.analysis.score}}\n\nFactors: {{agent_score.output.analysis.factors}}\n\nRecommended Actions:\n{{agent_score.output.analysis.recommended_actions}}",
        assignee: "sales_team",
        priority: "high",
        dueDate: "{{now + 1d}}",
      },
    },
    {
      id: "email_nurture",
      type: "action",
      position: { x: 250, y: 400 },
      data: {
        label: "Send to Nurture Campaign",
        actionType: "add_to_campaign",
        campaignId: "{{variables.nurture_campaign_id}}",
        leadId: "{{trigger.lead.id}}",
      },
    },
  ] as WorkflowNode[],
  edges: [
    {
      id: "e1",
      source: "trigger_1",
      target: "agent_score",
    },
    {
      id: "e2",
      source: "agent_score",
      target: "condition_1",
    },
    {
      id: "e3",
      source: "condition_1",
      target: "task_high_value",
      data: { branch: "true" },
    },
    {
      id: "e4",
      source: "condition_1",
      target: "email_nurture",
      data: { branch: "false" },
    },
  ] as WorkflowEdge[],
  variables: [
    {
      id: "var_1",
      workflow_id: "",
      name: "lead_scoring_agent_id",
      type: "string",
      default_value: "agent-lead-scorer",
      description: "ID of the AI agent used for lead scoring",
      is_required: true,
      is_sensitive: false,
    },
    {
      id: "var_2",
      workflow_id: "",
      name: "nurture_campaign_id",
      type: "string",
      default_value: "campaign-nurture",
      description: "ID of the nurture campaign",
      is_required: true,
      is_sensitive: false,
    },
  ],
};

/**
 * Example 2: Personalized Email Campaign Workflow
 *
 * This workflow demonstrates:
 * - Content generation using AI agent
 * - Personalization based on lead data
 * - Automated email sending
 */
export const personalizedEmailWorkflow: Partial<EnhancedWorkflow> = {
  name: "AI-Powered Personalized Email Campaign",
  description: "Generate personalized emails using AI for each lead",
  trigger_type: "campaign.started",
  nodes: [
    {
      id: "trigger_1",
      type: "trigger",
      position: { x: 100, y: 100 },
      data: {
        label: "Campaign Started",
        description: "Triggers when a campaign is started",
      },
    },
    {
      id: "loop_leads",
      type: "loop",
      position: { x: 100, y: 200 },
      data: {
        label: "For Each Lead",
        loop: {
          source: "array",
          arrayPath: "trigger.campaign.leads",
          maxIterations: 1000,
        },
      },
    },
    {
      id: "agent_generate",
      type: "action",
      position: { x: 100, y: 300 },
      data: {
        label: "Generate Personalized Email",
        actionType: "ai_agent_generate_content",
        agentId: "{{variables.content_generator_agent_id}}",
        contentType: "email",
        targetAudience: "{{loop_leads.current.segment}}",
        tone: "motivational",
        additionalContext:
          "Lead Name: {{loop_leads.current.name}}\nInterests: {{loop_leads.current.interests}}\nGoals: {{loop_leads.current.goals}}\nCampaign: {{trigger.campaign.name}}",
      },
    },
    {
      id: "send_email",
      type: "action",
      position: { x: 100, y: 400 },
      data: {
        label: "Send Email",
        actionType: "send_email",
        to: "{{loop_leads.current.email}}",
        subject: "{{trigger.campaign.subject}}",
        body: "{{agent_generate.output.generated_content}}",
        from: "{{variables.sender_email}}",
      },
    },
    {
      id: "delay_1",
      type: "delay",
      position: { x: 100, y: 500 },
      data: {
        label: "Rate Limit Delay",
        delay: {
          type: "fixed",
          value: 2,
          unit: "seconds",
        },
      },
    },
  ] as WorkflowNode[],
  edges: [
    {
      id: "e1",
      source: "trigger_1",
      target: "loop_leads",
    },
    {
      id: "e2",
      source: "loop_leads",
      target: "agent_generate",
    },
    {
      id: "e3",
      source: "agent_generate",
      target: "send_email",
    },
    {
      id: "e4",
      source: "send_email",
      target: "delay_1",
    },
  ] as WorkflowEdge[],
};

/**
 * Example 3: Customer Support Ticket Automation
 *
 * This workflow demonstrates:
 * - Ticket classification
 * - Automated response generation
 * - Priority routing
 */
export const supportTicketWorkflow: Partial<EnhancedWorkflow> = {
  name: "AI Support Ticket Automation",
  description: "Automatically categorize and respond to support tickets",
  trigger_type: "support.ticket.created",
  nodes: [
    {
      id: "trigger_1",
      type: "trigger",
      position: { x: 100, y: 100 },
      data: {
        label: "Support Ticket Created",
      },
    },
    {
      id: "agent_classify",
      type: "action",
      position: { x: 100, y: 200 },
      data: {
        label: "Classify Ticket",
        actionType: "ai_agent_analysis",
        agentId: "{{variables.support_agent_id}}",
        dataToAnalyze: "{{trigger.ticket.message}}",
        analysisType: "classification",
        categories: [
          "billing",
          "technical",
          "general",
          "urgent",
          "cancellation",
        ],
      },
    },
    {
      id: "condition_urgent",
      type: "condition",
      position: { x: 100, y: 300 },
      data: {
        label: "Is Urgent?",
        conditions: [
          {
            field: "agent_classify.output.analysis.category",
            operator: "equals",
            value: "urgent",
          },
        ],
      },
    },
    {
      id: "task_urgent",
      type: "action",
      position: { x: 50, y: 400 },
      data: {
        label: "Create Urgent Task",
        actionType: "create_task",
        title: "URGENT: {{trigger.ticket.subject}}",
        description: "{{trigger.ticket.message}}",
        assignee: "support_lead",
        priority: "urgent",
      },
    },
    {
      id: "agent_respond",
      type: "action",
      position: { x: 250, y: 400 },
      data: {
        label: "Generate Response",
        actionType: "execute_ai_agent_task",
        agentId: "{{variables.support_agent_id}}",
        prompt:
          "Generate a helpful, professional response to this support ticket:\n\nCategory: {{agent_classify.output.analysis.category}}\nCustomer: {{trigger.ticket.customer_name}}\nMessage: {{trigger.ticket.message}}\n\nProvide a clear, actionable response.",
      },
    },
    {
      id: "send_response",
      type: "action",
      position: { x: 250, y: 500 },
      data: {
        label: "Send Response",
        actionType: "send_email",
        to: "{{trigger.ticket.customer_email}}",
        subject: "Re: {{trigger.ticket.subject}}",
        body: "{{agent_respond.output.agent_response}}",
        cc: "{{variables.support_email}}",
      },
    },
  ] as WorkflowNode[],
  edges: [
    {
      id: "e1",
      source: "trigger_1",
      target: "agent_classify",
    },
    {
      id: "e2",
      source: "agent_classify",
      target: "condition_urgent",
    },
    {
      id: "e3",
      source: "condition_urgent",
      target: "task_urgent",
      data: { branch: "true" },
    },
    {
      id: "e4",
      source: "condition_urgent",
      target: "agent_respond",
      data: { branch: "false" },
    },
    {
      id: "e5",
      source: "agent_respond",
      target: "send_response",
    },
  ] as WorkflowEdge[],
};

/**
 * Example 4: Content Moderation Workflow
 *
 * This workflow demonstrates:
 * - Content analysis for inappropriate material
 * - Automated moderation decisions
 * - Notification for flagged content
 */
export const contentModerationWorkflow: Partial<EnhancedWorkflow> = {
  name: "AI Content Moderation",
  description: "Automatically moderate user-generated content",
  trigger_type: "content.submitted",
  nodes: [
    {
      id: "trigger_1",
      type: "trigger",
      position: { x: 100, y: 100 },
      data: {
        label: "Content Submitted",
      },
    },
    {
      id: "agent_moderate",
      type: "action",
      position: { x: 100, y: 200 },
      data: {
        label: "Moderate Content",
        actionType: "ai_agent_analysis",
        agentId: "{{variables.moderation_agent_id}}",
        dataToAnalyze: "{{trigger.content.text}}",
        analysisType: "content_moderation",
      },
    },
    {
      id: "condition_appropriate",
      type: "condition",
      position: { x: 100, y: 300 },
      data: {
        label: "Is Appropriate?",
        conditions: [
          {
            field: "agent_moderate.output.analysis.is_appropriate",
            operator: "equals",
            value: true,
          },
        ],
      },
    },
    {
      id: "approve_content",
      type: "action",
      position: { x: 50, y: 400 },
      data: {
        label: "Approve Content",
        actionType: "update_lead",
        leadId: "{{trigger.content.author_id}}",
        status: "approved",
      },
    },
    {
      id: "flag_content",
      type: "action",
      position: { x: 250, y: 400 },
      data: {
        label: "Flag Content",
        actionType: "create_task",
        title: "Review Flagged Content",
        description:
          "Content from {{trigger.content.author_name}} was flagged:\n\nIssues: {{agent_moderate.output.analysis.categories}}\nConfidence: {{agent_moderate.output.analysis.confidence}}\n\nContent: {{trigger.content.text}}",
        assignee: "moderation_team",
        priority: "high",
      },
    },
  ] as WorkflowNode[],
  edges: [
    {
      id: "e1",
      source: "trigger_1",
      target: "agent_moderate",
    },
    {
      id: "e2",
      source: "agent_moderate",
      target: "condition_appropriate",
    },
    {
      id: "e3",
      source: "condition_appropriate",
      target: "approve_content",
      data: { branch: "true" },
    },
    {
      id: "e4",
      source: "condition_appropriate",
      target: "flag_content",
      data: { branch: "false" },
    },
  ] as WorkflowEdge[],
};

/**
 * Direct API Usage Example
 *
 * This shows how to call the execute-agent endpoint directly
 */
export async function executeAgentDirectly() {
  const response = await fetch("/api/workflows/actions/execute-agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflowId: "wf-123",
      stepId: "step-456",
      executionId: "exec-789",
      agentId: "agent-abc",
      prompt: "Analyze this lead and provide a score from 0-100",
      context: {
        organizationId: "org-xyz",
        lead: {
          name: "John Doe",
          email: "john@example.com",
          source: "website",
          interests: ["fitness", "nutrition"],
        },
      },
    }),
  });

  const result = await response.json();

  if (result.success) {
    console.log("Agent Result:", result.result);
    console.log("Cost:", result.cost);
    console.log("Execution Time:", result.executionTimeMs, "ms");
  } else {
    console.error("Error:", result.error);
  }

  return result;
}

/**
 * Get Agent Execution Logs
 *
 * Retrieve logs for a specific workflow
 */
export async function getAgentExecutionLogs(
  workflowId: string,
  executionId?: string,
) {
  const params = new URLSearchParams({
    workflowId,
    limit: "100",
  });

  if (executionId) {
    params.append("executionId", executionId);
  }

  const response = await fetch(
    `/api/workflows/actions/execute-agent?${params}`,
  );
  const result = await response.json();

  if (result.success) {
    console.log("Logs:", result.data);
    console.log("Total:", result.meta.count);
  }

  return result;
}
