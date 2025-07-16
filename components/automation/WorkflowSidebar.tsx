'use client';

import { useState } from 'react';
import { 
  Zap, 
  Mail, 
  MessageSquare, 
  Phone, 
  Database, 
  Clock, 
  GitBranch, 
  Webhook,
  Bot,
  Search,
  Play,
  Hand,
  Bell
} from 'lucide-react';
import { AutomationAction } from '@/lib/types/automation';

interface WorkflowSidebarProps {
  onAddNode: (type: 'trigger' | 'action' | 'condition' | 'delay', actionId?: string) => void;
  actions: AutomationAction[];
}

export default function WorkflowSidebar({ onAddNode, actions }: WorkflowSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // const nodeCategories = [
  //   { id: 'triggers', name: 'Triggers', icon: Zap },
  //   { id: 'actions', name: 'Actions', icon: Play },
  //   { id: 'logic', name: 'Logic', icon: GitBranch },
  //   { id: 'utilities', name: 'Utilities', icon: Clock },
  // ];

  const triggerTypes = [
    {
      id: 'lead_created',
      name: 'New Lead',
      description: 'When a new lead is created',
      icon: <Zap className="h-4 w-4" />,
    },
    {
      id: 'lead_status_changed',
      name: 'Lead Status Change',
      description: 'When a lead status changes',
      icon: <Zap className="h-4 w-4" />,
    },
    {
      id: 'client_joined',
      name: 'Client Joined',
      description: 'When a new client joins',
      icon: <Zap className="h-4 w-4" />,
    },
    {
      id: 'membership_expired',
      name: 'Membership Expired',
      description: 'When a membership expires',
      icon: <Clock className="h-4 w-4" />,
    },
    {
      id: 'payment_failed',
      name: 'Payment Failed',
      description: 'When a payment fails',
      icon: <Zap className="h-4 w-4" />,
    },
    {
      id: 'date_based',
      name: 'Scheduled',
      description: 'At a specific date/time',
      icon: <Clock className="h-4 w-4" />,
    },
    {
      id: 'manual',
      name: 'Manual',
      description: 'Manually triggered',
      icon: <Hand className="h-4 w-4" />,
    },
  ];

  const logicNodes = [
    {
      type: 'condition',
      name: 'Condition',
      description: 'Branch based on conditions',
      icon: <GitBranch className="h-4 w-4" />,
    },
    {
      type: 'delay',
      name: 'Delay',
      description: 'Wait for a specified time',
      icon: <Clock className="h-4 w-4" />,
    },
  ];

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'whatsapp': return <Phone className="h-4 w-4" />;
      case 'webhook': return <Webhook className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'ai_task': return <Bot className="h-4 w-4" />;
      case 'notification': return <Bell className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const filteredActions = actions.filter(action => {
    const matchesSearch = action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || action.category?.toLowerCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const actionCategories = Array.from(new Set(actions.map(action => action.category).filter(Boolean)));

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Workflow Components</h2>
        <p className="text-sm text-gray-500">Drag components to build your workflow</p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Triggers Section */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Triggers
          </h3>
          <div className="space-y-2">
            {triggerTypes.map((trigger) => (
              <button
                key={trigger.id}
                onClick={() => onAddNode('trigger')}
                className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    {trigger.icon}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{trigger.name}</p>
                    <p className="text-xs text-gray-500">{trigger.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions Section */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center">
              <Play className="h-4 w-4 mr-2" />
              Actions
            </h3>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All</option>
              {actionCategories.map(category => (
                <option key={category} value={category?.toLowerCase()}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            {filteredActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onAddNode('action', action.id)}
                className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(action.type)}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{action.name}</p>
                    <p className="text-xs text-gray-500">{action.description}</p>
                    <div className="flex items-center mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {action.category}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Logic Section */}
        <div className="p-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <GitBranch className="h-4 w-4 mr-2" />
            Logic & Flow
          </h3>
          <div className="space-y-2">
            {logicNodes.map((node) => (
              <button
                key={node.type}
                onClick={() => onAddNode(node.type as 'condition' | 'delay')}
                className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    {node.icon}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{node.name}</p>
                    <p className="text-xs text-gray-500">{node.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}