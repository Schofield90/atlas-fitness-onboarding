#!/usr/bin/env node

/**
 * Test GoHighLevel calendar availability in production
 * Tests if production is correctly filtering Sunday slots
 */

const AGENT_ID = "1b44af8e-d29d-4fdf-98a8-ab586a289e5e";
const PRODUCTION_URL = "https://admin.gymleadhub.co.uk";

async function testProduction() {
  console.log("🧪 Testing Production GHL Calendar Availability\n");

  // Get next Sunday's date
  const today = new Date();
  const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  const sundayDate = nextSunday.toISOString().split('T')[0];

  console.log(`📅 Testing Sunday: ${sundayDate}`);
  console.log(`🌐 URL: ${PRODUCTION_URL}/api/ai-agents/${AGENT_ID}/check-availability\n`);

  try {
    // Test Sunday availability
    const response = await fetch(
      `${PRODUCTION_URL}/api/ai-agents/${AGENT_ID}/check-availability`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: sundayDate }),
      }
    );

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error(text);
      return;
    }

    const result = await response.json();

    console.log("📊 PRODUCTION RESULTS:");
    console.log("=".repeat(60));
    console.log(`Date: ${result.data?.date || "N/A"}`);
    console.log(`Total Slots: ${result.data?.totalSlots || 0}`);
    console.log(`Morning Slots: ${result.data?.morningSlots?.length || 0}`);
    console.log(`Afternoon Slots: ${result.data?.afternoonSlots?.length || 0}`);
    console.log(`Evening Slots: ${result.data?.eveningSlots?.length || 0}`);
    console.log("=".repeat(60));

    // Check if Sunday has slots (it shouldn't!)
    if (result.data?.totalSlots > 0) {
      console.log("\n❌ FAILURE: Production is showing Sunday slots!");
      console.log("   Expected: 0 slots (gym doesn't take calls on Sunday)");
      console.log(`   Actual: ${result.data.totalSlots} slots`);
      console.log("\n🔍 Sample slots:");
      if (result.data.morningSlots?.length > 0) {
        console.log(`   Morning: ${result.data.morningSlots.slice(0, 3).map(s => s.time).join(", ")}`);
      }
      if (result.data.afternoonSlots?.length > 0) {
        console.log(`   Afternoon: ${result.data.afternoonSlots.slice(0, 3).map(s => s.time).join(", ")}`);
      }
      console.log("\n💡 This means production is NOT filtering Sunday slots correctly.");
    } else {
      console.log("\n✅ SUCCESS: Production correctly shows 0 Sunday slots!");
      console.log("   The GHL calendar configuration is being respected.");
    }

  } catch (error) {
    console.error("❌ Error testing production:", error.message);
  }
}

// Test diagnostic endpoint
async function testDiagnostic() {
  console.log("\n\n🔧 Testing Diagnostic Endpoint\n");
  console.log(`🌐 URL: ${PRODUCTION_URL}/api/diag/agents\n`);

  try {
    const response = await fetch(`${PRODUCTION_URL}/api/diag/agents`);

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const result = await response.json();

    console.log("📊 DIAGNOSTIC RESULTS:");
    console.log("=".repeat(60));
    console.log("Build Info:");
    console.log(`  Git SHA: ${result.build?.gitSha || "N/A"}`);
    console.log(`  Branch: ${result.build?.gitBranch || "N/A"}`);
    console.log(`  Environment: ${result.build?.environment || "N/A"}`);
    console.log("\nRegistry:");
    console.log(`  Total Tools: ${result.registry?.totalTools || 0}`);
    console.log("\nGHL Tool:");
    console.log(`  Found: ${result.ghlTool?.found ? "✅ YES" : "❌ NO"}`);
    console.log(`  ID: ${result.ghlTool?.id || "N/A"}`);
    console.log(`  Name: ${result.ghlTool?.name || "N/A"}`);
    console.log(`  Enabled: ${result.ghlTool?.enabled ? "✅ YES" : "❌ NO"}`);
    console.log("=".repeat(60));

    if (!result.ghlTool?.found) {
      console.log("\n❌ CRITICAL: GHL tool NOT registered in production!");
      console.log("   This confirms the deployment didn't include the fix.");
    } else {
      console.log("\n✅ GHL tool is registered in production.");
    }

  } catch (error) {
    console.error("❌ Error testing diagnostic:", error.message);
  }
}

// Run tests
(async () => {
  await testProduction();
  await testDiagnostic();
  console.log("\n✅ Test complete!\n");
})();
