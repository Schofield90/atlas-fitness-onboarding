// This file will be used server-side only
// Client components should call API endpoints that use this

export interface WellnessContext {
  clientId: string;
  organizationId: string;
  conversationHistory: Array<{
    question: string;
    answer: string;
    timestamp: string;
  }>;
  learnedPreferences: Record<string, any>;
  goals: Record<string, any>;
  constraints: Record<string, any>;
  lifestyleFactors: Record<string, any>;
  currentPhase: "assessment" | "planning" | "adjustment" | "check-in";
  recentLogs?: Array<any>;
  trainingSchedule?: Array<any>;
}

export interface DynamicQuestion {
  id: string;
  text: string;
  type: "open_ended" | "multiple_choice" | "scale" | "yes_no" | "multi_select";
  category: string;
  options?:
    | string[]
    | { min: number; max: number; labels?: Record<string, string> };
  followUpConditions?: Record<string, string>;
  contextRequirements?: Record<string, any>;
  priority: number;
}

export class WellnessQuestionGenerator {
  private context: WellnessContext;
  private supabase: any;
  private coachPersonality: any;

  constructor(context: WellnessContext) {
    this.context = context;
  }

  async initialize() {
    this.supabase = await createClient();

    // Load coach personality
    const { data: personality } = await this.supabase
      .from("coach_personalities")
      .select("*")
      .eq("organization_id", this.context.organizationId)
      .eq("is_active", true)
      .single();

    this.coachPersonality = personality || this.getDefaultPersonality();
  }

  private getDefaultPersonality() {
    return {
      personality_traits: { empathy: "high", motivation: "moderate" },
      communication_style: { tone: "friendly", formality: "casual" },
      question_styles: { approach: "conversational", depth: "gradual" },
    };
  }

  async generateNextQuestion(): Promise<DynamicQuestion | null> {
    // Analyze conversation history to understand what we already know
    const knownTopics = this.analyzeKnownTopics();
    const unansweredAreas = this.identifyGaps();
    const clientMood = this.assessClientEngagement();

    // Get relevant question templates
    const { data: templates } = await this.supabase
      .from("wellness_question_templates")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    // Filter and rank questions based on context
    const rankedQuestions = this.rankQuestions(templates || [], {
      knownTopics,
      unansweredAreas,
      clientMood,
      phase: this.context.currentPhase,
    });

    if (rankedQuestions.length === 0) {
      // Generate a custom question using AI
      return this.generateCustomQuestion();
    }

    // Select and personalize the top question
    const selectedTemplate = rankedQuestions[0];
    return this.personalizeQuestion(selectedTemplate);
  }

  private analyzeKnownTopics(): Set<string> {
    const topics = new Set<string>();

    // Analyze conversation history
    this.context.conversationHistory.forEach((exchange) => {
      // Extract topics from questions and answers
      if (exchange.question.toLowerCase().includes("diet"))
        topics.add("nutrition");
      if (exchange.question.toLowerCase().includes("sleep"))
        topics.add("sleep");
      if (exchange.question.toLowerCase().includes("stress"))
        topics.add("stress");
      if (exchange.question.toLowerCase().includes("exercise"))
        topics.add("fitness");
      // Add more sophisticated NLP here
    });

    // Check learned preferences
    Object.keys(this.context.learnedPreferences).forEach((key) => {
      topics.add(key.split("_")[0]); // Extract category from preference keys
    });

    return topics;
  }

  private identifyGaps(): string[] {
    const essentialTopics = this.getEssentialTopics();
    const knownTopics = this.analyzeKnownTopics();

    const gaps = essentialTopics.filter((topic) => !knownTopics.has(topic));

    // Prioritize based on client goals
    if (this.context.goals) {
      gaps.sort((a, b) => {
        const aRelevance = this.topicRelevanceToGoals(a);
        const bRelevance = this.topicRelevanceToGoals(b);
        return bRelevance - aRelevance;
      });
    }

    return gaps;
  }

