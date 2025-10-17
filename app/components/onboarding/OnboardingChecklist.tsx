"use client";

import { useState, useEffect } from "react";
import {
  X,
  ChevronRight,
  CheckCircle2,
  Circle,
  Minimize2,
  Maximize2,
  Plug,
  Upload,
  Bot,
  Calendar,
  Mail,
  MessageCircle,
  Phone,
  Users,
  CreditCard,
  ClipboardCheck,
  DollarSign,
  CalendarDays,
  Sparkles,
} from "lucide-react";

// Import step components
import GoogleCalendarStep from "./steps/GoogleCalendarStep";
import EmailStep from "./steps/EmailStep";
import FacebookStep from "./steps/FacebookStep";
import WhatsAppStep from "./steps/WhatsAppStep";
import TwilioStep from "./steps/TwilioStep";
import {
  GoTeamUpClientsStep,
  GoTeamUpMembershipsStep,
  GoTeamUpTimetableStep,
  GoTeamUpRevenueStep,
} from "./steps/GoTeamUpImportSteps";
import PaymentProvidersStep from "./steps/PaymentProvidersStep";
import { AIBotIntroStep, AIFirstBotStep } from "./steps/AIBotSteps";

// Icon mapping
const ICON_MAP: Record<string, any> = {
  Plug,
  Upload,
  Bot,
  Calendar,
  Mail,
  MessageCircle,
  Phone,
  Users,
  CreditCard,
  ClipboardCheck,
  DollarSign,
  CalendarDays,
  Sparkles,
};

interface OnboardingStatus {
  current_step: string | null;
  completed_steps: string[];
  skipped_steps: string[];
  is_complete: boolean;
  is_dismissed: boolean;
  progress: {
    completed: number;
    total: number;
    percentage: number;
    required_completed: number;
    required_total: number;
  };
  steps_by_category: Record<string, any[]>;
  categories: Record<string, any>;
}

