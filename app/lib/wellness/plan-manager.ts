// This file will be used server-side only
// Client components should call API endpoints that use this
import OpenAI from "openai";

export interface WellnessPlan {
  id?: string;
  clientId: string;
  organizationId: string;
  planName: string;
  planType:
    | "comprehensive"
    | "nutrition"
    | "fitness"
    | "mental_health"
    | "sleep";
  status: "draft" | "active" | "paused" | "completed";

  // Meal Planning
  mealPlans: {
    breakfast?: MealPlan;
    lunch?: MealPlan;
    dinner?: MealPlan;
    snacks?: MealPlan[];
    preworkout?: MealPlan;
    postworkout?: MealPlan;
  };
  nutritionTargets: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    fiber?: number;
    micronutrients?: Record<string, number>;
  };
  dietaryPreferences: string[];
  allergies: string[];

  // Hydration
  waterIntakeTarget?: number; // in ml
  hydrationReminders?: {
    times: string[];
    amounts: number[];
  };

  // Sleep & Recovery
  sleepSchedule?: {
    targetBedtime: string;
    targetWakeTime: string;
    windDownRoutine?: string[];
    morningRoutine?: string[];
  };
  sleepQualityFactors?: {
    environment: string[];
    habits: string[];
    supplements?: string[];
  };
  recoveryProtocols?: {
    stretching?: RoutineItem[];
    meditation?: RoutineItem[];
    breathwork?: RoutineItem[];
    coldTherapy?: boolean;
    massage?: string;
  };

  // Mental Wellbeing
  stressManagement?: {
    techniques: string[];
    triggers: string[];
    copingStrategies: Record<string, string>;
  };
  mindfulnessPractices?: {
    morning?: string[];
    evening?: string[];
    asNeeded?: string[];
  };
  moodTrackingEnabled: boolean;

  // Habits & Behaviors
  habitGoals?: HabitGoal[];
  behaviorTriggers?: {
    positive: Record<string, string>;
    negative: Record<string, string>;
  };

  // Training Integration
  trainingScheduleSync: boolean;
  preWorkoutNutrition?: {
    timing: string; // "30min before", "1hr before"
    foods: string[];
    supplements?: string[];
  };
  postWorkoutNutrition?: {
    timing: string; // "immediately", "within 30min"
    foods: string[];
    supplements?: string[];
  };
  recoveryBetweenSessions?: {
    minHours: number;
    activeRecovery: string[];
  };
}

interface MealPlan {
  name: string;
  items: FoodItem[];
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  prepTime?: number;
  customizable: boolean;
  alternatives?: FoodItem[][];
}

interface FoodItem {
  name: string;
  quantity: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface RoutineItem {
  name: string;
  duration: string;
  instructions?: string;
  frequency: string;
}

interface HabitGoal {
  habit: string;
  type: "build" | "break";
  currentFrequency?: string;
  targetFrequency: string;
  strategy: string;
  reminders?: string[];
  rewards?: string[];
}

export class WellnessPlanManager {
  private supabase: any;
  private openai: OpenAI | null = null;

  constructor() {}

