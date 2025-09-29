import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import OpenAI from "openai";
import { NutritionProfile } from "@/app/api/nutrition/profile/route";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

interface WizardResult {
  response: string;
  isComplete: boolean;
  extractedData?: Partial<NutritionProfile>;
}

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }
  return openai;
}

// System prompt for the nutrition wizard
const SYSTEM_PROMPT = `You are a professional nutrition coach helping users set up their nutrition profile. 
Your goal is to collect the following information in a conversational manner:

1. Age and sex (male/female)
2. Height (in cm) and current weight (in kg)
3. Goal weight (in kg)
4. Activity level (sedentary, lightly active, moderately active, very active, extremely active)
5. Training frequency (days per week)
6. Training types (e.g., strength training, cardio, sports)
7. Dietary preferences (e.g., vegetarian, vegan, keto, etc.)
8. Food allergies
9. Foods they like
10. Foods they dislike
11. Available cooking time (minimal, moderate, extensive)
12. Budget constraint (low, moderate, high)

Be friendly, encouraging, and professional. Ask for information naturally, one or two items at a time.
When you have collected all required information (at minimum: age, sex, height, current weight, goal weight, activity level, and training frequency), 
respond with a summary and include "PROFILE_COMPLETE" at the end of your message.

Important: Always convert measurements to metric (cm for height, kg for weight) if the user provides imperial units.`;

async function handleConversationWizard(
  message: string,
  conversationHistory: ChatMessage[],
): Promise<WizardResult> {
  try {
    // Prepare messages for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // Get response from OpenAI
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const assistantResponse = completion.choices[0]?.message?.content || "";
    const isComplete = assistantResponse.includes("PROFILE_COMPLETE");

    let extractedData: Partial<NutritionProfile> | undefined;

    if (isComplete) {
      // Extract data from the conversation
      const extractionMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `Extract the user's nutrition profile information from the conversation and return it as a JSON object.
          Convert all measurements to metric (cm for height, kg for weight).
          Map activity levels to: SEDENTARY, LIGHTLY_ACTIVE, MODERATELY_ACTIVE, VERY_ACTIVE, or EXTREMELY_ACTIVE.
          Map cooking time to: MINIMAL, MODERATE, or EXTENSIVE.
          Map budget to: LOW, MODERATE, or HIGH.
          Return only valid JSON.`,
        },
        {
          role: "user",
          content: `Extract profile data from this conversation: ${JSON.stringify(
            conversationHistory.concat([
              { role: "user", content: message },
              { role: "assistant", content: assistantResponse },
            ]),
          )}`,
        },
      ];

      const extractionCompletion = await getOpenAI().chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: extractionMessages,
        temperature: 0,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });

      try {
        const extractedJson = JSON.parse(
          extractionCompletion.choices[0]?.message?.content || "{}",
        );

        // Map the extracted data to our profile format
        extractedData = {
          age: extractedJson.age,
          sex: extractedJson.sex || extractedJson.gender,
          height: extractedJson.height,
          current_weight:
            extractedJson.current_weight || extractedJson.currentWeight,
          goal_weight: extractedJson.goal_weight || extractedJson.goalWeight,
          activity_level:
            extractedJson.activity_level || extractedJson.activityLevel,
          training_frequency:
            extractedJson.training_frequency || extractedJson.trainingFrequency,
          training_types:
            extractedJson.training_types || extractedJson.trainingTypes || [],
          dietary_preferences:
            extractedJson.dietary_preferences ||
            extractedJson.dietaryPreferences ||
            [],
          allergies: extractedJson.allergies || [],
          food_likes: extractedJson.food_likes || extractedJson.foodLikes || [],
          food_dislikes:
            extractedJson.food_dislikes || extractedJson.foodDislikes || [],
          cooking_time:
            extractedJson.cooking_time ||
            extractedJson.cookingTime ||
            "MODERATE",
          budget_constraint:
            extractedJson.budget_constraint ||
            extractedJson.budgetConstraint ||
            "MODERATE",
        };
      } catch (parseError) {
        console.error("Failed to parse extracted data:", parseError);
      }
    }

    // Clean response by removing PROFILE_COMPLETE marker
    const cleanResponse = assistantResponse
      .replace("PROFILE_COMPLETE", "")
      .trim();

    return {
      response: cleanResponse,
      isComplete,
      extractedData,
    };
  } catch (error) {
    console.error("Error in conversation wizard:", error);
    throw new Error("Failed to process conversation. Please try again.");
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = await createClient();

    // Get request body
    const { message, conversation } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Get or create chat session
    let chatSession = await supabase
      .from("nutrition_chat_sessions")
      .select("*")
      .eq("user_id", userWithOrg.id)
      .eq("organization_id", userWithOrg.organizationId)
      .eq("is_complete", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (chatSession.error && chatSession.error.code !== "PGRST116") {
      console.error("Error fetching chat session:", chatSession.error);
      return createErrorResponse(chatSession.error, 500);
    }

    // Create new session if none exists
    if (!chatSession.data) {
      const { data: newSession, error: createError } = await supabase
        .from("nutrition_chat_sessions")
        .insert({
          user_id: userWithOrg.id,
          organization_id: userWithOrg.organizationId,
          messages: [],
          is_complete: false,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating chat session:", createError);
        return createErrorResponse(createError, 500);
      }

      chatSession.data = newSession;
    }

    // Get conversation history
    const conversationHistory = conversation || chatSession.data.messages || [];

    // Handle the conversation
    const result = await handleConversationWizard(message, conversationHistory);

    // Update conversation history
    const updatedMessages = [
      ...conversationHistory,
      { role: "user", content: message, timestamp: new Date() },
      { role: "assistant", content: result.response, timestamp: new Date() },
    ];

    // Update chat session
    const { error: updateError } = await supabase
      .from("nutrition_chat_sessions")
      .update({
        messages: updatedMessages,
        is_complete: result.isComplete,
        updated_at: new Date().toISOString(),
      })
      .eq("id", chatSession.data.id);

    if (updateError) {
      console.error("Error updating chat session:", updateError);
    }

    // If conversation is complete, update or create the nutrition profile
    if (result.isComplete && result.extractedData) {
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from("nutrition_profiles")
        .select("id")
        .eq("user_id", userWithOrg.id)
        .eq("organization_id", userWithOrg.organizationId)
        .single();

      if (existingProfile) {
        // Update existing profile
        await supabase
          .from("nutrition_profiles")
          .update({
            ...result.extractedData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingProfile.id);
      } else {
        // Create new profile
        await supabase.from("nutrition_profiles").insert({
          user_id: userWithOrg.id,
          organization_id: userWithOrg.organizationId,
          ...result.extractedData,
        });
      }

      // TODO: Trigger meal plan generation in the background
    }

    return NextResponse.json({
      success: true,
      data: {
        message: result.response,
        isComplete: result.isComplete,
        extractedData: result.extractedData,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/nutrition/chat/wizard:", error);
    return createErrorResponse(error);
  }
}
