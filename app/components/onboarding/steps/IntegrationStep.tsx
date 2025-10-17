"use client";

import { LucideIcon, ExternalLink, Check, X } from "lucide-react";

interface IntegrationStepProps {
  title: string;
  description: string;
  icon: LucideIcon;
  benefits: string[];
  instructions: string[];
  settingsUrl: string;
  docsUrl?: string;
  estimatedMinutes?: number;
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function IntegrationStep({
  title,
  description,
  icon: Icon,
  benefits,
  instructions,
  settingsUrl,
  docsUrl,
  estimatedMinutes = 5,
  onComplete,
  onSkip,
  onClose,
}: IntegrationStepProps) {
  const handleNavigate = () => {
    // Open settings in new tab and close modal
    window.open(settingsUrl, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Icon className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="text-sm text-gray-400">{description}</p>
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
          {/* Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-400 font-semibold">Ready to connect?</p>
                <p className="text-sm text-gray-300 mt-1">
                  Click "Go to Settings" below to configure this integration.
                  We'll open it in a new tab so you can follow along.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">Why Connect?</h3>
            <div className="space-y-2">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-gray-300 text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3">Quick Setup:</h4>
            <ol className="space-y-2 text-sm text-gray-300">
              {instructions.map((instruction, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="font-bold text-blue-500">{idx + 1}.</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-gray-500 mt-3">
              ⏱️ Takes about {estimatedMinutes} minutes • 🔧 Easy configuration
            </p>
          </div>

          {/* Help Section */}
          {docsUrl && (
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold text-sm">Need Help?</h4>
                <a
                  href={docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 text-sm flex items-center gap-1"
                >
                  View Guide
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-gray-500">
                Check our step-by-step guide with screenshots if you need
                assistance.
              </p>
            </div>
          )}
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
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              Go to Settings
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
