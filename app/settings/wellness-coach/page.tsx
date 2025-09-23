"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  Brain,
  Settings,
  MessageCircle,
  Target,
  Users,
  Save,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CoachPersonality {
  id?: string;
  name: string;
  description: string;
  personalityTraits: {
    empathy: "low" | "moderate" | "high";
    motivation: "low" | "moderate" | "high";
    structure: "low" | "moderate" | "high";
    humor: "none" | "occasional" | "frequent";
  };
  communicationStyle: {
    tone: "formal" | "casual" | "friendly" | "professional" | "motivational";
    formality: "very_formal" | "formal" | "casual" | "very_casual";
    encouragement: "minimal" | "moderate" | "frequent";
    emoji_usage: "never" | "rarely" | "sometimes" | "often";
  };
  focusAreas: string[];
  customPrompts: {
    greeting?: string;
    questionStyle?: string;
    encouragement?: string;
    planPresentation?: string;
  };
  questionStyles: {
    approach: "direct" | "conversational" | "exploratory";
    depth: "surface" | "moderate" | "deep";
    pace: "quick" | "moderate" | "thorough";
  };
  responsePatterns: {
    lengthPreference: "concise" | "moderate" | "detailed";
    exampleUsage: "minimal" | "moderate" | "extensive";
    technicalLevel: "simple" | "moderate" | "advanced";
  };
  isActive: boolean;
}

interface QuestionTemplate {
  id?: string;
  category: string;
  subcategory?: string;
  questionText: string;
  questionType: "open_ended" | "multiple_choice" | "scale" | "yes_no";
  options?:
    | string[]
    | { min: number; max: number; labels?: Record<string, string> };
  followUpConditions?: Record<string, string>;
  contextRequirements?: Record<string, any>;
  priority: number;
  isActive: boolean;
}

interface PlanTemplate {
  id?: string;
  name: string;
  description: string;
  templateType: string;
  templateData: any;
  targetDemographics: {
    ageRange?: string;
    fitnessLevel?: string[];
    goals?: string[];
  };
  isActive: boolean;
}