  private getEssentialTopics(): string[] {
    const baseTopics = ["nutrition", "fitness", "sleep", "stress", "hydration"];

    // Add phase-specific topics
    switch (this.context.currentPhase) {
      case "assessment":
        return [
          ...baseTopics,
          "goals",
          "constraints",
          "preferences",
          "schedule",
        ];
      case "planning":
        return [...baseTopics, "commitment", "resources", "support"];
      case "adjustment":
        return ["progress", "challenges", "satisfaction", ...baseTopics];
      case "check-in":
        return ["wellbeing", "adherence", "results", "feedback"];
      default:
        return baseTopics;
    }
  }

  private topicRelevanceToGoals(topic: string): number {
    if (!this.context.goals) return 0;

    const goalKeywords = JSON.stringify(this.context.goals).toLowerCase();
    const topicKeywords = this.getTopicKeywords(topic);

    let relevance = 0;
    topicKeywords.forEach((keyword) => {
      if (goalKeywords.includes(keyword)) relevance++;
    });

    return relevance;
  }

  private getTopicKeywords(topic: string): string[] {
    const keywordMap: Record<string, string[]> = {
      nutrition: [
        "diet",
        "food",
        "meal",
        "calorie",
        "protein",
        "carb",
        "fat",
        "eating",
      ],
      fitness: [
        "exercise",
        "workout",
        "training",
        "strength",
        "cardio",
        "muscle",
        "fit",
      ],
      sleep: [
        "rest",
        "recovery",
        "sleep",
        "tired",
        "energy",
        "fatigue",
        "insomnia",
      ],
      stress: [
        "stress",
        "anxiety",
        "relax",
        "mental",
        "pressure",
        "calm",
        "peace",
      ],
      hydration: ["water", "drink", "hydrate", "fluid", "thirst"],
    };

    return keywordMap[topic] || [topic];
  }

  private assessClientEngagement(): "high" | "medium" | "low" {
    if (this.context.conversationHistory.length < 3) return "medium";

    const recentResponses = this.context.conversationHistory.slice(-3);
    let totalLength = 0;
    let responseTime = 0;

    recentResponses.forEach((exchange) => {
      totalLength += exchange.answer.length;
      // Calculate response time if timestamps are available
    });

    const avgLength = totalLength / recentResponses.length;

    if (avgLength > 100) return "high";
    if (avgLength < 20) return "low";
    return "medium";
  }

