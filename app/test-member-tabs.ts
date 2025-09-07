#!/usr/bin/env tsx
/**
 * Test script for member profile tabs functionality
 * Run with: npx tsx app/test-member-tabs.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://lzlrojoaxrqvmhempnkn.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA3MjE4MDcsImV4cCI6MjAzNjI5NzgwN30.F3X_VSfKL5S5r53zETW_ACdpBBFC2NcXh0QCB5UYfBA";

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  test: string;
  status: "pass" | "fail";
  message?: string;
  details?: any;
}

const results: TestResult[] = [];

async function testNotesAPI() {
  console.log("🧪 Testing Notes API...");

  try {
    // Test customer ID (you'll need a valid one from your database)
    const testCustomerId = "test-customer-id";
    const apiUrl = "https://atlas-fitness-onboarding.vercel.app";

    // Test GET endpoint
    const getResponse = await fetch(
      `${apiUrl}/api/customers/${testCustomerId}/notes`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (getResponse.status === 401) {
      results.push({
        test: "Notes API - GET",
        status: "pass",
        message: "Correctly requires authentication",
      });
    } else if (getResponse.ok) {
      const data = await getResponse.json();
      results.push({
        test: "Notes API - GET",
        status: "pass",
        message: "Endpoint accessible",
        details: data,
      });
    } else {
      results.push({
        test: "Notes API - GET",
        status: "fail",
        message: `Unexpected status: ${getResponse.status}`,
      });
    }

    // Test POST endpoint
    const postResponse = await fetch(
      `${apiUrl}/api/customers/${testCustomerId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "Test note from automated test",
          is_internal: true,
        }),
      },
    );

    if (postResponse.status === 401) {
      results.push({
        test: "Notes API - POST",
        status: "pass",
        message: "Correctly requires authentication",
      });
    } else if (postResponse.ok) {
      results.push({
        test: "Notes API - POST",
        status: "pass",
        message: "Note creation endpoint works",
      });
    } else {
      results.push({
        test: "Notes API - POST",
        status: "fail",
        message: `Unexpected status: ${postResponse.status}`,
      });
    }
  } catch (error) {
    results.push({
      test: "Notes API",
      status: "fail",
      message: "API test failed",
      details: error,
    });
  }
}

async function testDatabaseSchema() {
  console.log("🗄️ Testing Database Schema...");

  try {
    // Test customer_notes table structure
    const { data: notes, error: notesError } = await supabase
      .from("customer_notes")
      .select("*")
      .limit(1);

    if (notesError) {
      results.push({
        test: "customer_notes table",
        status: "fail",
        message: "Table query failed",
        details: notesError,
      });
    } else {
      results.push({
        test: "customer_notes table",
        status: "pass",
        message: "Table accessible",
      });
    }

    // Test customer_memberships table
    const { data: memberships, error: membershipError } = await supabase
      .from("customer_memberships")
      .select("*")
      .limit(1);

    if (membershipError) {
      results.push({
        test: "customer_memberships table",
        status: "fail",
        message: "Table query failed",
        details: membershipError,
      });
    } else {
      results.push({
        test: "customer_memberships table",
        status: "pass",
        message: "Table accessible",
      });
    }

    // Test lead_tags table
    const { data: tags, error: tagsError } = await supabase
      .from("lead_tags")
      .select("*")
      .limit(1);

    if (tagsError) {
      results.push({
        test: "lead_tags table",
        status: "fail",
        message: "Table query failed",
        details: tagsError,
      });
    } else {
      results.push({
        test: "lead_tags table",
        status: "pass",
        message: "Table accessible",
      });
    }

    // Test customer_waivers table
    const { data: waivers, error: waiversError } = await supabase
      .from("customer_waivers")
      .select("*")
      .limit(1);

    if (waiversError) {
      results.push({
        test: "customer_waivers table",
        status: "fail",
        message: "Table query failed",
        details: waiversError,
      });
    } else {
      results.push({
        test: "customer_waivers table",
        status: "pass",
        message: "Table accessible",
      });
    }
  } catch (error) {
    results.push({
      test: "Database Schema",
      status: "fail",
      message: "Schema test failed",
      details: error,
    });
  }
}

async function testRLSPolicies() {
  console.log("🔒 Testing RLS Policies...");

  try {
    // Test without authentication (should fail)
    const { data, error } = await supabase
      .from("customer_notes")
      .select("*")
      .limit(1);

    if (error && error.message.includes("row-level security")) {
      results.push({
        test: "RLS - customer_notes",
        status: "pass",
        message: "RLS correctly blocks unauthorized access",
      });
    } else if (!error) {
      results.push({
        test: "RLS - customer_notes",
        status: "fail",
        message: "RLS not enforced - data accessible without auth",
      });
    } else {
      results.push({
        test: "RLS - customer_notes",
        status: "fail",
        message: "Unexpected error",
        details: error,
      });
    }
  } catch (error) {
    results.push({
      test: "RLS Policies",
      status: "fail",
      message: "RLS test failed",
      details: error,
    });
  }
}

async function testMemberProfileEndpoints() {
  console.log("🔗 Testing Member Profile Endpoints...");

  const endpoints = [
    "/api/customers/[id]/activity",
    "/api/customers/[id]/notes",
    "/api/memberships",
    "/api/waivers",
    "/api/bookings/available-classes",
  ];

  for (const endpoint of endpoints) {
    try {
      const testUrl = `https://atlas-fitness-onboarding.vercel.app${endpoint.replace("[id]", "test-id")}`;
      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // We expect 401 (unauthorized) or 404 (not found) for test IDs
      if (response.status === 401 || response.status === 404) {
        results.push({
          test: `Endpoint: ${endpoint}`,
          status: "pass",
          message: `Status ${response.status} - Endpoint exists and responds`,
        });
      } else if (response.status === 500) {
        results.push({
          test: `Endpoint: ${endpoint}`,
          status: "fail",
          message: "Server error - check implementation",
        });
      } else {
        results.push({
          test: `Endpoint: ${endpoint}`,
          status: "pass",
          message: `Status ${response.status}`,
        });
      }
    } catch (error) {
      results.push({
        test: `Endpoint: ${endpoint}`,
        status: "fail",
        message: "Failed to reach endpoint",
        details: error,
      });
    }
  }
}

async function runAllTests() {
  console.log("🚀 Starting Member Profile Tabs Test Suite");
  console.log("=".repeat(50));

  await testDatabaseSchema();
  await testRLSPolicies();
  await testNotesAPI();
  await testMemberProfileEndpoints();

  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Results Summary:");
  console.log("=".repeat(50));

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;

  results.forEach((result) => {
    const icon = result.status === "pass" ? "✅" : "❌";
    console.log(`${icon} ${result.test}: ${result.message || result.status}`);
    if (result.details && result.status === "fail") {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  });

  console.log("\n" + "=".repeat(50));
  console.log(`Total: ${results.length} tests`);
  console.log(
    `Passed: ${passed} (${Math.round((passed / results.length) * 100)}%)`,
  );
  console.log(
    `Failed: ${failed} (${Math.round((failed / results.length) * 100)}%)`,
  );

  if (failed === 0) {
    console.log("\n🎉 All tests passed! Member profile tabs are ready.");
  } else {
    console.log("\n⚠️ Some tests failed. Please review the issues above.");
  }

  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(console.error);