export default function WellnessCoachSettings() {
  const [user, setUser] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "personality" | "questions" | "templates"
  >("personality");
  const [personalities, setPersonalities] = useState<CoachPersonality[]>([]);
  const [selectedPersonality, setSelectedPersonality] =
    useState<CoachPersonality | null>(null);
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);

        // Get organization from memberships
        const { data: membership } = await supabase
          .from("memberships")
          .select("organization_id")
          .eq("user_id", authUser.id)
          .single();

        if (membership) {
          setOrganizationId(membership.organization_id);
        }
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadSettings();
    }
  }, [organizationId]);

  const loadSettings = async () => {
    // Load coach personalities
    const { data: personalityData } = await supabase
      .from("coach_personalities")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (personalityData) {
      const formatted = personalityData.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        personalityTraits: p.personality_traits || {},
        communicationStyle: p.communication_style || {},
        focusAreas: p.focus_areas || [],
        customPrompts: p.custom_prompts || {},
        questionStyles: p.question_styles || {},
        responsePatterns: p.response_patterns || {},
        isActive: p.is_active,
      }));
      setPersonalities(formatted);

      // Set the active personality as selected
      const active = formatted.find((p) => p.isActive);
      if (active) setSelectedPersonality(active);
    }

    // Load custom questions
    const { data: questionData } = await supabase
      .from("wellness_question_templates")
      .select("*")
      .eq("organization_id", organizationId)
      .order("priority", { ascending: false });

    if (questionData) {
      setQuestions(
        questionData.map((q) => ({
          id: q.id,
          category: q.category,
          subcategory: q.subcategory,
          questionText: q.question_text,
          questionType: q.question_type,
          options: q.options,
          followUpConditions: q.follow_up_conditions,
          contextRequirements: q.context_requirements,
          priority: q.priority,
          isActive: q.is_active,
        })),
      );
    }

    // Load plan templates
    const { data: templateData } = await supabase
      .from("wellness_plan_templates")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (templateData) {
      setTemplates(
        templateData.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          templateType: t.template_type,
          templateData: t.template_data,
          targetDemographics: t.target_demographics || {},
          isActive: t.is_active,
        })),
      );
    }
  };

  const savePersonality = async () => {
    if (!selectedPersonality || !organizationId) return;

    setIsSaving(true);

    try {
      const data = {
        organization_id: organizationId,
        name: selectedPersonality.name,
        description: selectedPersonality.description,
        personality_traits: selectedPersonality.personalityTraits,
        communication_style: selectedPersonality.communicationStyle,
        focus_areas: selectedPersonality.focusAreas,
        custom_prompts: selectedPersonality.customPrompts,
        question_styles: selectedPersonality.questionStyles,
        response_patterns: selectedPersonality.responsePatterns,
        is_active: selectedPersonality.isActive,
      };

      if (selectedPersonality.id) {
        // Update existing
        await supabase
          .from("coach_personalities")
          .update(data)
          .eq("id", selectedPersonality.id);
      } else {
        // Create new
        const { data: newPersonality } = await supabase
          .from("coach_personalities")
          .insert(data)
          .select()
          .single();

        if (newPersonality) {
          setSelectedPersonality({
            ...selectedPersonality,
            id: newPersonality.id,
          });
        }
      }

      // If this personality is set as active, deactivate others
      if (selectedPersonality.isActive) {
        await supabase
          .from("coach_personalities")
          .update({ is_active: false })
          .eq("organization_id", organizationId)
          .neq("id", selectedPersonality.id);
      }

      await loadSettings();
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving personality:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const createNewPersonality = () => {
    const newPersonality: CoachPersonality = {
      name: "New Coach Personality",
      description: "",
      personalityTraits: {
        empathy: "moderate",
        motivation: "moderate",
        structure: "moderate",
        humor: "occasional",
      },
      communicationStyle: {
        tone: "friendly",
        formality: "casual",
        encouragement: "moderate",
        emoji_usage: "sometimes",
      },
      focusAreas: ["nutrition", "fitness", "wellness"],
      customPrompts: {},
      questionStyles: {
        approach: "conversational",
        depth: "moderate",
        pace: "moderate",
      },
      responsePatterns: {
        lengthPreference: "moderate",
        exampleUsage: "moderate",
        technicalLevel: "moderate",
      },
      isActive: false,
    };

    setSelectedPersonality(newPersonality);
    setIsEditing(true);
  };

  const addCustomQuestion = () => {
    const newQuestion: QuestionTemplate = {
      category: "general",
      questionText: "",
      questionType: "open_ended",
      priority: 50,
      isActive: true,
    };

    setQuestions([newQuestion, ...questions]);
  };

  const saveQuestion = async (question: QuestionTemplate, index: number) => {
    if (!organizationId) return;

    const data = {
      organization_id: organizationId,
      category: question.category,
      subcategory: question.subcategory,
      question_text: question.questionText,
      question_type: question.questionType,
      options: question.options,
      follow_up_conditions: question.followUpConditions,
      context_requirements: question.contextRequirements,
      priority: question.priority,
      is_active: question.isActive,
    };

    if (question.id) {
      await supabase
        .from("wellness_question_templates")
        .update(data)
        .eq("id", question.id);
    } else {
      await supabase.from("wellness_question_templates").insert(data);
    }

    await loadSettings();
  };

  const deleteQuestion = async (id: string) => {
    if (!id) return;

    await supabase.from("wellness_question_templates").delete().eq("id", id);

    await loadSettings();
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderPersonalityTab = () => (
    <div className="space-y-6">
      {/* Personality Selector */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Coach Personalities</h3>
          <button
            onClick={createNewPersonality}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            New Personality
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personalities.map((personality) => (
            <div
              key={personality.id}
              onClick={() => {
                setSelectedPersonality(personality);
                setIsEditing(false);
              }}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedPersonality?.id === personality.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">{personality.name}</h4>
                {personality.isActive && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{personality.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Personality Editor */}
      {selectedPersonality && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              {isEditing ? "Edit" : "View"} Personality
            </h3>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={savePersonality}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={selectedPersonality.name}
                onChange={(e) =>
                  setSelectedPersonality({
                    ...selectedPersonality,
                    name: e.target.value,
                  })
                }
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={selectedPersonality.description}
                onChange={(e) =>
                  setSelectedPersonality({
                    ...selectedPersonality,
                    description: e.target.value,
                  })
                }
                disabled={!isEditing}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedPersonality.isActive}
                  onChange={(e) =>
                    setSelectedPersonality({
                      ...selectedPersonality,
                      isActive: e.target.checked,
                    })
                  }
                  disabled={!isEditing}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium">
                  Set as active personality
                </span>
              </label>
            </div>
          </div>

          {/* Personality Traits */}
          <div className="border-t pt-6">
            <button
              onClick={() => toggleSection("traits")}
              className="flex items-center justify-between w-full mb-4"
            >
              <h4 className="font-semibold">Personality Traits</h4>
              {expandedSections.traits ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedSections.traits && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empathy Level
                  </label>
                  <select
                    value={selectedPersonality.personalityTraits.empathy}
                    onChange={(e) =>
                      setSelectedPersonality({
                        ...selectedPersonality,
                        personalityTraits: {
                          ...selectedPersonality.personalityTraits,
                          empathy: e.target.value as any,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                  >
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivation Style
                  </label>
                  <select
                    value={selectedPersonality.personalityTraits.motivation}
                    onChange={(e) =>
                      setSelectedPersonality({
                        ...selectedPersonality,
                        personalityTraits: {
                          ...selectedPersonality.personalityTraits,
                          motivation: e.target.value as any,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                  >
                    <option value="low">Gentle</option>
                    <option value="moderate">Balanced</option>
                    <option value="high">Intense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Structure Level
                  </label>
                  <select
                    value={selectedPersonality.personalityTraits.structure}
                    onChange={(e) =>
                      setSelectedPersonality({
                        ...selectedPersonality,
                        personalityTraits: {
                          ...selectedPersonality.personalityTraits,
                          structure: e.target.value as any,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                  >
                    <option value="low">Flexible</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">Highly Structured</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Humor Usage
                  </label>
                  <select
                    value={selectedPersonality.personalityTraits.humor}
                    onChange={(e) =>
                      setSelectedPersonality({
                        ...selectedPersonality,
                        personalityTraits: {
                          ...selectedPersonality.personalityTraits,
                          humor: e.target.value as any,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                  >
                    <option value="none">None</option>
                    <option value="occasional">Occasional</option>
                    <option value="frequent">Frequent</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Communication Style */}
          <div className="border-t pt-6 mt-6">
            <button
              onClick={() => toggleSection("communication")}
              className="flex items-center justify-between w-full mb-4"
            >
              <h4 className="font-semibold">Communication Style</h4>
              {expandedSections.communication ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedSections.communication && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tone
                  </label>
                  <select
                    value={selectedPersonality.communicationStyle.tone}
                    onChange={(e) =>
                      setSelectedPersonality({
                        ...selectedPersonality,
                        communicationStyle: {
                          ...selectedPersonality.communicationStyle,
                          tone: e.target.value as any,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                  >
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="motivational">Motivational</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formality Level
                  </label>
                  <select
                    value={selectedPersonality.communicationStyle.formality}
                    onChange={(e) =>
                      setSelectedPersonality({
                        ...selectedPersonality,
                        communicationStyle: {
                          ...selectedPersonality.communicationStyle,
                          formality: e.target.value as any,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                  >
                    <option value="very_formal">Very Formal</option>
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                    <option value="very_casual">Very Casual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Encouragement Frequency
                  </label>
                  <select
                    value={selectedPersonality.communicationStyle.encouragement}
                    onChange={(e) =>
                      setSelectedPersonality({
                        ...selectedPersonality,
                        communicationStyle: {
                          ...selectedPersonality.communicationStyle,
                          encouragement: e.target.value as any,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                  >
                    <option value="minimal">Minimal</option>
                    <option value="moderate">Moderate</option>
                    <option value="frequent">Frequent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emoji Usage
                  </label>
                  <select
                    value={selectedPersonality.communicationStyle.emoji_usage}
                    onChange={(e) =>
                      setSelectedPersonality({
                        ...selectedPersonality,
                        communicationStyle: {
                          ...selectedPersonality.communicationStyle,
                          emoji_usage: e.target.value as any,
                        },
                      })
                    }
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                  >
                    <option value="never">Never</option>
                    <option value="rarely">Rarely</option>
                    <option value="sometimes">Sometimes</option>
                    <option value="often">Often</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Focus Areas */}
          <div className="border-t pt-6 mt-6">
            <button
              onClick={() => toggleSection("focus")}
              className="flex items-center justify-between w-full mb-4"
            >
              <h4 className="font-semibold">Focus Areas</h4>
              {expandedSections.focus ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedSections.focus && (
              <div className="space-y-2">
                {[
                  "nutrition",
                  "fitness",
                  "sleep",
                  "stress",
                  "mental_health",
                  "habits",
                  "recovery",
                ].map((area) => (
                  <label key={area} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedPersonality.focusAreas.includes(area)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPersonality({
                            ...selectedPersonality,
                            focusAreas: [
                              ...selectedPersonality.focusAreas,
                              area,
                            ],
                          });
                        } else {
                          setSelectedPersonality({
                            ...selectedPersonality,
                            focusAreas: selectedPersonality.focusAreas.filter(
                              (a) => a !== area,
                            ),
                          });
                        }
                      }}
                      disabled={!isEditing}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm capitalize">
                      {area.replace("_", " ")}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Custom Prompts */}
          <div className="border-t pt-6 mt-6">
            <button
              onClick={() => toggleSection("prompts")}
              className="flex items-center justify-between w-full mb-4"
            >
              <h4 className="font-semibold">Custom Prompts</h4>
              {expandedSections.prompts ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedSections.prompts && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Greeting Message
                  </label>
                  <textarea
                    value={selectedPersonality.customPrompts.greeting || ""}
                    onChange={(e) =>
                      setSelectedPersonality({
                        ...selectedPersonality,
                        customPrompts: {
                          ...selectedPersonality.customPrompts,
                          greeting: e.target.value,
                        },
                      })
                    }
                    disabled={!isEditing}
                    rows={2}
                    placeholder="Custom greeting for conversations..."
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Style Guide
                  </label>
                  <textarea
                    value={
                      selectedPersonality.customPrompts.questionStyle || ""
                    }
                    onChange={(e) =>
                      setSelectedPersonality({
                        ...selectedPersonality,
                        customPrompts: {
                          ...selectedPersonality.customPrompts,
                          questionStyle: e.target.value,
                        },
                      })
                    }
                    disabled={!isEditing}
                    rows={2}
                    placeholder="How should questions be phrased..."
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Encouragement Phrases
                  </label>
                  <textarea
                    value={
                      selectedPersonality.customPrompts.encouragement || ""
                    }
                    onChange={(e) =>
                      setSelectedPersonality({
                        ...selectedPersonality,
                        customPrompts: {
                          ...selectedPersonality.customPrompts,
                          encouragement: e.target.value,
                        },
                      })
                    }
                    disabled={!isEditing}
                    rows={2}
                    placeholder="Motivational phrases to use..."
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderQuestionsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Custom Questions</h3>
          <button
            onClick={addCustomQuestion}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id || index} className="border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={question.category}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[index].category = e.target.value;
                      setQuestions(updated);
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="general">General</option>
                    <option value="nutrition">Nutrition</option>
                    <option value="fitness">Fitness</option>
                    <option value="sleep">Sleep</option>
                    <option value="stress">Stress</option>
                    <option value="goals">Goals</option>
                    <option value="constraints">Constraints</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={question.questionType}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[index].questionType = e.target.value as any;
                      setQuestions(updated);
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="open_ended">Open Ended</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="scale">Scale</option>
                    <option value="yes_no">Yes/No</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text
                  </label>
                  <textarea
                    value={question.questionText}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[index].questionText = e.target.value;
                      setQuestions(updated);
                    }}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Enter your question..."
                  />
                </div>

                {question.questionType === "multiple_choice" && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Options (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={(question.options as string[])?.join(", ") || ""}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[index].options = e.target.value
                          .split(",")
                          .map((o) => o.trim());
                        setQuestions(updated);
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Option 1, Option 2, Option 3"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority (1-100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={question.priority}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[index].priority = parseInt(e.target.value);
                      setQuestions(updated);
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 flex-1">
                    <input
                      type="checkbox"
                      checked={question.isActive}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[index].isActive = e.target.checked;
                        setQuestions(updated);
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Active</span>
                  </label>

                  <button
                    onClick={() => saveQuestion(question, index)}
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <Save className="w-4 h-4" />
                  </button>

                  {question.id && (
                    <button
                      onClick={() => deleteQuestion(question.id!)}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Plan Templates</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">{template.name}</h4>
                {template.isActive && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {template.description}
              </p>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-1 text-sm border rounded hover:bg-gray-50">
                  Edit
                </button>
                <button className="flex-1 px-3 py-1 text-sm border rounded hover:bg-gray-50">
                  Preview
                </button>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No templates created yet. Create your first template to get
              started.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Brain className="w-8 h-8 text-blue-500" />
          Wellness Coach Settings
        </h1>
        <p className="text-gray-600 mt-2">
          Customize your AI wellness coach personality, questions, and plan
          templates
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("personality")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "personality"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Personality
          </div>
        </button>

        <button
          onClick={() => setActiveTab("questions")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "questions"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Questions
          </div>
        </button>

        <button
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "templates"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "personality" && renderPersonalityTab()}
      {activeTab === "questions" && renderQuestionsTab()}
      {activeTab === "templates" && renderTemplatesTab()}
    </div>
  );
}
