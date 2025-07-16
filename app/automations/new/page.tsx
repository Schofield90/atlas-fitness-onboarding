'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { createSupabaseClient } from '@/lib/supabase';
import { FlowNode, AutomationAction } from '@/lib/types/automation';
import WorkflowSidebar from '@/components/automation/WorkflowSidebar';
import NodePropertiesPanel from '@/components/automation/NodePropertiesPanel';
import TriggerNode from '@/components/automation/nodes/TriggerNode';
import ActionNode from '@/components/automation/nodes/ActionNode';
import ConditionNode from '@/components/automation/nodes/ConditionNode';
import DelayNode from '@/components/automation/nodes/DelayNode';
import { 
  ArrowLeft, 
  Save
} from 'lucide-react';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
};

const initialNodes: FlowNode[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 250, y: 100 },
    data: {
      label: 'Trigger',
      description: 'Select a trigger to start your workflow',
      config: {},
    },
    workflow_id: '',
    node_id: 'trigger-1',
    name: 'Trigger',
    position_x: 250,
    position_y: 100,
    config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function NewWorkflowPage() {
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [actions, setActions] = useState<AutomationAction[]>([]);

  const selectedNode = useMemo(() => 
    nodes.find(node => node.id === selectedNodeId) || null
  , [nodes, selectedNodeId]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const addNode = useCallback((type: FlowNode['type'], actionId?: string) => {
    const newNode: FlowNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 300 },
      data: {
        label: type.charAt(0).toUpperCase() + type.slice(1),
        description: `New ${type} node`,
        config: {},
        action: actionId ? actions.find(a => a.id === actionId) : undefined,
      },
      workflow_id: '',
      node_id: `${type}-${Date.now()}`,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      position_x: 100 + Math.random() * 300,
      position_y: 100 + Math.random() * 300,
      config: {},
      action_id: actionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(newNode.id);
  }, [setNodes, actions]);

  const updateNodeData = useCallback((nodeId: string, data: Partial<FlowNode['data']>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: { ...node.data, ...data },
            }
          : node
      )
    );
  }, [setNodes]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      alert('Please enter a workflow name');
      return;
    }

    setSaving(true);
    try {
      const supabase = createSupabaseClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user profile for organization
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Find trigger node to determine trigger type
      const triggerNode = nodes.find(node => node.type === 'trigger');
      if (!triggerNode || !triggerNode.data.config.trigger_type) {
        alert('Please configure the trigger before saving');
        return;
      }

      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('automation_workflows')
        .insert({
          organization_id: profile.organization_id,
          name: workflowName,
          description: workflowDescription,
          trigger_type: triggerNode.data.config.trigger_type,
          trigger_config: triggerNode.data.config,
          steps: [], // Will be updated after creating nodes
          is_active: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create workflow nodes
      const nodeInserts = nodes.map(node => ({
        workflow_id: workflow.id,
        node_id: node.id,
        type: node.type,
        name: node.data.label,
        description: node.data.description,
        position_x: node.position.x,
        position_y: node.position.y,
        config: node.data.config,
        action_id: node.data.action?.id || null,
      }));

      const { error: nodesError } = await supabase
        .from('workflow_nodes')
        .insert(nodeInserts);

      if (nodesError) throw nodesError;

      // Create workflow edges
      const edgeInserts = edges.map(edge => ({
        workflow_id: workflow.id,
        edge_id: edge.id,
        source_node_id: edge.source,
        target_node_id: edge.target,
        source_handle: edge.sourceHandle,
        target_handle: edge.targetHandle,
        condition_type: 'always',
      }));

      if (edgeInserts.length > 0) {
        const { error: edgesError } = await supabase
          .from('workflow_edges')
          .insert(edgeInserts);

        if (edgesError) throw edgesError;
      }

      router.push(`/automations/${workflow.id}`);
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const loadActions = async () => {
    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from('automation_actions')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setActions(data || []);
    } catch (error) {
      console.error('Error loading actions:', error);
    }
  };

  React.useEffect(() => {
    loadActions();
  }, []);

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Create Workflow</h1>
                <p className="text-sm text-gray-500">Build your automation workflow</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={saveWorkflow}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Workflow'}
              </button>
            </div>
          </div>
          
          {/* Workflow Info */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow Name
              </label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Enter workflow name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                placeholder="Describe what this workflow does..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Sidebar */}
          <WorkflowSidebar 
            onAddNode={addNode}
            actions={actions}
          />

          {/* Flow Canvas */}
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
            >
              <Controls />
              <MiniMap />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
          </div>

          {/* Properties Panel */}
          {selectedNode && (
            <NodePropertiesPanel
              node={selectedNode}
              onUpdateNode={updateNodeData}
              onDeleteNode={deleteNode}
              actions={actions}
            />
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
}