"use client";

import NutritionDashboard from "@/app/components/nutrition/NutritionDashboard";

export default function TestNutritionPage() {
  // Mock client data for testing
  const mockClient = {
    id: "test-client-123",
    first_name: "Test",
    last_name: "User",
    email: "test@example.com",
    organization_id: "test-org-123",
  };

  return <NutritionDashboard client={mockClient} />;
}