  private rankQuestions(
    templates: any[],
    context: {
      knownTopics: Set<string>;
      unansweredAreas: string[];
      clientMood: "high" | "medium" | "low";
      phase: string;
    },
  ): any[] {
    return templates
      .map((template) => {
        let score = template.priority || 50;

        // Boost score for unanswered areas
        if (context.unansweredAreas.includes(template.category)) {
          score += 30;
        }

        // Reduce score for already covered topics
        if (context.knownTopics.has(template.category)) {
          score -= 20;
        }

        // Adjust based on client engagement
        if (
          context.clientMood === "low" &&
          template.question_type === "open_ended"
        ) {
          score -= 15; // Prefer simpler questions when engagement is low
        }

        // Check context requirements
        if (template.context_requirements) {
          const requirements = template.context_requirements;
          const meetsRequirements = this.checkContextRequirements(requirements);
          if (!meetsRequirements) score = 0;
        }

        return { ...template, score };
      })
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  private checkContextRequirements(requirements: Record<string, any>): boolean {
    // Check if all required context is present
    for (const [key, value] of Object.entries(requirements)) {
      if (
        key === "hasGoals" &&
        (!this.context.goals || Object.keys(this.context.goals).length === 0)
      ) {
        return false;
      }
      if (
        key === "hasConstraints" &&
        (!this.context.constraints ||
          Object.keys(this.context.constraints).length === 0)
      ) {
        return false;
      }
      if (
        key === "minConversationLength" &&
        this.context.conversationHistory.length < value
      ) {
        return false;
      }
      // Add more requirement checks as needed
    }
    return true;
  }

  private async personalizeQuestion(template: any): Promise<DynamicQuestion> {
    let questionText = template.question_text;

    // Personalize based on known information
    if (this.context.learnedPreferences.name) {
      questionText = questionText.replace(
        /\byou\b/gi,
        this.context.learnedPreferences.name,
      );
    }

    // Adjust tone based on coach personality
    if (this.coachPersonality.communication_style.tone === "motivational") {
      questionText = this.addMotivationalTone(questionText);
    }

    // Add context from previous answers
    if (this.shouldAddContext(template)) {
      questionText = this.addContextualIntro(questionText, template);
    }

    return {
      id: template.id,
      text: questionText,
      type: template.question_type,
      category: template.category,
      options: template.options,
      followUpConditions: template.follow_up_conditions,
      contextRequirements: template.context_requirements,
      priority: template.priority,
    };
  }

  private shouldAddContext(template: any): boolean {
    // Add context for follow-up questions or when building on previous answers
    return this.context.conversationHistory.length > 5 && Math.random() > 0.5; // Randomly add context to keep conversation natural
  }

  private addContextualIntro(question: string, template: any): string {
    const intros = [
      "Based on what you've shared, ",
      "Considering your goals, ",
      "To better personalize your plan, ",
      "Building on our conversation, ",
      "Now that I understand more about you, ",
    ];

    const randomIntro = intros[Math.floor(Math.random() * intros.length)];
    return randomIntro + question.charAt(0).toLowerCase() + question.slice(1);
  }

  private addMotivationalTone(question: string): string {
    const motivationalPhrases = [
      "Let's explore: ",
      "I'm excited to learn: ",
      "This will help us succeed: ",
      "You're doing great! ",
    ];

    if (Math.random() > 0.7) {
      const phrase =
        motivationalPhrases[
          Math.floor(Math.random() * motivationalPhrases.length)
        ];
      return phrase + question;
    }

    return question;
  }

  private async generateCustomQuestion(): Promise<DynamicQuestion> {
    // This would integrate with OpenAI/Anthropic to generate truly dynamic questions
    // For now, return a fallback question
    const fallbackQuestions = [
      {
        text: "What aspect of your wellness would you like to focus on today?",
        type: "open_ended" as const,
        category: "general",
      },
      {
        text: "How are you feeling about your progress so far?",
        type: "scale" as const,
        category: "progress",
        options: {
          min: 1,
          max: 10,
          labels: { "1": "Struggling", "10": "Excellent" },
        },
      },
      {
        text: "Is there anything specific you'd like to adjust in your plan?",
        type: "yes_no" as const,
        category: "adjustment",
        followUpConditions: { yes: "What would you like to change?" },
      },
    ];

    const selected =
      fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];

    return {
      id: `custom-${Date.now()}`,
      text: selected.text,
      type: selected.type,
      category: selected.category,
      options: selected.options,
      followUpConditions: selected.followUpConditions,
      priority: 50,
    };
  }

  async processAnswer(
    question: DynamicQuestion,
    answer: string,
  ): Promise<void> {
    // Update conversation history
    this.context.conversationHistory.push({
      question: question.text,
      answer: answer,
      timestamp: new Date().toISOString(),
    });

    // Extract learnings from the answer
    await this.extractLearnings(question, answer);

    // Update context based on answer
    await this.updateContext(question, answer);

    // Store in database
    await this.saveConversationState();
  }

  private async extractLearnings(
    question: DynamicQuestion,
    answer: string,
  ): Promise<void> {
    const learning: Record<string, any> = {
      category: question.category,
      timestamp: new Date().toISOString(),
    };

    // Extract based on question type
    switch (question.type) {
      case "scale":
        learning.value = parseInt(answer);
        learning.interpretation = this.interpretScaleAnswer(parseInt(answer));
        break;

      case "multiple_choice":
        learning.selection = answer;
        learning.implications = this.interpretChoice(question.category, answer);
        break;

      case "open_ended":
        learning.freeText = answer;
        learning.keywords = this.extractKeywords(answer);
        learning.sentiment = this.analyzeSentiment(answer);
        break;

      case "yes_no":
        learning.boolean = answer.toLowerCase() === "yes";
        break;
    }

    // Store learning in AI learning repository
    await this.supabase.from("wellness_ai_learning").insert({
      client_id: this.context.clientId,
      organization_id: this.context.organizationId,
      learning_type: "response_pattern",
      category: question.category,
      data_point: learning,
      confidence_score: 0.8,
    });
  }