  async initialize() {
    this.supabase = await createClient();
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async createPersonalizedPlan(
    clientId: string,
    organizationId: string,
    conversationData: any,
    coachPersonality?: any,
  ): Promise<WellnessPlan> {
    // Extract key information from conversation
    const extractedInfo = this.extractPlanRequirements(conversationData);

    // Get client's training schedule
    const trainingSchedule = await this.getClientTrainingSchedule(clientId);

    // Get organization preferences
    const orgPreferences =
      await this.getOrganizationPreferences(organizationId);

    // Generate personalized plan using AI
    let plan: WellnessPlan;
    if (this.openai) {
      plan = await this.generateAIPlan(
        extractedInfo,
        trainingSchedule,
        orgPreferences,
        coachPersonality,
      );
    } else {
      plan = this.generateTemplatePlan(extractedInfo, trainingSchedule);
    }

    // Save plan to database
    const savedPlan = await this.savePlan(plan);

    // Generate initial recommendations
    await this.generateRecommendations(savedPlan.id!);

    return savedPlan;
  }

  private extractPlanRequirements(conversationData: any): any {
    const requirements = {
      goals: [],
      preferences: [],
      constraints: [],
      lifestyle: {},
      currentHabits: {},
      challenges: [],
    };

    // Parse conversation history
    if (conversationData.conversationHistory) {
      conversationData.conversationHistory.forEach((exchange: any) => {
        const answer = exchange.answer.toLowerCase();
        const question = exchange.question.toLowerCase();

        // Extract goals
        if (question.includes("goal")) {
          requirements.goals.push(exchange.answer);
        }

        // Extract dietary preferences
        if (question.includes("diet") || question.includes("food")) {
          if (answer.includes("vegetarian"))
            requirements.preferences.push("vegetarian");
          if (answer.includes("vegan")) requirements.preferences.push("vegan");
          if (answer.includes("gluten"))
            requirements.constraints.push("gluten-free");
        }

        // Extract sleep patterns
        if (question.includes("sleep")) {
          requirements.lifestyle.sleepHours = this.extractNumber(answer) || 7;
        }

        // Extract exercise frequency
        if (question.includes("exercise") || question.includes("workout")) {
          requirements.currentHabits.exerciseFrequency = exchange.answer;
        }

        // Extract challenges
        if (question.includes("challenge") || question.includes("struggle")) {
          requirements.challenges.push(exchange.answer);
        }
      });
    }

    // Use learned preferences
    if (conversationData.learnedPreferences) {
      Object.assign(
        requirements.preferences,
        conversationData.learnedPreferences,
      );
    }

    // Use explicit goals
    if (conversationData.goals) {
      Object.values(conversationData.goals).forEach((goal: any) => {
        requirements.goals.push(goal);
      });
    }

    // Use constraints
    if (conversationData.constraints) {
      Object.values(conversationData.constraints).forEach((constraint: any) => {
        requirements.constraints.push(constraint);
      });
    }

    return requirements;
  }

  private extractNumber(text: string): number | null {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  private async getClientTrainingSchedule(clientId: string): Promise<any[]> {
    // Get upcoming booked sessions
    const { data: bookings } = await this.supabase
      .from("class_bookings")
      .select(
        `
        *,
        class_sessions (
          name,
          start_time,
          end_time,
          type,
          intensity_level
        )
      `,
      )
      .eq("client_id", clientId)
      .eq("status", "confirmed")
      .gte("class_date", new Date().toISOString().split("T")[0])
      .order("class_date", { ascending: true })
      .limit(20);

    return bookings || [];
  }

  private async getOrganizationPreferences(
    organizationId: string,
  ): Promise<any> {
    const { data: org } = await this.supabase
      .from("organizations")
      .select("settings")
      .eq("id", organizationId)
      .single();

    return org?.settings?.wellness || {};
  }

  private async generateAIPlan(
    requirements: any,
    trainingSchedule: any[],
    orgPreferences: any,
    coachPersonality?: any,
  ): Promise<WellnessPlan> {
    const systemPrompt = this.buildSystemPrompt(
      coachPersonality,
      orgPreferences,
    );
    const userPrompt = this.buildUserPrompt(requirements, trainingSchedule);

    const completion = await this.openai!.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const planData = JSON.parse(completion.choices[0].message.content || "{}");

    return this.validateAndEnrichPlan(planData, requirements);
  }

  private buildSystemPrompt(
    coachPersonality: any,
    orgPreferences: any,
  ): string {
    const personality = coachPersonality || {
      traits: "supportive and knowledgeable",
      style: "friendly and professional",
    };

    return `You are an expert wellness coach with the following personality: ${JSON.stringify(personality)}.
    
    Create a comprehensive, personalized wellness plan that includes:
    1. Customized meal plans (breakfast, lunch, dinner, snacks)
    2. Hydration targets and reminders
    3. Sleep optimization strategies
    4. Recovery protocols
    5. Stress management techniques
    6. Habit formation goals
    7. Training nutrition (pre/post workout)
    
    Guidelines:
    - Make everything 100% personalized based on the client's responses
    - Nothing should be generic or one-size-fits-all
    - Consider the client's training schedule
    - Account for all constraints and preferences
    - Provide alternatives and customization options
    - Focus on sustainable, long-term changes
    
    Organization preferences: ${JSON.stringify(orgPreferences)}
    
    Return a JSON object matching the WellnessPlan interface structure.`;
  }

  private buildUserPrompt(requirements: any, trainingSchedule: any[]): string {
    return `Create a personalized wellness plan for a client with the following profile:
    
    Goals: ${requirements.goals.join(", ")}
    Preferences: ${requirements.preferences.join(", ")}
    Constraints: ${requirements.constraints.join(", ")}
    Current Lifestyle: ${JSON.stringify(requirements.lifestyle)}
    Current Habits: ${JSON.stringify(requirements.currentHabits)}
    Challenges: ${requirements.challenges.join(", ")}
    
    Training Schedule:
    ${trainingSchedule
      .map(
        (session) =>
          `- ${session.class_sessions.name} on ${session.class_date} (${session.class_sessions.intensity_level} intensity)`,
      )
      .join("\n")}
    
    Create a complete wellness plan that addresses all aspects of health and is fully customized to this individual.`;
  }

  private validateAndEnrichPlan(
    planData: any,
    requirements: any,
  ): WellnessPlan {
    // Ensure all required fields are present
    const plan: WellnessPlan = {
      clientId: requirements.clientId || "",
      organizationId: requirements.organizationId || "",
      planName: planData.planName || "Personalized Wellness Journey",
      planType: "comprehensive",
      status: "active",
      mealPlans: planData.mealPlans || {},
      nutritionTargets: planData.nutritionTargets || {},
      dietaryPreferences: requirements.preferences || [],
      allergies:
        requirements.constraints.filter((c: string) => c.includes("allerg")) ||
        [],
      waterIntakeTarget: planData.waterIntakeTarget || 2500,
      hydrationReminders: planData.hydrationReminders,
      sleepSchedule: planData.sleepSchedule,
      sleepQualityFactors: planData.sleepQualityFactors,
      recoveryProtocols: planData.recoveryProtocols,
      stressManagement: planData.stressManagement,
      mindfulnessPractices: planData.mindfulnessPractices,
      moodTrackingEnabled: planData.moodTrackingEnabled !== false,
      habitGoals: planData.habitGoals || [],
      behaviorTriggers: planData.behaviorTriggers,
      trainingScheduleSync: true,
      preWorkoutNutrition: planData.preWorkoutNutrition,
      postWorkoutNutrition: planData.postWorkoutNutrition,
      recoveryBetweenSessions: planData.recoveryBetweenSessions,
    };

    // Add default values for missing fields
    if (!plan.mealPlans.breakfast) {
      plan.mealPlans.breakfast = this.generateDefaultMeal(
        "breakfast",
        requirements,
      );
    }

    return plan;
  }

  private generateDefaultMeal(mealType: string, requirements: any): MealPlan {
    // Generate a basic meal based on requirements
    const isVegetarian = requirements.preferences.includes("vegetarian");
    const isVegan = requirements.preferences.includes("vegan");

    const meals: Record<string, MealPlan> = {
      breakfast: {
        name: "Balanced Morning Start",
        items: [
          {
            name: isVegan ? "Oatmeal" : "Greek Yogurt",
            quantity: isVegan ? "1" : "200",
            unit: isVegan ? "cup" : "g",
            calories: isVegan ? 150 : 130,
            protein: isVegan ? 5 : 20,
            carbs: isVegan ? 27 : 9,
            fats: isVegan ? 3 : 0,
          },
          {
            name: "Mixed Berries",
            quantity: "1",
            unit: "cup",
            calories: 85,
            protein: 1,
            carbs: 21,
            fats: 0.5,
          },
          {
            name: isVegan ? "Almond Butter" : "Honey",
            quantity: "1",
            unit: "tbsp",
            calories: isVegan ? 98 : 64,
            protein: isVegan ? 3.4 : 0.1,
            carbs: isVegan ? 3 : 17,
            fats: isVegan ? 9 : 0,
          },
        ],
        calories: 333,
        macros: {
          protein: isVegan ? 9.4 : 21.1,
          carbs: isVegan ? 51 : 47,
          fats: isVegan ? 12.5 : 0.5,
        },
        prepTime: 5,
        customizable: true,
        alternatives: [],
      },
    };

    return meals[mealType] || meals.breakfast;
  }

  private generateTemplatePlan(
    extractedInfo: any,
    trainingSchedule: any[],
  ): WellnessPlan {
    // Fallback template-based plan generation
    return {
      clientId: extractedInfo.clientId || "",
      organizationId: extractedInfo.organizationId || "",
      planName: "Wellness Foundation Plan",
      planType: "comprehensive",
      status: "active",
      mealPlans: {
        breakfast: this.generateDefaultMeal("breakfast", extractedInfo),
        lunch: this.generateDefaultMeal("lunch", extractedInfo),
        dinner: this.generateDefaultMeal("dinner", extractedInfo),
      },
      nutritionTargets: {
        calories: 2000,
        protein: 120,
        carbs: 250,
        fats: 70,
        fiber: 30,
      },
      dietaryPreferences: extractedInfo.preferences || [],
      allergies: extractedInfo.constraints || [],
      waterIntakeTarget: 2500,
      moodTrackingEnabled: true,
      trainingScheduleSync: true,
      habitGoals: [
        {
          habit: "Drink water upon waking",
          type: "build",
          targetFrequency: "daily",
          strategy: "Place water bottle by bedside",
          reminders: ["7:00 AM"],
        },
        {
          habit: "10 minute evening walk",
          type: "build",
          targetFrequency: "5x per week",
          strategy: "After dinner routine",
          reminders: ["7:00 PM"],
        },
      ],
    };
  }

  private async savePlan(plan: WellnessPlan): Promise<WellnessPlan> {
    const { data, error } = await this.supabase
      .from("wellness_plans")
      .insert({
        client_id: plan.clientId,
        organization_id: plan.organizationId,
        plan_name: plan.planName,
        plan_type: plan.planType,
        status: plan.status,
        meal_plans: plan.mealPlans,
        nutrition_targets: plan.nutritionTargets,
        dietary_preferences: plan.dietaryPreferences,
        allergies: plan.allergies,
        water_intake_target: plan.waterIntakeTarget,
        hydration_reminders: plan.hydrationReminders,
        sleep_schedule: plan.sleepSchedule,
        sleep_quality_factors: plan.sleepQualityFactors,
        recovery_protocols: plan.recoveryProtocols,
        stress_management: plan.stressManagement,
        mindfulness_practices: plan.mindfulnessPractices,
        mood_tracking_enabled: plan.moodTrackingEnabled,
        habit_goals: plan.habitGoals,
        behavior_triggers: plan.behaviorTriggers,
        training_schedule_sync: plan.trainingScheduleSync,
        pre_workout_nutrition: plan.preWorkoutNutrition,
        post_workout_nutrition: plan.postWorkoutNutrition,
        recovery_between_sessions: plan.recoveryBetweenSessions,
      })
      .select()
      .single();

    if (error) throw error;

    return { ...plan, id: data.id };
  }

  async updatePlan(
    planId: string,
    updates: Partial<WellnessPlan>,
  ): Promise<WellnessPlan> {
    // Record the adjustment in history
    const { data: currentPlan } = await this.supabase
      .from("wellness_plans")
      .select("adjustments_history")
      .eq("id", planId)
      .single();

    const adjustmentHistory = currentPlan?.adjustments_history || [];
    adjustmentHistory.push({
      timestamp: new Date().toISOString(),
      changes: updates,
      reason: "Client/coach modification",
    });

    const { data, error } = await this.supabase
      .from("wellness_plans")
      .update({
        ...updates,
        adjustments_history: adjustmentHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async generateRecommendations(planId: string): Promise<void> {
    // Call the database function to generate recommendations
    await this.supabase.rpc("generate_wellness_recommendations", {
      p_wellness_plan_id: planId,
    });
  }

  async logDailyProgress(
    planId: string,
    date: string,
    logData: any,
  ): Promise<void> {
    const { error } = await this.supabase.from("wellness_daily_logs").upsert({
      wellness_plan_id: planId,
      client_id: logData.clientId,
      date: date,
      meals_logged: logData.meals,
      meal_adherence_score: this.calculateAdherenceScore(logData.meals, planId),
      water_intake_ml: logData.waterIntake,
      sleep_hours: logData.sleepHours,
      sleep_quality: logData.sleepQuality,
      wake_time: logData.wakeTime,
      bed_time: logData.bedTime,
      workout_completed: logData.workoutCompleted,
      workout_intensity: logData.workoutIntensity,
      workout_notes: logData.workoutNotes,
      energy_level: logData.energyLevel,
      stress_level: logData.stressLevel,
      mood: logData.mood,
      habits_completed: logData.habitsCompleted,
      notes: logData.notes,
      ai_insights: await this.generateDailyInsights(logData),
    });

    if (error) throw error;
  }

  private async calculateAdherenceScore(
    mealsLogged: any,
    planId: string,
  ): Promise<number> {
    // Compare logged meals with planned meals
    // This is a simplified calculation
    return 0.85; // Placeholder
  }

  private async generateDailyInsights(logData: any): Promise<any> {
    if (!this.openai) return {};

    // Generate insights based on daily log
    const insights = {
      summary: "Good progress today!",
      highlights: [],
      suggestions: [],
      trends: {},
    };

    // Add logic to generate meaningful insights
    if (logData.sleepHours < 7) {
      insights.suggestions.push(
        "Consider going to bed 30 minutes earlier tonight",
      );
    }

    if (logData.waterIntake < 2000) {
      insights.suggestions.push("Try to increase water intake tomorrow");
    }

    return insights;
  }

  async getClientProgress(clientId: string, days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: logs } = await this.supabase
      .from("wellness_daily_logs")
      .select("*")
      .eq("client_id", clientId)
      .gte("date", startDate.toISOString().split("T")[0])
      .order("date", { ascending: false });

    const { data: plan } = await this.supabase
      .from("wellness_plans")
      .select("*")
      .eq("client_id", clientId)
      .eq("status", "active")
      .single();

    return {
      plan,
      logs,
      summary: this.generateProgressSummary(logs, plan),
    };
  }

  private generateProgressSummary(logs: any[], plan: any): any {
    if (!logs || logs.length === 0) {
      return { message: "No progress data available yet" };
    }

    const summary = {
      daysTracked: logs.length,
      averageSleep: 0,
      averageWaterIntake: 0,
      workoutsCompleted: 0,
      mealAdherence: 0,
      overallTrend: "stable" as "improving" | "stable" | "declining",
    };

    // Calculate averages
    let totalSleep = 0;
    let totalWater = 0;
    let totalAdherence = 0;

    logs.forEach((log) => {
      totalSleep += log.sleep_hours || 0;
      totalWater += log.water_intake_ml || 0;
      totalAdherence += log.meal_adherence_score || 0;
      if (log.workout_completed) summary.workoutsCompleted++;
    });

    summary.averageSleep = totalSleep / logs.length;
    summary.averageWaterIntake = totalWater / logs.length;
    summary.mealAdherence = totalAdherence / logs.length;

    // Determine trend
    if (logs.length >= 3) {
      const recentAvg =
        (logs[0].energy_level + logs[1].energy_level + logs[2].energy_level) /
        3;
      const olderAvg =
        (logs[logs.length - 1].energy_level +
          logs[logs.length - 2].energy_level +
          logs[logs.length - 3].energy_level) /
        3;

      if (recentAvg > olderAvg + 1) summary.overallTrend = "improving";
      else if (recentAvg < olderAvg - 1) summary.overallTrend = "declining";
    }

    return summary;
  }
}
