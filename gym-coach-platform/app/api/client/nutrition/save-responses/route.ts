import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/api/database';

interface Response {
  questionId: string;
  value: string | string[];
}

interface NutritionProfile {
  responses: Response[];
  askedQuestions: string[];
  completeness: number;
  lastUpdated: string;
}

interface RequestBody {
  profileData: NutritionProfile;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { profileData } = body;

    // For demo purposes, we'll use a mock client ID and organization ID
    // In production, these would come from the authenticated session
    const mockClientId = 'demo_client_' + Date.now().toString().slice(-6);
    const mockOrganizationId = 'demo_org_123';

    // Check if a nutrition profile already exists for this client
    let existingProfile;
    try {
      existingProfile = await DatabaseService.findMany(
        'client_nutrition_plans',
        mockOrganizationId,
        {
          filters: { client_id: mockClientId },
          select: '*'
        }
      );
    } catch (error) {
      // Profile doesn't exist yet, which is fine
      existingProfile = { data: [], count: 0 };
    }

    // Calculate macro targets based on responses (simplified version)
    const macroTargets = calculateMacroTargets(profileData.responses);

    const nutritionData = {
      client_id: mockClientId,
      macro_targets: macroTargets,
      profile_data: profileData,
      notes: `Profile updated on ${new Date().toISOString()}. Completeness: ${profileData.completeness}%`
    };

    let result;
    if (existingProfile.data && existingProfile.data.length > 0) {
      // Update existing profile
      const existingId = existingProfile.data[0].id;
      result = await DatabaseService.update(
        'client_nutrition_plans',
        existingId,
        nutritionData,
        mockOrganizationId
      );
    } else {
      // Create new profile
      result = await DatabaseService.create(
        'client_nutrition_plans',
        nutritionData,
        mockOrganizationId
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Nutrition profile saved successfully'
    });

  } catch (error) {
    console.error('Error saving nutrition responses:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to save nutrition responses'
    }, { status: 500 });
  }
}

function calculateMacroTargets(responses: Response[]) {
  // Simple macro calculation based on responses
  // In a real implementation, this would be more sophisticated

  const responseMap = responses.reduce((acc, r) => {
    acc[r.questionId] = r.value;
    return acc;
  }, {} as Record<string, string | string[]>);

  const weight = parseFloat(responseMap.weight as string) || 70;
  const height = parseFloat(responseMap.height as string) || 170;
  const age = parseInt(responseMap.age as string) || 30;
  const goal = responseMap.goal as string || 'Maintain Weight';
  const activityLevel = responseMap.activity_level as string || 'Moderately Active';

  // Calculate BMR using Mifflin-St Jeor equation (simplified for male)
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;

  // Activity multipliers
  const activityMultipliers = {
    'Sedentary': 1.2,
    'Lightly Active': 1.375,
    'Moderately Active': 1.55,
    'Very Active': 1.725,
    'Extremely Active': 1.9
  };

  const multiplier = activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.55;
  let calories = bmr * multiplier;

  // Adjust calories based on goal
  switch (goal) {
    case 'Weight Loss':
      calories *= 0.85; // 15% deficit
      break;
    case 'Muscle Gain':
      calories *= 1.15; // 15% surplus
      break;
    default:
      // Maintain weight - no change
      break;
  }

  // Calculate macros (example ratios)
  const protein = Math.round((calories * 0.25) / 4); // 25% protein
  const carbs = Math.round((calories * 0.45) / 4); // 45% carbs
  const fat = Math.round((calories * 0.30) / 9); // 30% fat

  return {
    calories: Math.round(calories),
    protein,
    carbs,
    fat,
    calculatedAt: new Date().toISOString(),
    method: 'basic_calculation'
  };
}