  private interpretScaleAnswer(value: number): string {
    if (value <= 3) return "low";
    if (value <= 7) return "moderate";
    return "high";
  }

  private interpretChoice(
    category: string,
    choice: string,
  ): Record<string, any> {
    // Category-specific interpretation
    const implications: Record<string, any> = {};

    if (category === "nutrition" && choice === "Vegetarian") {
      implications.dietary_restriction = "no_meat";
      implications.protein_sources = ["legumes", "dairy", "eggs"];
    }

    // Add more interpretations

    return implications;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - would use NLP library in production
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "can",
      "could",
    ]);

    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));
  }

  private analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "happy",
      "excited",
      "motivated",
      "confident",
    ];
    const negativeWords = [
      "bad",
      "difficult",
      "hard",
      "struggle",
      "tired",
      "stressed",
      "worried",
    ];

    const lowerText = text.toLowerCase();
    let score = 0;

    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) score++;
    });

    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) score--;
    });

    if (score > 0) return "positive";
    if (score < 0) return "negative";
    return "neutral";
  }

  private async updateContext(
    question: DynamicQuestion,
    answer: string,
  ): Promise<void> {
    // Update learned preferences
    if (question.category === "preferences") {
      this.context.learnedPreferences[`${question.category}_${Date.now()}`] =
        answer;
    }

    // Update goals
    if (question.category === "goals") {
      if (!this.context.goals) this.context.goals = {};
      this.context.goals[`goal_${Date.now()}`] = answer;
    }

    // Update constraints
    if (
      question.category === "constraints" ||
      answer.toLowerCase().includes("allerg") ||
      answer.toLowerCase().includes("can't")
    ) {
      if (!this.context.constraints) this.context.constraints = {};
      this.context.constraints[`constraint_${Date.now()}`] = answer;
    }

    // Check for phase transitions
    if (this.shouldTransitionPhase()) {
      this.context.currentPhase = this.getNextPhase();
    }
  }

  private shouldTransitionPhase(): boolean {
    const historyLength = this.context.conversationHistory.length;

    switch (this.context.currentPhase) {
      case "assessment":
        // Move to planning after sufficient assessment
        return historyLength >= 10 && this.hasBasicInfo();
      case "planning":
        // Move to adjustment after plan is created
        return historyLength >= 15;
      case "adjustment":
        // Stay in adjustment or move to check-in
        return historyLength >= 20;
      default:
        return false;
    }
  }

  private hasBasicInfo(): boolean {
    const hasGoals =
      this.context.goals && Object.keys(this.context.goals).length > 0;
    const hasPreferences =
      this.context.learnedPreferences &&
      Object.keys(this.context.learnedPreferences).length > 2;
    return hasGoals && hasPreferences;
  }

  private getNextPhase():
    | "assessment"
    | "planning"
    | "adjustment"
    | "check-in" {
    const phaseOrder: Array<
      "assessment" | "planning" | "adjustment" | "check-in"
    > = ["assessment", "planning", "adjustment", "check-in"];

    const currentIndex = phaseOrder.indexOf(this.context.currentPhase);
    if (currentIndex < phaseOrder.length - 1) {
      return phaseOrder[currentIndex + 1];
    }
    return "check-in";
  }

  private async saveConversationState(): Promise<void> {
    await this.supabase.from("wellness_conversations").upsert({
      client_id: this.context.clientId,
      organization_id: this.context.organizationId,
      conversation_phase: this.context.currentPhase,
      context_data: {
        historyLength: this.context.conversationHistory.length,
        lastInteraction: new Date().toISOString(),
      },
      learned_preferences: this.context.learnedPreferences,
      goals: this.context.goals,
      constraints: this.context.constraints,
      lifestyle_factors: this.context.lifestyleFactors,
      conversation_history: this.context.conversationHistory.slice(-50), // Keep last 50 exchanges
      last_interaction_at: new Date().toISOString(),
    });
  }
}