export default function OnboardingChecklist() {
  const [isMinimized, setIsMinimized] = useState(false);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [openStep, setOpenStep] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();

    // Poll for updates every 15 seconds to auto-check completion
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/onboarding/status");
      const data = await res.json();

      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await fetch("/api/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });

      if (status) {
        setStatus({ ...status, is_dismissed: true });
      }
    } catch (error) {
      console.error("Error dismissing onboarding:", error);
    }
  };

  const handleStepClick = (stepId: string) => {
    setOpenStep(stepId);
  };

  const handleStepComplete = async (stepId: string) => {
    try {
      await fetch("/api/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step_id: stepId,
          action: "complete",
        }),
      });

      // Refresh status
      await fetchStatus();
      setOpenStep(null);
    } catch (error) {
      console.error("Error completing step:", error);
    }
  };

  const handleStepSkip = async (stepId: string) => {
    try {
      await fetch("/api/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step_id: stepId,
          action: "skip",
        }),
      });

      // Refresh status
      await fetchStatus();
      setOpenStep(null);
    } catch (error) {
      console.error("Error skipping step:", error);
    }
  };

  const handleStepClose = () => {
    setOpenStep(null);
  };

  // Don't show if loading, no status, dismissed, or complete
  if (
    loading ||
    !status ||
    status.is_dismissed ||
    status.is_complete ||
    status.progress.percentage === 100
  ) {
    return null;
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
        >
          <span className="font-semibold">
            Setup {status.progress.completed}/{status.progress.total}
          </span>
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-20 right-6 w-80 bg-gray-800 rounded-lg shadow-xl z-40 border border-gray-700 max-h-[calc(100vh-7rem)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="font-semibold text-white">Setup Checklist</h3>
          <p className="text-sm text-gray-400">
            {status.progress.completed}/{status.progress.total} completed
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-orange-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${status.progress.percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {status.progress.required_completed}/{status.progress.required_total}{" "}
          required steps completed
        </p>
      </div>

      {/* Steps List */}
      <div className="overflow-y-auto flex-1">
        {Object.entries(status.steps_by_category).map(
          ([categoryKey, steps]) => {
            const category = status.categories[categoryKey];
            if (!category || steps.length === 0) return null;

            const CategoryIcon = ICON_MAP[category.icon] || Plug;

            return (
              <div key={categoryKey}>
                {/* Category Header */}
                <div className="px-4 py-2 bg-gray-750 flex items-center gap-2">
                  <CategoryIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400 uppercase font-semibold">
                    {category.title}
                  </span>
                </div>

                {/* Category Steps */}
                {steps.map((step: any) => {
                  const StepIcon = ICON_MAP[step.icon || "Circle"] || Circle;

                  return (
                    <button
                      key={step.id}
                      onClick={() => handleStepClick(step.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-750 text-left border-b border-gray-700 transition-colors group"
                    >
                      {step.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : step.skipped ? (
                        <Circle className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      ) : status.current_step === step.id ? (
                        <div className="relative">
                          <Circle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                          <div className="absolute inset-0 w-5 h-5 rounded-full border-2 border-orange-500 animate-ping" />
                        </div>
                      ) : (
                        <Circle className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">
                            {step.title}
                          </p>
                          {!step.required && (
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              Optional
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {step.description}
                        </p>
                        {step.estimatedMinutes && !step.completed && (
                          <p className="text-xs text-gray-500 mt-1">
                            ~{step.estimatedMinutes} min
                          </p>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 flex-shrink-0 transition-colors" />
                    </button>
                  );
                })}
              </div>
            );
          },
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 flex-shrink-0">
        <button
          onClick={handleDismiss}
          className="w-full text-sm text-gray-400 hover:text-white transition-colors"
        >
          I'll finish this later
        </button>
      </div>

      {/* Step Modals */}
      {openStep === "google_calendar" && (
        <GoogleCalendarStep
          onComplete={() => handleStepComplete("google_calendar")}
          onSkip={() => handleStepSkip("google_calendar")}
          onClose={handleStepClose}
        />
      )}
      {openStep === "email_integration" && (
        <EmailStep
          onComplete={() => handleStepComplete("email_integration")}
          onSkip={() => handleStepSkip("email_integration")}
          onClose={handleStepClose}
        />
      )}
      {openStep === "facebook_ads" && (
        <FacebookStep
          onComplete={() => handleStepComplete("facebook_ads")}
          onSkip={() => handleStepSkip("facebook_ads")}
          onClose={handleStepClose}
        />
      )}
      {openStep === "whatsapp" && (
        <WhatsAppStep
          onComplete={() => handleStepComplete("whatsapp")}
          onSkip={() => handleStepSkip("whatsapp")}
          onClose={handleStepClose}
        />
      )}
      {openStep === "twilio" && (
        <TwilioStep
          onComplete={() => handleStepComplete("twilio")}
          onSkip={() => handleStepSkip("twilio")}
          onClose={handleStepClose}
        />
      )}
      {openStep === "goteamup_clients" && (
        <GoTeamUpClientsStep
          onComplete={() => handleStepComplete("goteamup_clients")}
          onSkip={() => handleStepSkip("goteamup_clients")}
          onClose={handleStepClose}
        />
      )}
      {openStep === "goteamup_memberships" && (
        <GoTeamUpMembershipsStep
          onComplete={() => handleStepComplete("goteamup_memberships")}
          onSkip={() => handleStepSkip("goteamup_memberships")}
          onClose={handleStepClose}
        />
      )}
      {openStep === "goteamup_timetable" && (
        <GoTeamUpTimetableStep
          onComplete={() => handleStepComplete("goteamup_timetable")}
          onSkip={() => handleStepSkip("goteamup_timetable")}
          onClose={handleStepClose}
        />
      )}
      {openStep === "goteamup_revenue" && (
        <GoTeamUpRevenueStep
          onComplete={() => handleStepComplete("goteamup_revenue")}
          onSkip={() => handleStepSkip("goteamup_revenue")}
          onClose={handleStepClose}
        />
      )}
      {openStep === "stripe_gocardless" && (
        <PaymentProvidersStep
          onComplete={() => handleStepComplete("stripe_gocardless")}
          onSkip={() => handleStepSkip("stripe_gocardless")}
          onClose={handleStepClose}
        />
      )}
      {openStep === "ai_bot_intro" && (
        <AIBotIntroStep
          onComplete={() => handleStepComplete("ai_bot_intro")}
          onSkip={() => handleStepSkip("ai_bot_intro")}
          onClose={handleStepClose}
        />
      )}
      {openStep === "ai_first_bot" && (
        <AIFirstBotStep
          onComplete={() => handleStepComplete("ai_first_bot")}
          onSkip={() => handleStepSkip("ai_first_bot")}
          onClose={handleStepClose}
        />
      )}
    </div>
  );
}
