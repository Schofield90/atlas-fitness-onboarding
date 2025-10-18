"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useFeatureFlag } from "@/app/lib/feature-flags";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  NodeToolbar,
  MarkerType,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from "reactflow";
// ReactFlow styles are imported globally to avoid SSR issues
import {
  Save,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Trash2,
  Settings,
  Bug,
  Plus,
  Folder,
  ChevronRight,
  Search,
  Zap,
  GitBranch,
  Clock,
  Code,
  Filter,
  Repeat,
} from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid";
import { toast } from "react-hot-toast";

import type {
  Workflow,
  WorkflowNode,
  NodeType,
  NodePaletteItem,
  ActionDefinition,
  TriggerDefinition,
  BuilderState,
  ExecutionStep,
} from "@/app/lib/types/automation";

// Import custom nodes
import TriggerNode from "./nodes/TriggerNode";
import ActionNode from "./nodes/ActionNode";
import ConditionNode from "./nodes/ConditionNode";
import WaitNode from "./nodes/WaitNode";
import LoopNode from "./nodes/LoopNode";
import TransformNode from "./nodes/TransformNode";
import FilterNode from "./nodes/FilterNode";
import DynamicConfigPanelEnhanced from "./config/DynamicConfigPanelEnhanced";
import { ConfigPanelErrorBoundary } from "./config/ConfigPanelErrorBoundary";

// Node types mapping
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  wait: WaitNode,
  loop: LoopNode,
  transform: TransformNode,
  filter: FilterNode,
};

// Helper to get default config based on node type
const getDefaultNodeConfig = (type: string, actionType?: string) => {
  const defaults: Record<string, any> = {
    trigger: {
      subtype: actionType || "lead_trigger",
      sourceId: "",
      conditions: [],
    },
    action: {
      actionType: actionType || "send_email",
      mode: "template",
      templateId: "",
      subject: "",
      body: "",
      delay: 0,
    },
    condition: {
      field: "",
      operator: "equals",
      value: "",
      trueBranch: null,
      falseBranch: null,
    },
    wait: {
      duration: 60,
      unit: "seconds",
    },
    loop: {
      maxIterations: 10,
      currentIteration: 0,
      items: [],
    },
    transform: {
      inputField: "",
      outputField: "",
      transformation: "none",
    },
    filter: {
      field: "",
      operator: "contains",
      value: "",
    },
  };

  return defaults[type] || {};
};

// Node palette categories
const nodePalette: Record<string, NodePaletteItem[]> = {
  triggers: [
    {
      type: "trigger",
      category: "triggers",
      name: "Facebook Lead Form",
      description: "Triggers when a lead submits a Facebook lead form",
      icon: "UserPlus",
      actionType: "facebook_lead_form",
    },
    {
      type: "trigger",
      category: "triggers",
      name: "Website Opt-in Form",
      description: "Triggers when someone fills out a form on your website",
      icon: "FileText",
      actionType: "website_form",
    },
    {
      type: "trigger",
      category: "triggers",
      name: "Instagram Message",
      description: "Triggers when you receive a new Instagram DM",
      icon: "MessageCircle",
      actionType: "instagram_message",
    },
    {
      type: "trigger",
      category: "triggers",
      name: "Facebook Message",
      description: "Triggers when you receive a new Facebook Messenger message",
      icon: "MessageSquare",
      actionType: "facebook_message",
    },
    {
      type: "trigger",
      category: "triggers",
      name: "WhatsApp Message",
      description: "Triggers when you receive a new WhatsApp message",
      icon: "Phone",
      actionType: "whatsapp_message",
    },
    {
      type: "trigger",
      category: "triggers",
      name: "Call Booking",
      description: "Triggers when someone books a call via booking widget",
      icon: "Calendar",
      actionType: "call_booking.created",
    },
    {
      type: "trigger",
      category: "triggers",
      name: "Manual Entry",
      description: "Triggers when a lead is manually added",
      icon: "UserPlus",
      actionType: "manual_lead",
    },
    {
      type: "trigger",
      category: "triggers",
      name: "Schedule",
      description: "Triggers at scheduled times",
      icon: "Clock",
      actionType: "scheduled",
    },
    {
      type: "trigger",
      category: "triggers",
      name: "Webhook",
      description: "Triggers on webhook calls",
      icon: "Globe",
      actionType: "webhook",
    },
  ],
  communication: [
    {
      type: "action",
      category: "communication",
      name: "Send Email",
      description: "Send an email to a contact",
      icon: "Mail",
      actionType: "send_email",
    },
    {
      type: "action",
      category: "communication",
      name: "Send SMS",
      description: "Send an SMS message",
      icon: "MessageSquare",
      actionType: "send_sms",
    },
    {
      type: "action",
      category: "communication",
      name: "Send WhatsApp",
      description: "Send a WhatsApp message",
      icon: "MessageCircle",
      actionType: "send_whatsapp",
    },
  ],
  crm: [
    {
      type: "action",
      category: "crm",
      name: "Update Lead",
      description: "Update lead information",
      icon: "UserCheck",
      actionType: "update_lead",
    },
    {
      type: "action",
      category: "crm",
      name: "Add Tag",
      description: "Add a tag to a lead or client",
      icon: "Tag",
      actionType: "add_tag",
    },
    {
      type: "action",
      category: "crm",
      name: "Change Stage",
      description: "Change lead pipeline stage",
      icon: "GitBranch",
      actionType: "change_stage",
    },
  ],
  logic: [
    {
      type: "condition",
      category: "logic",
      name: "If/Else",
      description: "Conditional branching",
      icon: "GitBranch",
    },
    {
      type: "wait",
      category: "logic",
      name: "Wait",
      description: "Wait for specified time",
      icon: "Clock",
    },
    {
      type: "loop",
      category: "logic",
      name: "Loop",
      description: "Loop through items",
      icon: "Repeat",
    },
    {
      type: "filter",
      category: "logic",
      name: "Filter",
      description: "Filter data based on conditions",
      icon: "Filter",
    },
  ],
  data: [
    {
      type: "transform",
      category: "data",
      name: "Transform Data",
      description: "Transform data using JavaScript",
      icon: "Code",
    },
    {
      type: "action",
      category: "data",
      name: "HTTP Request",
      description: "Make an HTTP request",
      icon: "Globe",
      actionType: "http_request",
    },
  ],
};

