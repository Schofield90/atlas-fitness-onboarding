import {
  Bot,
  Edit,
  Trash2,
  MessageSquare,
  CheckCircle,
  ClipboardList,
  Power,
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description: string;
  role: string;
  avatar_url?: string;
  enabled: boolean;
  is_default: boolean;
  conversations_count?: number;
  tasks_count?: number;
}

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onToggleEnabled: (agent: Agent) => void;
  onChatNow: (agent: Agent) => void;
}

export function AgentCard({
  agent,
  onEdit,
  onDelete,
  onToggleEnabled,
  onChatNow,
}: AgentCardProps) {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "customer_support":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "financial":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "social_media":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "customer_support":
        return "Customer Support";
      case "financial":
        return "Financial";
      case "social_media":
        return "Social Media";
      default:
        return "Custom";
    }
  };

  const truncateDescription = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {agent.avatar_url ? (
            <img
              src={agent.avatar_url}
              alt={agent.name}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Bot className="h-6 w-6 text-orange-400" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold">{agent.name}</h3>
            <span
              className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getRoleBadgeColor(
                agent.role,
              )}`}
            >
              {getRoleLabel(agent.role)}
            </span>
          </div>
        </div>

        {/* Status Toggle */}
        <button
          onClick={() => onToggleEnabled(agent)}
          className={`p-2 rounded-lg transition-colors ${
            agent.enabled
              ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
          title={agent.enabled ? "Enabled" : "Disabled"}
        >
          <Power className="h-4 w-4" />
        </button>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-sm mb-4 min-h-[40px]">
        {truncateDescription(agent.description)}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-300">
            {agent.conversations_count || 0}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-300">
            {agent.tasks_count || 0}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChatNow(agent)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <MessageSquare className="h-4 w-4" />
          Chat Now
        </button>

        {!agent.is_default && (
          <>
            <button
              onClick={() => onEdit(agent)}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              title="Edit agent"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(agent)}
              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              title="Delete agent"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}

        {agent.is_default && (
          <div className="px-3 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/20">
            Default
          </div>
        )}
      </div>
    </div>
  );
}
