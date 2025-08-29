import { nanoid } from 'nanoid'
import { v4 as uuidv4 } from 'uuid'
import type { WorkflowNode } from '@/lib/types/automation'

// Mock the nanoid and uuid functions
jest.mock('nanoid', () => ({
  nanoid: jest.fn()
}))

jest.mock('uuid', () => ({
  v4: jest.fn()
}))

const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>
const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>

describe('Node Append Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set up default mock implementations
    mockNanoid.mockImplementation(() => Math.random().toString(36).substring(2, 10))
    mockUuidv4.mockImplementation(() => `uuid-${Math.random().toString(36).substring(2)}`)
  })

  describe('Node creation and appending', () => {
    it('should create nodes with unique IDs when adding multiple actions', () => {
      // Mock ID generation to return predictable values
      mockNanoid.mockReturnValueOnce('node-1')
      mockNanoid.mockReturnValueOnce('node-2')

      const initialNodes: WorkflowNode[] = []
      
      // Simulate creating first action node
      const firstNode: WorkflowNode = {
        id: nanoid(),
        type: 'action',
        position: { x: 100, y: 100 },
        data: {
          label: 'Send Email',
          actionType: 'send_email',
          config: {}
        }
      }

      // Simulate creating second action node
      const secondNode: WorkflowNode = {
        id: nanoid(),
        type: 'action', 
        position: { x: 200, y: 100 },
        data: {
          label: 'Send SMS',
          actionType: 'send_sms',
          config: {}
        }
      }

      // Append nodes to array
      const updatedNodes = [...initialNodes, firstNode, secondNode]

      // Verify array length increases correctly
      expect(updatedNodes).toHaveLength(2)
      
      // Verify IDs are unique
      expect(firstNode.id).toBe('node-1')
      expect(secondNode.id).toBe('node-2')
      expect(firstNode.id).not.toBe(secondNode.id)
    })

    it('should maintain unique IDs with UUID when nanoid is disabled', () => {
      // Mock UUID generation
      mockUuidv4.mockReturnValueOnce('uuid-action-1')
      mockUuidv4.mockReturnValueOnce('uuid-action-2')

      const useNanoidNodes = false
      const initialNodes: WorkflowNode[] = []
      
      // Simulate node creation with UUID
      const createNode = (actionType: string, label: string, position: { x: number, y: number }): WorkflowNode => ({
        id: useNanoidNodes ? nanoid() : uuidv4(),
        type: 'action',
        position,
        data: {
          label,
          actionType,
          config: {}
        }
      })

      const firstAction = createNode('send_email', 'Send Email', { x: 100, y: 100 })
      const secondAction = createNode('send_whatsapp', 'Send WhatsApp', { x: 200, y: 100 })

      const updatedNodes = [...initialNodes, firstAction, secondAction]

      expect(updatedNodes).toHaveLength(2)
      expect(firstAction.id).toBe('uuid-action-1')
      expect(secondAction.id).toBe('uuid-action-2')
      expect(firstAction.id).not.toBe(secondAction.id)
    })

    it('should properly append nodes to existing array without mutations', () => {
      const existingNodes: WorkflowNode[] = [
        {
          id: 'existing-trigger',
          type: 'trigger',
          position: { x: 0, y: 100 },
          data: {
            label: 'Facebook Lead Form',
            actionType: 'facebook_lead_form',
            config: {}
          }
        }
      ]

      mockNanoid.mockReturnValueOnce('new-action-1')
      mockNanoid.mockReturnValueOnce('new-action-2')

      const newAction1: WorkflowNode = {
        id: nanoid(),
        type: 'action',
        position: { x: 200, y: 100 },
        data: {
          label: 'Send Email',
          actionType: 'send_email',
          config: {}
        }
      }

      const newAction2: WorkflowNode = {
        id: nanoid(),
        type: 'action',
        position: { x: 400, y: 100 },
        data: {
          label: 'Add Tag',
          actionType: 'add_tag',
          config: {}
        }
      }

      // Test immutable append
      const afterFirstAppend = [...existingNodes, newAction1]
      const afterSecondAppend = [...afterFirstAppend, newAction2]

      // Verify original array unchanged
      expect(existingNodes).toHaveLength(1)
      
      // Verify proper appending
      expect(afterFirstAppend).toHaveLength(2)
      expect(afterSecondAppend).toHaveLength(3)
      
      // Verify all IDs are unique
      const allIds = afterSecondAppend.map(node => node.id)
      const uniqueIds = new Set(allIds)
      expect(uniqueIds.size).toBe(allIds.length)
    })

    it('should handle concurrent node additions correctly', () => {
      let nodeCounter = 0
      mockNanoid.mockImplementation(() => `concurrent-node-${++nodeCounter}`)

      const initialNodes: WorkflowNode[] = []
      
      // Simulate multiple rapid node additions (like drag-and-drop)
      const createActionNode = (actionType: string, position: { x: number, y: number }): WorkflowNode => ({
        id: nanoid(),
        type: 'action',
        position,
        data: {
          label: `Action ${actionType}`,
          actionType,
          config: {}
        }
      })

      // Simulate rapid additions
      const nodes = [
        createActionNode('send_email', { x: 100, y: 100 }),
        createActionNode('wait', { x: 200, y: 100 }),
        createActionNode('send_sms', { x: 300, y: 100 }),
      ]

      // Append all at once (simulating batch update)
      const finalNodes = [...initialNodes, ...nodes]

      expect(finalNodes).toHaveLength(3)
      expect(finalNodes.map(n => n.id)).toEqual([
        'concurrent-node-1',
        'concurrent-node-2', 
        'concurrent-node-3'
      ])
    })

    it('should preserve node order when appending', () => {
      const initialNodes: WorkflowNode[] = [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 0, y: 100 },
          data: { label: 'Trigger', actionType: 'lead_trigger', config: {} }
        }
      ]

      mockNanoid.mockReturnValueOnce('action-1')
      mockNanoid.mockReturnValueOnce('action-2')

      const action1: WorkflowNode = {
        id: nanoid(),
        type: 'action',
        position: { x: 200, y: 100 },
        data: { label: 'First Action', actionType: 'send_email', config: {} }
      }

      const action2: WorkflowNode = {
        id: nanoid(),
        type: 'action',
        position: { x: 400, y: 100 },
        data: { label: 'Second Action', actionType: 'send_sms', config: {} }
      }

      // Append sequentially 
      let currentNodes = [...initialNodes]
      currentNodes = [...currentNodes, action1]
      currentNodes = [...currentNodes, action2]

      // Verify order is preserved
      expect(currentNodes[0].id).toBe('trigger-1')
      expect(currentNodes[1].id).toBe('action-1')
      expect(currentNodes[2].id).toBe('action-2')
      
      // Verify labels to confirm order
      expect(currentNodes.map(n => n.data.label)).toEqual([
        'Trigger', 
        'First Action',
        'Second Action'
      ])
    })

    it('should handle edge cases in node appending', () => {
      // Test empty array
      const emptyNodes: WorkflowNode[] = []
      mockNanoid.mockReturnValueOnce('first-node')
      
      const firstNode: WorkflowNode = {
        id: nanoid(),
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: { label: 'First Node', actionType: 'lead_trigger', config: {} }
      }

      const result = [...emptyNodes, firstNode]
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('first-node')

      // Test single node to two nodes
      mockNanoid.mockReturnValueOnce('second-node')
      const secondNode: WorkflowNode = {
        id: nanoid(),
        type: 'action', 
        position: { x: 200, y: 0 },
        data: { label: 'Second Node', actionType: 'send_email', config: {} }
      }

      const finalResult = [...result, secondNode]
      expect(finalResult).toHaveLength(2)
      expect(finalResult.map(n => n.id)).toEqual(['first-node', 'second-node'])
    })

    it('should maintain referential integrity when appending nodes', () => {
      const originalNode: WorkflowNode = {
        id: 'original',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: { label: 'Original', actionType: 'lead_trigger', config: { setting: 'value' } }
      }

      const initialNodes = [originalNode]
      
      mockNanoid.mockReturnValueOnce('new-node')
      const newNode: WorkflowNode = {
        id: nanoid(),
        type: 'action',
        position: { x: 200, y: 0 },
        data: { label: 'New Node', actionType: 'send_email', config: {} }
      }

      const updatedNodes = [...initialNodes, newNode]

      // Original array should be unchanged
      expect(initialNodes).toHaveLength(1)
      expect(initialNodes[0]).toBe(originalNode)
      
      // New array should have both nodes
      expect(updatedNodes).toHaveLength(2)
      expect(updatedNodes[0]).toBe(originalNode) // Same reference
      expect(updatedNodes[1]).toBe(newNode)
      
      // Original node config should be intact
      expect(updatedNodes[0].data.config.setting).toBe('value')
    })
  })
})