"use client";

import { Bot, Sparkles, ExternalLink, Check, X } from "lucide-react";

interface StepProps {
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

// AI Bot Introduction Step
export function AIBotIntroStep({ onComplete, onSkip, onClose }: StepProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl max-w-3xl w-full shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Meet Your AI Assistant
              </h2>
              <p className="text-sm text-gray-400">
                Automate lead follow-up and member engagement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Hero */}
          <div className="bg-gradient-to-br from-orange-500/10 to-pink-500/10 border border-orange-500/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Sparkles className="w-8 h-8 text-orange-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  AI-Powered Lead Engagement
                </h3>
                <p className="text-gray-300">
                  Atlas Fitness AI Agents can automatically respond to leads,
                  answer questions, book classes, and nurture prospects 24/7 -
                  while you focus on coaching.
                </p>
              </div>
            </div>
          </div>

          {/* What AI Bots Can Do */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">What Can AI Bots Do?</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                {
                  emoji: "💬",
                  title: "Auto-Reply to Leads",
                  desc: "Respond to Facebook Lead Ads instantly",
                },
                {
                  emoji: "📅",
                  title: "Book Trial Classes",
                  desc: "Schedule free trials without staff involvement",
                },
                {
                  emoji: "❓",
                  title: "Answer FAQs",
                  desc: "Handle common questions about pricing, hours, etc.",
                },
                {
                  emoji: "🔔",
                  title: "Send Reminders",
                  desc: "Automated class reminders via SMS/WhatsApp",
                },
                {
                  emoji: "📊",
                  title: "Qualify Leads",
                  desc: "Ask qualifying questions and score leads",
                },
                {
                  emoji: "🎯",
                  title: "Nurture Prospects",
                  desc: "Follow up with warm leads automatically",
                },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="bg-gray-900 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{feature.emoji}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {feature.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3">How It Works:</h4>
            <ol className="space-y-2 text-sm text-gray-300">
              {[
                "Create an AI Agent with a specific goal (e.g., 'Book Trial Classes')",
                "Define triggers (e.g., 'New Facebook Lead Received')",
                "Set up actions (e.g., 'Send WhatsApp message', 'Create booking')",
                "AI handles everything automatically - no coding required!",
              ].map((step, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="font-bold text-orange-500">{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Response Time", value: "<30 sec" },
              { label: "Conversion Rate", value: "+40%" },
              { label: "Time Saved", value: "15 hrs/wk" },
            ].map((stat, idx) => (
              <div key={idx} className="bg-gray-900 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-500">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={onComplete}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Got It! Next Step
          </button>
        </div>
      </div>
    </div>
  );
}

// Create First AI Bot Step
export function AIFirstBotStep({ onComplete, onSkip, onClose }: StepProps) {
  const handleNavigate = () => {
    window.open("/ai-agents", "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Create Your First AI Agent
              </h2>
              <p className="text-sm text-gray-400">
                Let's build an automation together!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* CTA Banner */}
          <div className="bg-gradient-to-br from-orange-500/10 to-pink-500/10 border border-orange-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Bot className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-400 font-semibold">
                  Ready to Automate?
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  Click "Create AI Agent" below to build your first automation.
                  We'll guide you through every step!
                </p>
              </div>
            </div>
          </div>

          {/* Popular Templates */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">
              Popular Agent Templates:
            </h3>
            <div className="space-y-2">
              {[
                {
                  name: "Facebook Lead Responder",
                  desc: "Auto-reply to new leads from Facebook Ads within 30 seconds",
                  difficulty: "Easy",
                },
                {
                  name: "Trial Class Booker",
                  desc: "Let prospects book their first class via SMS conversation",
                  difficulty: "Easy",
                },
                {
                  name: "Payment Failed Follow-Up",
                  desc: "Automatically reach out when member payments fail",
                  difficulty: "Medium",
                },
                {
                  name: "Re-Engagement Campaign",
                  desc: "Win back inactive members with personalized outreach",
                  difficulty: "Medium",
                },
              ].map((template, idx) => (
                <div
                  key={idx}
                  className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-orange-500/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {template.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {template.desc}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                      {template.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3">Getting Started:</h4>
            <ol className="space-y-2 text-sm text-gray-300">
              {[
                'Click "Create AI Agent" below to open the agent builder',
                "Choose a template or start from scratch",
                "Configure the trigger (when should it run?)",
                "Set up actions (what should it do?)",
                "Test your agent with sample data",
                "Activate and let AI handle the rest!",
              ].map((step, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="font-bold text-orange-500">{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-gray-500 mt-3">
              ⏱️ Takes about 10 minutes • 🎓 Interactive tutorial included
            </p>
          </div>

          {/* Help */}
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-semibold text-sm">Need Help?</h4>
              <a
                href="/docs/ai-agents/getting-started"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 hover:text-orange-400 text-sm flex items-center gap-1"
              >
                View Guide
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-gray-500">
              Watch our video tutorial or follow the step-by-step guide with
              screenshots.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Skip for now
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleNavigate}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Bot className="w-4 h-4" />
              Create AI Agent
            </button>
            <button
              onClick={onComplete}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Mark Complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
