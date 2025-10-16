"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChatBubbleBottomCenterTextIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

interface AIAgent {
  id: string;
  name: string;
  description: string;
  organizationName: string;
  model: string;
  enabled: boolean;
  allowedTools: string[];
}

function TestAgentSelectionContent() {
  const router = useRouter();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/saas-admin/lead-bots/agents");
      if (!response.ok) throw new Error("Failed to fetch agents");

      const data = await response.json();
      setAgents(data.agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAgent = (agentId: string) => {
    router.push(`/saas-admin/lead-bots/test/${agentId}`);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            AI Agent Testing
          </h1>
          <p className="text-gray-400">
            Select an agent to start a test conversation and provide feedback
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <p className="mt-4 text-gray-400">Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="bg-gray-800 rounded-lg shadow-lg p-12 text-center border border-gray-700">
            <ChatBubbleBottomCenterTextIcon className="mx-auto h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No agents found
            </h3>
            <p className="text-gray-400">
              Create an agent in the Agent Config section to start testing
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer border border-gray-700 hover:border-gray-600"
                onClick={() => handleTestAgent(agent.id)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <SparklesIcon className="h-8 w-8 text-orange-500 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {agent.name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {agent.organizationName}
                        </p>
                      </div>
                    </div>
                    {agent.enabled ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-500" />
                    )}
                  </div>

                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {agent.description || "No description provided"}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>Model: {agent.model}</span>
                    <span>
                      {agent.allowedTools?.length || 0} tool
                      {agent.allowedTools?.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <button
                    className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestAgent(agent.id);
                    }}
                  >
                    Start Testing
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TestAgentSelectionPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <TestAgentSelectionContent />
    </Suspense>
  );
}