// Draggable palette item
function PaletteItem({ item }: { item: NodePaletteItem }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "node",
    item: { ...item },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (draggedItem, monitor) => {
      const dropResult = monitor.getDropResult<{
        nodeId?: string;
        success?: boolean;
      }>();
      if (dropResult?.success) {
        console.log("Node created successfully:", {
          draggedItem: draggedItem.name,
          nodeId: dropResult.nodeId,
        });
      } else if (monitor.didDrop()) {
        console.warn("Drop failed:", draggedItem.name);
      }
    },
  }));

  return (
    <div
      ref={drag as any}
      className={`p-3 bg-gray-700 rounded-lg cursor-move transition-all hover:bg-gray-600 ${
        isDragging ? "opacity-50 scale-95" : ""
      }`}
      onMouseDown={() => console.log("Starting drag for:", item.name)}
      style={{ touchAction: "none" }} // Prevent touch scrolling while dragging
    >
      <div className="flex items-center gap-2 mb-1 pointer-events-none">
        <Zap className="h-4 w-4 text-orange-500" />
        <span className="text-sm font-medium">{item.name}</span>
      </div>
      <p className="text-xs text-gray-400 pointer-events-none">
        {item.description}
      </p>
    </div>
  );
}

// Main workflow builder component
interface WorkflowBuilderProps {
  workflow?: Workflow;
  onSave?: (workflow: Workflow) => void | Promise<void>;
  onTest?: (workflow: Workflow) => void;
  onCancel?: () => void;
}

