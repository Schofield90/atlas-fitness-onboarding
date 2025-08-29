import { useWorkflowValidation } from '@/components/automation/WorkflowValidator'
import { renderHook } from '@testing-library/react'
import type { WorkflowNode } from '@/lib/types/automation'
import type { Edge } from 'reactflow'

describe('Workflow Validation', () => {
  const createTriggerNode = (id: string, config: any = {}): WorkflowNode => ({
    id,
    type: 'trigger',
    position: { x: 0, y: 100 },
    data: {
      label: 'Lead Trigger',
      actionType: 'lead_trigger',
      config,
    },
  })

  const createActionNode = (id: string, actionType: string, config: any = {}): WorkflowNode => ({
    id,
    type: 'action',
    position: { x: 200, y: 100 },
    data: {
      label: `${actionType} Action`,
      actionType,
      config,
    },
  })

  const createConditionNode = (id: string, config: any = {}): WorkflowNode => ({
    id,
    type: 'condition',
    position: { x: 300, y: 100 },
    data: {
      label: 'Condition',
      config,
    },
  })

  const createEdge = (source: string, target: string, sourceHandle?: string): Edge => ({
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle,
  })

  describe('Basic validation requirements', () => {
    it('should require at least one trigger node', () => {
      const nodes: WorkflowNode[] = []
      const edges: Edge[] = []

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(false)
      expect(result.current.errors).toHaveLength(1)
      expect(result.current.errors[0].code).toBe('NO_TRIGGER')
      expect(result.current.errors[0].message).toBe('Workflow must have at least one trigger node')
    })

    it('should validate successfully with minimal valid workflow', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createActionNode('action-1', 'send_email', {
          mode: 'custom',
          subject: 'Test Subject',
          body: 'Test Body'
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(true)
      expect(result.current.errors).toHaveLength(0)
    })

    it('should warn about multiple triggers', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createTriggerNode('trigger-2'),
        createActionNode('action-1', 'send_email', {
          mode: 'custom',
          subject: 'Test',
          body: 'Test'
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.warnings).toContainEqual(
        expect.objectContaining({
          code: 'MULTIPLE_TRIGGERS',
          message: 'Multiple trigger nodes detected'
        })
      )
    })
  })

  describe('Email action validation', () => {
    it('should block workflow execution when email is missing subject', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createActionNode('action-1', 'send_email', {
          mode: 'custom',
          // subject is missing
          body: 'Test Body'
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(false)
      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_EMAIL_SUBJECT',
          message: 'Custom email requires a subject',
          nodeId: 'action-1',
          severity: 'high'
        })
      )
    })

    it('should block workflow execution when email is missing body', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createActionNode('action-1', 'send_email', {
          mode: 'custom',
          subject: 'Test Subject',
          // body is missing
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(false)
      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_EMAIL_BODY',
          message: 'Custom email requires a body',
          nodeId: 'action-1',
          severity: 'high'
        })
      )
    })

    it('should validate successfully when email has both subject and body', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createActionNode('action-1', 'send_email', {
          mode: 'custom',
          subject: 'Welcome to our gym!',
          body: 'Thank you for your interest in our fitness programs.'
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(true)
      expect(result.current.errors).toHaveLength(0)
    })

    it('should require template selection when email mode is template', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createActionNode('action-1', 'send_email', {
          mode: 'template',
          // templateId is missing
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(false)
      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_EMAIL_TEMPLATE',
          message: 'Email action requires a template selection',
          nodeId: 'action-1'
        })
      )
    })
  })

  describe('SMS action validation', () => {
    it('should block workflow when SMS message is missing', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createActionNode('action-1', 'send_sms', {
          // message is missing
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(false)
      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_SMS_MESSAGE',
          message: 'SMS action requires a message',
          nodeId: 'action-1'
        })
      )
    })

    it('should warn when SMS message exceeds 160 characters', () => {
      const longMessage = 'This is a very long SMS message that exceeds the 160 character limit for standard SMS messages and should trigger a warning about potential multiple message charges.'
      
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createActionNode('action-1', 'send_sms', {
          message: longMessage
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.warnings).toContainEqual(
        expect.objectContaining({
          code: 'SMS_TOO_LONG',
          message: 'SMS message exceeds 160 characters',
          nodeId: 'action-1'
        })
      )
    })

    it('should validate successfully when SMS has valid message', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createActionNode('action-1', 'send_sms', {
          message: 'Welcome! Thanks for your interest in our gym.'
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(true)
      expect(result.current.errors).toHaveLength(0)
    })
  })

  describe('WhatsApp action validation', () => {
    it('should block workflow when WhatsApp template mode lacks template', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createActionNode('action-1', 'send_whatsapp', {
          mode: 'template',
          // templateId is missing
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(false)
      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_WHATSAPP_TEMPLATE',
          message: 'WhatsApp template mode requires template selection',
          nodeId: 'action-1'
        })
      )
    })

    it('should block workflow when WhatsApp freeform mode lacks message', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createActionNode('action-1', 'send_whatsapp', {
          mode: 'freeform',
          // message is missing
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(false)
      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_WHATSAPP_MESSAGE',
          message: 'WhatsApp message is required',
          nodeId: 'action-1'
        })
      )
    })
  })

  describe('Condition node validation', () => {
    it('should block workflow when condition lacks configuration', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createConditionNode('condition-1', {
          // conditionType is missing
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'condition-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(false)
      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_CONDITION_TYPE',
          message: 'Condition node requires a condition type',
          nodeId: 'condition-1'
        })
      )
    })

    it('should block workflow when field comparison is incomplete', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createConditionNode('condition-1', {
          conditionType: 'field_comparison',
          field: 'lead.status',
          // operator and value are missing
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'condition-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(false)
      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          code: 'INCOMPLETE_CONDITION',
          message: 'Field comparison requires field, operator, and value',
          nodeId: 'condition-1'
        })
      )
    })

    it('should warn when condition lacks true path', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createConditionNode('condition-1', {
          conditionType: 'field_comparison',
          field: 'lead.status',
          operator: 'equals',
          value: 'qualified'
        }),
        createActionNode('action-1', 'send_email', {
          mode: 'custom',
          subject: 'Test',
          body: 'Test'
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'condition-1'),
        // Only false path connected
        createEdge('condition-1', 'action-1', 'false')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.warnings).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_TRUE_PATH',
          message: 'Condition has no "true" path',
          nodeId: 'condition-1'
        })
      )
    })

    it('should warn when condition lacks false path', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createConditionNode('condition-1', {
          conditionType: 'field_comparison',
          field: 'lead.status',
          operator: 'equals',
          value: 'qualified'
        }),
        createActionNode('action-1', 'send_email', {
          mode: 'custom',
          subject: 'Test',
          body: 'Test'
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'condition-1'),
        // Only true path connected
        createEdge('condition-1', 'action-1', 'true')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.warnings).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_FALSE_PATH',
          message: 'Condition has no "false" path',
          nodeId: 'condition-1'
        })
      )
    })
  })

  describe('Disconnected node detection', () => {
    it('should detect disconnected action nodes', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createActionNode('action-1', 'send_email', {
          mode: 'custom',
          subject: 'Test',
          body: 'Test'
        }),
        // Disconnected action
        createActionNode('action-2', 'send_sms', {
          message: 'Test SMS'
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
        // action-2 is not connected
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(false)
      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          code: 'DISCONNECTED_NODE',
          message: 'Node is not connected to the workflow',
          nodeId: 'action-2'
        })
      )
    })

    it('should allow trigger nodes without incoming connections', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createActionNode('action-1', 'send_email', {
          mode: 'custom',
          subject: 'Test',
          body: 'Test'
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      // Should not complain about trigger having no incoming edge
      expect(result.current.errors.find(e => e.code === 'DISCONNECTED_NODE' && e.nodeId === 'trigger-1')).toBeUndefined()
    })
  })

  describe('Workflow quality scoring', () => {
    it('should give high score to valid workflow', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createActionNode('action-1', 'send_email', {
          mode: 'custom',
          subject: 'Welcome!',
          body: 'Thank you for joining.'
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'action-1')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.score).toBeGreaterThan(80)
      expect(result.current.maxScore).toBe(100)
    })

    it('should give low score to workflow with multiple errors', () => {
      const nodes: WorkflowNode[] = [
        createActionNode('action-1', 'send_email', {
          // Missing subject and body
          mode: 'custom'
        }),
        // Disconnected action
        createActionNode('action-2', 'send_sms', {
          // Missing message
        })
      ]
      const edges: Edge[] = []

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.score).toBeLessThan(50)
      expect(result.current.isValid).toBe(false)
    })
  })

  describe('Complex workflow scenarios', () => {
    it('should validate complex workflow with conditions and multiple paths', () => {
      const nodes: WorkflowNode[] = [
        createTriggerNode('trigger-1'),
        createConditionNode('condition-1', {
          conditionType: 'field_comparison',
          field: 'lead.source',
          operator: 'equals',
          value: 'facebook'
        }),
        createActionNode('action-1', 'send_email', {
          mode: 'custom',
          subject: 'Facebook Lead',
          body: 'Thanks for your Facebook inquiry!'
        }),
        createActionNode('action-2', 'send_email', {
          mode: 'custom',
          subject: 'General Lead',
          body: 'Thanks for your inquiry!'
        })
      ]
      const edges: Edge[] = [
        createEdge('trigger-1', 'condition-1'),
        createEdge('condition-1', 'action-1', 'true'),
        createEdge('condition-1', 'action-2', 'false')
      ]

      const { result } = renderHook(() => useWorkflowValidation(nodes, edges))

      expect(result.current.isValid).toBe(true)
      expect(result.current.errors).toHaveLength(0)
      expect(result.current.score).toBeGreaterThan(85)
    })
  })
})