function WorkflowBuilderInner({
  workflow,
  onSave,
  onTest,
  onCancel,
}: WorkflowBuilderProps) {
  // Feature flags
  const useCanvasImproved = useFeatureFlag("automationBuilderCanvasImproved");
  const useNanoidNodes = useFeatureFlag("automationBuilderNanoidNodes");
  const useMinimapSafety = useFeatureFlag("automationBuilderMinimapSafety");
  const useStrictValidation = useFeatureFlag("automationBuilderValidation");

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    workflow?.workflowData.nodes || [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    workflow?.workflowData.edges || [],
  );
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["triggers"]),
  );
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [configNode, setConfigNode] = useState<WorkflowNode | null>(null);
  const [workflowState, setWorkflow] = useState<Workflow | undefined>(workflow);
  const [workflowName, setWorkflowName] = useState(
    workflow?.name || "New Workflow",
  );

  // Drop handler for the canvas
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: "node",
      drop: (item: NodePaletteItem, monitor) => {
        const reactFlowBounds =
          reactFlowWrapper.current?.getBoundingClientRect();
        const clientOffset = monitor.getClientOffset();

        console.log("Drop triggered:", {
          item,
          reactFlowBounds,
          clientOffset,
          hasInstance: !!reactFlowInstance,
        });

        if (reactFlowBounds && clientOffset) {
          let position;

          // If ReactFlow instance is available, use it for projection
          if (reactFlowInstance) {
            const projected = reactFlowInstance.project({
              x: clientOffset.x - reactFlowBounds.left,
              y: clientOffset.y - reactFlowBounds.top,
            });

            // FIXED: Avoid minimap area (bottom-right corner, typically 200x150px)
            const minimapWidth = 200;
            const minimapHeight = 150;
            const canvasWidth = reactFlowBounds.width;
            const canvasHeight = reactFlowBounds.height;

            let adjustedX = projected.x;
            let adjustedY = projected.y;

            // If dropping in minimap area, move to safe zone
            if (
              adjustedX > canvasWidth - minimapWidth &&
              adjustedY > canvasHeight - minimapHeight
            ) {
              adjustedX = Math.max(50, canvasWidth - minimapWidth - 100);
              adjustedY = Math.max(50, canvasHeight - minimapHeight - 100);
            }

            position = {
              x: adjustedX + (Math.random() - 0.5) * 10,
              y: adjustedY + (Math.random() - 0.5) * 10,
            };
          } else {
            // Fallback: use direct coordinates if instance not ready
            position = {
              x:
                clientOffset.x -
                reactFlowBounds.left +
                (Math.random() - 0.5) * 10,
              y:
                clientOffset.y -
                reactFlowBounds.top +
                (Math.random() - 0.5) * 10,
            };
          }

          // FIXED: Ensure truly unique node ID generation with nanoid (shorter, safer IDs)
          let nodeId: string;
          if (useNanoidNodes) {
            // Use nanoid for shorter, URL-safe IDs
            do {
              nodeId = nanoid(10); // 10 character IDs should be unique enough
            } while (nodes.some((n) => n.id === nodeId));
          } else {
            // Fallback to UUID v4
            do {
              nodeId = uuidv4();
            } while (nodes.some((n) => n.id === nodeId));
          }

          // Initialize with complete node data structure to prevent undefined errors
          const newNode: WorkflowNode = {
            id: nodeId,
            type: item.type,
            position,
            data: {
              label: item.name || "New Node",
              icon: item.icon || "Settings",
              actionType: item.actionType || item.type,
              config: {
                // Initialize with default values based on node type
                label: item.name || "New Node",
                description: item.description || "",
                ...getDefaultNodeConfig(item.type, item.actionType),
              },
              description: item.description || "",
              isValid: item.type === "trigger", // Triggers are valid by default
              onSettings: (nodeId: string) => {
                console.log('[WorkflowBuilder] onSettings called for node:', nodeId);
                // Find and select the node
                const node = nodes.find(n => n.id === nodeId);
                console.log('[WorkflowBuilder] Found node:', node ? 'YES' : 'NO', node);
                if (node) {
                  console.log('[WorkflowBuilder] Opening config panel...');
                  setConfigNode(node as WorkflowNode);
                  setShowConfigPanel(true);
                  setSelectedNode(nodeId);
                }
              },
            },
          };

          console.log("Creating new node:", newNode);
          console.log("Node ID:", newNode.id);
          // FIXED: Use functional update to ensure proper state persistence
          setNodes((currentNodes) => {
            console.log(
              "Current nodes before adding:",
              currentNodes.length,
              currentNodes.map((n) => n.id),
            );
            // Ensure we're working with the latest state and properly append the node
            const updatedNodes = currentNodes.concat(newNode);
            console.log(
              "Updated nodes array:",
              updatedNodes.length,
              updatedNodes.map((n) => n.id),
            );
            return updatedNodes;
          });

          // Auto-center the view on the new node
          if (reactFlowInstance) {
            setTimeout(() => {
              reactFlowInstance.fitView({
                nodes: [{ id: newNode.id }],
                duration: 800,
                padding: 0.3,
              });
            }, 100); // Small delay to ensure node is rendered
          }

          // Return drop result to complete the drag operation
          return { nodeId: newNode.id, success: true };
        }

        // Return failure result if drop conditions not met
        return { success: false };
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [reactFlowInstance, setNodes, nodes, useNanoidNodes],
  );

  // Combine refs
  const combinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      drop(node);
      reactFlowWrapper.current = node;
    },
    [drop],
  );

  // Connection validation - prevent cycles and validate connection types
  const isValidConnection = useCallback(
    (connection: Connection) => {
      // Don't allow self-connections
      if (connection.source === connection.target) {
        return false;
      }

      // Check for cycles using DFS
      const checkCycle = (source: string, target: string): boolean => {
        const visited = new Set<string>();
        const stack = [target];

        while (stack.length > 0) {
          const current = stack.pop()!;
          if (current === source) {
            return true; // Cycle detected
          }

          if (!visited.has(current)) {
            visited.add(current);
            const outgoingEdges = edges.filter((e) => e.source === current);
            outgoingEdges.forEach((e) => {
              if (e.target) stack.push(e.target);
            });
          }
        }

        return false;
      };

      if (
        connection.source &&
        connection.target &&
        checkCycle(connection.source, connection.target)
      ) {
        console.warn("Connection would create a cycle");
        return false;
      }

      // Validate node types can connect
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (sourceNode?.type === "trigger" && targetNode?.type === "trigger") {
        return false; // Can't connect trigger to trigger
      }

      return true;
    },
    [nodes, edges],
  );

  // Connection handler with validation
  const onConnect = useCallback(
    (params: Connection) => {
      if (!isValidConnection(params)) {
        console.warn("Invalid connection attempted");
        return;
      }

      const newEdge: Edge = {
        ...params,
        id: useNanoidNodes ? nanoid(8) : uuidv4(),
        type: "smoothstep",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        style: {
          stroke: "#f97316",
          strokeWidth: 2,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, isValidConnection],
  );

  // Node selection handler
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      try {
        // Check if the click was on a settings button - if so, let the button handler take over
        const target = event.target as HTMLElement;
        const isSettingsButton = target.closest('button[data-settings="true"]');

        if (isSettingsButton) {
          console.log('[WorkflowBuilder] Click on settings button detected, skipping onNodeClick');
          return; // Let the button's onClick handler handle this
        }

        console.log("Node click event:", {
          nodeId: node.id,
          nodeType: node.type,
          nodeData: node.data,
        });

        event.stopPropagation(); // Prevent event from bubbling
        event.preventDefault(); // Prevent any default behavior

        // Validate node exists and has required properties
        if (!node || !node.id) {
          console.error("Invalid node clicked:", node);
          toast.error("Invalid node selected");
          return;
        }

        // Don't select the node for deletion, just for configuration
        setSelectedNode(node.id);

        console.log("Opening config panel for node:", node.id);

        // Open config panel on single click for better UX
        setConfigNode(node as WorkflowNode);
        setShowConfigPanel(true);

        // Ensure the node isn't marked as selected for deletion
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            selected: n.id === node.id ? false : n.selected,
          })),
        );

        console.log("Node clicked successfully:", node.id);
      } catch (error) {
        console.error("Error in onNodeClick:", error);
        toast.error("Failed to open node configuration");
      }
    },
    [setNodes],
  );

  // Delete selected elements (only when explicitly triggered)
  const deleteSelected = useCallback(() => {
    // Only delete if Delete key is pressed or delete button clicked
    // Don't delete on node click

    // If a specific node is selected via toolbar, delete that one
    if (selectedNode) {
      console.log("Deleting node from toolbar:", selectedNode);
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode));
      // Also remove any edges connected to this node
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            edge.source !== selectedNode && edge.target !== selectedNode,
        ),
      );
      setSelectedNode(null);
    } else {
      // Otherwise delete all selected nodes/edges
      const selectedNodes = nodes.filter((node) => node.selected);
      const selectedEdges = edges.filter((edge) => edge.selected);

      if (selectedNodes.length > 0) {
        console.log(
          "Deleting selected nodes:",
          selectedNodes.map((n) => n.id),
        );
        const selectedNodeIds = selectedNodes.map((n) => n.id);
        setNodes((nds) => nds.filter((node) => !node.selected));
        // Also remove edges connected to deleted nodes
        setEdges((eds) =>
          eds.filter(
            (edge) =>
              !selectedNodeIds.includes(edge.source) &&
              !selectedNodeIds.includes(edge.target),
          ),
        );
      }

      if (selectedEdges.length > 0) {
        console.log(
          "Deleting selected edges:",
          selectedEdges.map((e) => e.id),
        );
        setEdges((eds) => eds.filter((edge) => !edge.selected));
      }
    }
  }, [selectedNode, nodes, edges, setNodes, setEdges, setSelectedNode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelected();
      }
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case "s":
            event.preventDefault();
            handleSave();
            break;
          case "z":
            event.preventDefault();
            // TODO: Implement undo
            break;
          case "y":
            event.preventDefault();
            // TODO: Implement redo
            break;
          case "c":
            event.preventDefault();
            // TODO: Implement copy
            break;
          case "v":
            event.preventDefault();
            // TODO: Implement paste
            break;
        }
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [deleteSelected]);

  // Save workflow
  const handleSave = useCallback(async () => {
    // Debug logging
    console.log("[WorkflowBuilder] handleSave called", {
      hasOnSave: !!onSave,
      hasWorkflowState: !!workflowState,
      isSaving,
      nodesCount: nodes.length,
      workflowName,
    });

    if (!onSave) {
      console.error("[WorkflowBuilder] No onSave callback provided");
      setSaveMessage({
        type: "error",
        text: "Save handler not configured. Please refresh the page.",
      });
      return;
    }

    if (!workflowState) {
      console.error("[WorkflowBuilder] No workflow state available");
      setSaveMessage({
        type: "error",
        text: "Workflow state is missing. Please refresh the page.",
      });
      return;
    }

    if (onSave && workflowState) {
      setIsSaving(true);
      setSaveMessage(null);

      try {
        const updatedWorkflow: Workflow = {
          ...workflowState,
          name: workflowName,
          workflowData: {
            nodes: nodes as WorkflowNode[],
            edges,
            variables: workflowState.workflowData.variables || [],
            viewport: reactFlowInstance?.getViewport(),
          },
        };
        // Manual save - will redirect after saving
        await onSave(updatedWorkflow);
        setSaveMessage({
          type: "success",
          text: "Workflow saved successfully!",
        });
        setTimeout(() => setSaveMessage(null), 3000);
      } catch (error) {
        console.error("Failed to save workflow:", error);
        setSaveMessage({
          type: "error",
          text: "Failed to save workflow. Please try again.",
        });
      } finally {
        setIsSaving(false);
      }
    }
  }, [workflowState, workflowName, nodes, edges, reactFlowInstance, onSave]);

  // Toggle workflow active status
  const handleToggleActive = useCallback(() => {
    if (workflowState) {
      const newStatus = workflowState.status === "active" ? "paused" : "active";
      setWorkflow({ ...workflowState, status: newStatus });
      setSaveMessage({
        type: "success",
        text: `Workflow ${newStatus === "active" ? "activated" : "paused"}`,
      });
      setTimeout(() => setSaveMessage(null), 2000);
    }
  }, [workflowState]);

  // Test workflow with validation
  const handleTest = useCallback(() => {
    setIsTestMode(true);
    setShowTestPanel(true);
    setExecutionSteps([]);

    // ENHANCED: Comprehensive validation before testing
    const triggerNodes = nodes.filter((n) => n.type === "trigger");
    const actionNodes = nodes.filter((n) => n.type === "action");
    const invalidNodes = [];

    if (triggerNodes.length === 0) {
      setSaveMessage({
        type: "error",
        text: "No trigger nodes found. Add a trigger to test the workflow.",
      });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    // Validate each action node has required fields
    for (const node of actionNodes) {
      // Add null check for node.data
      if (!node.data) {
        invalidNodes.push(`${node.id}: Node data is missing`);
        continue;
      }
      const config = node.data.config || {};
      const actionType = config.actionType;

      if (!actionType) {
        invalidNodes.push(
          `${node.data?.label || node.id}: Action type not selected`,
        );
        continue;
      }

      // Check action-specific required fields
      switch (actionType) {
        case "send_email":
          if (config.mode === "custom") {
            if (!config.subject?.trim())
              invalidNodes.push(
                `${node.data?.label || node.id}: Email subject is required`,
              );
            if (!config.body?.trim())
              invalidNodes.push(
                `${node.data?.label || node.id}: Email body is required`,
              );
          } else if (config.mode === "template" && !config.templateId) {
            invalidNodes.push(
              `${node.data?.label || node.id}: Email template must be selected`,
            );
          }
          break;
        case "send_sms":
          if (!config.message?.trim()) {
            invalidNodes.push(
              `${node.data?.label || node.id}: SMS message is required`,
            );
          }
          break;
        case "send_whatsapp":
          if (config.mode === "freeform" && !config.message?.trim()) {
            invalidNodes.push(
              `${node.data?.label || node.id}: WhatsApp message is required`,
            );
          } else if (config.mode === "template" && !config.templateId) {
            invalidNodes.push(
              `${node.data?.label || node.id}: WhatsApp template must be selected`,
            );
          }
          break;
        case "create_task":
          if (!config.taskTitle?.trim()) {
            invalidNodes.push(
              `${node.data?.label || node.id}: Task title is required`,
            );
          }
          break;
      }
    }

    if (invalidNodes.length > 0) {
      setSaveMessage({
        type: "error",
        text: `Configuration errors found:\n${invalidNodes.slice(0, 3).join("\n")}${invalidNodes.length > 3 ? `\n... and ${invalidNodes.length - 3} more` : ""}`,
      });
      setTimeout(() => setSaveMessage(null), 5000);
      return;
    }

    // Create execution steps
    const steps: ExecutionStep[] = [];
    const visited = new Set<string>();

    const traverseWorkflow = (nodeId: string, depth: number = 0) => {
      if (visited.has(nodeId) || depth > 20) return; // Prevent infinite loops
      visited.add(nodeId);

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      steps.push({
        id: uuidv4(),
        nodeId,
        status: "pending",
        timestamp: new Date().toISOString(),
      });

      // Find connected nodes
      const outgoingEdges = edges.filter((e) => e.source === nodeId);
      outgoingEdges.forEach((edge) => {
        traverseWorkflow(edge.target!, depth + 1);
      });
    };

    // Start from trigger nodes
    triggerNodes.forEach((trigger) => traverseWorkflow(trigger.id));

    setExecutionSteps(steps);

    // Simulate execution
    steps.forEach((step, index) => {
      setTimeout(
        () => {
          setExecutionSteps((prev) =>
            prev.map((s) => {
              if (s.id === step.id) {
                return {
                  ...s,
                  status: index === 0 ? "running" : "completed",
                  outputData: {
                    result: "Success",
                    message: `Node executed successfully`,
                    timestamp: new Date().toISOString(),
                  },
                };
              }
              return s;
            }),
          );
        },
        (index + 1) * 500,
      );
    });

    if (onTest && workflow) {
      const updatedWorkflow: Workflow = {
        ...workflow,
        workflowData: {
          nodes: nodes as WorkflowNode[],
          edges,
          variables: workflow.workflowData.variables || [],
        },
      };
      onTest(updatedWorkflow);
    }
  }, [workflow, nodes, edges, onTest]);

  // Run test execution with payload
  // Workflow validation function
  const validateWorkflow = useCallback(() => {
    const errors: string[] = [];

    // Check if workflow has nodes
    if (nodes.length === 0) {
      errors.push("Workflow must contain at least one node");
      return { isValid: false, errors };
    }

    // Check for at least one trigger node
    const triggerNodes = nodes.filter((n) => n.type === "trigger");
    if (triggerNodes.length === 0) {
      errors.push("Workflow must have at least one trigger node");
    }

    // Validate each node has required configuration
    nodes.forEach((node) => {
      if (!node.data.config || Object.keys(node.data.config).length === 0) {
        errors.push(`Node "${node.data.label}" is missing configuration`);
      }

      // Node-specific validation
      switch (node.type) {
        case "action":
          if (!node.data.config?.actionType) {
            errors.push(
              `Action node "${node.data.label}" is missing action type`,
            );
          }

          // Action-specific validation
          const actionType = node.data.config?.actionType;
          switch (actionType) {
            case "send_email":
              if (node.data.config?.mode === "custom") {
                if (!node.data.config?.subject?.trim()) {
                  errors.push(
                    `Email action "${node.data.label}" is missing subject`,
                  );
                }
                if (!node.data.config?.body?.trim()) {
                  errors.push(
                    `Email action "${node.data.label}" is missing body`,
                  );
                }
              } else if (node.data.config?.mode === "template") {
                if (!node.data.config?.templateId) {
                  errors.push(
                    `Email action "${node.data.label}" is missing template selection`,
                  );
                }
              }
              break;

            case "send_sms":
              if (!node.data.config?.message?.trim()) {
                errors.push(
                  `SMS action "${node.data.label}" is missing message`,
                );
              }
              break;

            case "create_task":
              if (!node.data.config?.taskTitle?.trim()) {
                errors.push(
                  `Task action "${node.data.label}" is missing task title`,
                );
              }
              break;
          }
          break;

        case "condition":
          if (
            !node.data.config?.conditions ||
            node.data.config.conditions.length === 0
          ) {
            errors.push(
              `Condition node "${node.data.label}" has no conditions defined`,
            );
          }
          break;

        case "wait":
          if (
            node.data.config?.waitType === "duration" &&
            (!node.data.config?.duration || node.data.config.duration <= 0)
          ) {
            errors.push(`Wait node "${node.data.label}" has invalid duration`);
          }
          break;
      }
    });

    // Check for orphaned nodes (nodes not connected to the workflow)
    const connectedNodeIds = new Set<string>();

    // Add all trigger nodes (workflow entry points)
    triggerNodes.forEach((trigger) => {
      connectedNodeIds.add(trigger.id);
    });

    // Traverse the graph from trigger nodes
    const visited = new Set<string>();
    const queue = [...triggerNodes.map((n) => n.id)];

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      if (visited.has(currentNodeId)) continue;

      visited.add(currentNodeId);
      connectedNodeIds.add(currentNodeId);

      // Find outgoing edges from current node
      const outgoingEdges = edges.filter((e) => e.source === currentNodeId);
      outgoingEdges.forEach((edge) => {
        if (edge.target && !visited.has(edge.target)) {
          queue.push(edge.target);
        }
      });
    }

    // Check for orphaned nodes
    const orphanedNodes = nodes.filter((n) => !connectedNodeIds.has(n.id));
    orphanedNodes.forEach((node) => {
      errors.push(`Node "${node.data.label}" is not connected to the workflow`);
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [nodes, edges]);

  const runTestExecution = useCallback(
    async (payload: any) => {
      // Validate workflow before running test if feature flag is enabled
      if (useStrictValidation) {
        const validation = validateWorkflow();
        if (!validation.isValid) {
          alert(
            `Cannot run test - workflow has validation errors:\n\n${validation.errors.join("\n")}`,
          );
          return;
        }
      }

      setIsTestMode(true);
      setExecutionSteps([]);

      // Get trigger node
      const triggerNode = nodes.find((n) => n.type === "trigger");
      if (!triggerNode) {
        alert("No trigger node found in workflow");
        return;
      }

      // Build execution path from trigger
      const executionPath: string[] = [triggerNode.id];
      const visited = new Set<string>([triggerNode.id]);
      let currentNodes = [triggerNode.id];

      while (currentNodes.length > 0) {
        const nextNodes: string[] = [];
        for (const nodeId of currentNodes) {
          const outgoingEdges = edges.filter((e) => e.source === nodeId);
          for (const edge of outgoingEdges) {
            if (edge.target && !visited.has(edge.target)) {
              visited.add(edge.target);
              executionPath.push(edge.target);
              nextNodes.push(edge.target);
            }
          }
        }
        currentNodes = nextNodes;
      }

      // Simulate execution for each node
      for (let i = 0; i < executionPath.length; i++) {
        const nodeId = executionPath[i];
        const node = nodes.find((n) => n.id === nodeId);

        if (!node) continue;

        // Add running step
        const stepId = uuidv4();
        setExecutionSteps((prev) => [
          ...prev,
          {
            id: stepId,
            nodeId,
            status: "running",
            startTime: new Date().toISOString(),
          },
        ]);

        // Simulate execution delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Update step to completed
        setExecutionSteps((prev) =>
          prev.map((s) =>
            s.id === stepId
              ? {
                  ...s,
                  status: "completed" as const,
                  endTime: new Date().toISOString(),
                  outputData: {
                    input:
                      i === 0
                        ? payload
                        : { previousStep: executionPath[i - 1] },
                    output: {
                      success: true,
                      message: `${node.data?.label || "Node"} executed successfully`,
                      data: node.type === "trigger" ? payload : {},
                    },
                  },
                }
              : s,
          ),
        );
      }

      setIsTestMode(false);
    },
    [nodes, edges, useStrictValidation, validateWorkflow],
  );

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Filter palette items
  const filteredPalette = Object.entries(nodePalette).reduce(
    (acc, [category, items]) => {
      const filtered = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as Record<string, NodePaletteItem[]>,
  );

  // Handle node configuration save
  const handleNodeConfigSave = useCallback(
    (nodeId: string, config: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                config,
                // Update the label from config if it exists
                label: config.label || node.data.label,
                isValid: true,
              },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  // Prevent minimap navigation clicks
  useEffect(() => {
    if (!useMinimapSafety) return;

    const handleMinimapClick = (event: Event) => {
      // Find if the click happened within a minimap element
      const target = event.target as Element;
      const minimap = target.closest(".react-flow__minimap");

      if (minimap) {
        console.log("Minimap click prevented - safety feature enabled");
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    // Add event listeners to prevent navigation
    if (typeof document !== "undefined") {
      document.addEventListener("click", handleMinimapClick, true);
      document.addEventListener("mousedown", handleMinimapClick, true);
      document.addEventListener("mouseup", handleMinimapClick, true);

      return () => {
        document.removeEventListener("click", handleMinimapClick, true);
        document.removeEventListener("mousedown", handleMinimapClick, true);
        document.removeEventListener("mouseup", handleMinimapClick, true);
      };
    }
  }, [useMinimapSafety]);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Sidebar - Node Palette */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold mb-3">Workflow Nodes</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.entries(filteredPalette).map(([category, items]) => (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center gap-2 w-full text-left mb-2 hover:text-orange-500 transition-colors"
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${
                    expandedCategories.has(category) ? "rotate-90" : ""
                  }`}
                />
                <span className="text-sm font-medium capitalize">
                  {category}
                </span>
                <span className="text-xs text-gray-400">({items.length})</span>
              </button>

              {expandedCategories.has(category) && (
                <div className="space-y-2 ml-6">
                  {items.map((item, index) => (
                    <PaletteItem key={`${category}-${index}`} item={item} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-white transition-colors"
                title="Back to Automations"
              >
                ← Back
              </button>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                onBlur={() => {
                  if (workflowState && workflowName !== workflowState.name) {
                    setWorkflow({ ...workflowState, name: workflowName });
                  }
                }}
                className="text-xl font-bold bg-transparent border-b border-transparent hover:border-gray-600 focus:border-orange-500 focus:outline-none px-1 py-0.5 transition-colors"
                placeholder="Enter workflow name..."
              />
              {workflowState?.description && (
                <span className="text-sm text-gray-400">
                  - {workflowState.description}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Save Message */}
            {saveMessage && (
              <div
                className={`px-3 py-1 rounded-lg text-sm ${
                  saveMessage.type === "success"
                    ? "bg-green-600/20 text-green-400"
                    : "bg-red-600/20 text-red-400"
                }`}
              >
                {saveMessage.text}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors flex items-center gap-2 ${
                isSaving ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </button>

            <button
              onClick={() => {
                const newTestMode = !isTestMode;
                setIsTestMode(newTestMode);
                setShowTestPanel(newTestMode);
                if (!newTestMode) {
                  setExecutionSteps([]);
                }
              }}
              className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                isTestMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg ring-2 ring-blue-400 ring-opacity-50"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              <Bug className="h-4 w-4" />
              <span className={isTestMode ? "font-semibold" : ""}>
                {isTestMode ? "Test Mode (Active)" : "Test Mode"}
              </span>
            </button>

            <button
              onClick={handleToggleActive}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                workflowState?.status === "active"
                  ? "bg-green-600 hover:bg-green-700 text-white shadow-lg ring-2 ring-green-400 ring-opacity-50"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {workflowState?.status === "active" ? (
                <>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="font-semibold">Active</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Inactive</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div
          className={`flex-1 relative ${isOver ? "ring-2 ring-orange-500 ring-opacity-50" : ""}`}
          ref={combinedRef}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onInit={setReactFlowInstance}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            panOnDrag={useCanvasImproved ? true : true}
            zoomOnScroll={useCanvasImproved ? true : true}
            zoomOnPinch={useCanvasImproved ? true : true}
            zoomOnDoubleClick={useCanvasImproved ? true : true}
            panOnScroll={useCanvasImproved ? false : false}
            preventScrolling={useCanvasImproved ? true : false}
            selectNodesOnDrag={useCanvasImproved ? false : true}
            connectionLineStyle={{ stroke: "#f97316", strokeWidth: 2 }}
            defaultEdgeOptions={{
              type: "smoothstep",
              animated: true,
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
            }}
            style={{
              ...(useCanvasImproved && {
                touchAction: "none", // Prevent scroll-bleed on touch devices
              }),
            }}
          >
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case "trigger":
                    return "#f97316";
                  case "action":
                    return "#3b82f6";
                  case "condition":
                    return "#8b5cf6";
                  case "wait":
                    return "#10b981";
                  default:
                    return "#6b7280";
                }
              }}
              className={`bg-gray-800 ${useMinimapSafety ? "pointer-events-none" : ""}`}
              maskColor="transparent"
              pannable={useMinimapSafety ? false : true}
              zoomable={useMinimapSafety ? false : true}
            />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

            {/* Node Toolbar */}
            {selectedNode && (
              <NodeToolbar nodeId={selectedNode} isVisible={true}>
                <div className="bg-gray-800 rounded-lg shadow-lg p-2 flex items-center gap-2">
                  <button
                    className="p-1 hover:bg-gray-700 rounded"
                    onClick={() => {
                      /* TODO: Duplicate node */
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 hover:bg-gray-700 rounded"
                    onClick={() => {
                      const node = nodes.find((n) => n.id === selectedNode);
                      if (node) {
                        setConfigNode(node as WorkflowNode);
                        setShowConfigPanel(true);
                      }
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 hover:bg-gray-700 rounded text-red-500"
                    onClick={deleteSelected}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </NodeToolbar>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* Right Sidebar - Test Panel */}
      {showTestPanel && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-bold">Test Mode</h3>
            <button
              onClick={() => setShowTestPanel(false)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Test Payload Editor */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Test Payload
              </label>
              <textarea
                id="test-payload"
                className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm font-mono"
                placeholder='{"lead": {"name": "John Doe", "email": "john@example.com", "phone": "+447901234567"}}'
                defaultValue={JSON.stringify(
                  {
                    lead: {
                      name: "Test Lead",
                      email: "test@example.com",
                      phone: "+447901234567",
                    },
                  },
                  null,
                  2,
                )}
              />
              <button
                onClick={() => {
                  const textarea =
                    typeof document !== "undefined"
                      ? (document.getElementById(
                          "test-payload",
                        ) as HTMLTextAreaElement)
                      : null;
                  if (!textarea) return;
                  try {
                    const payload = JSON.parse(textarea.value);
                    // Run test with payload
                    runTestExecution(payload);
                  } catch (error) {
                    alert("Invalid JSON payload");
                  }
                }}
                className="mt-2 w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="h-4 w-4" />
                Run Test
              </button>
            </div>

            {/* Execution Steps */}
            {executionSteps.length > 0 && (
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Execution Log</h4>
                  <button
                    onClick={() => setExecutionSteps([])}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-3">
                  {executionSteps.map((step, index) => {
                    const node = nodes.find((n) => n.id === step.nodeId);
                    return (
                      <div
                        key={step.id}
                        className={`p-3 rounded-lg border transition-all ${
                          step.status === "completed"
                            ? "bg-green-900/20 border-green-700"
                            : step.status === "failed"
                              ? "bg-red-900/20 border-red-700"
                              : step.status === "running"
                                ? "bg-blue-900/20 border-blue-700 animate-pulse"
                                : "bg-gray-700 border-gray-600"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            Step {index + 1}: {node?.data?.label || step.nodeId}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              step.status === "completed"
                                ? "bg-green-700 text-green-100"
                                : step.status === "failed"
                                  ? "bg-red-700 text-red-100"
                                  : step.status === "running"
                                    ? "bg-blue-700 text-blue-100"
                                    : "bg-gray-600 text-gray-200"
                            }`}
                          >
                            {step.status}
                          </span>
                        </div>
                        {step.error && (
                          <p className="text-xs text-red-400 mt-2">
                            {step.error}
                          </p>
                        )}
                        {step.outputData && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                              Output Data
                            </summary>
                            <pre className="text-xs bg-gray-900 p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(step.outputData, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Node Configuration Panel */}
      {showConfigPanel && configNode && (
        <ConfigPanelErrorBoundary
          onReset={() => {
            setShowConfigPanel(false);
            setConfigNode(null);
            setTimeout(() => {
              setShowConfigPanel(true);
              setConfigNode(configNode);
            }, 100);
          }}
        >
          <DynamicConfigPanelEnhanced
            node={configNode}
            organizationId={workflow?.organizationId || ""}
            onClose={() => {
              setShowConfigPanel(false);
              setConfigNode(null);
            }}
            onSave={(nodeId, config) => {
              handleNodeConfigSave(nodeId, config);
              setShowConfigPanel(false);
              setConfigNode(null);
            }}
          />
        </ConfigPanelErrorBoundary>
      )}
    </div>
  );
}

export default function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <ReactFlowProvider>
        <WorkflowBuilderInner {...props} />
      </ReactFlowProvider>
    </DndProvider>
  );
}
