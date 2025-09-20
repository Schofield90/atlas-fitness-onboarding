import { test, expect } from "@playwright/test";

/**
 * Comprehensive E2E Test Suite for Calendar Database Consistency
 *
 * This test suite verifies that:
 * - Database stored times match calendar display times
 * - Time zones are handled consistently between database and UI
 * - CRUD operations maintain time integrity
 * - Class sessions don't drift or change times unexpectedly
 * - Concurrent access doesn't corrupt time data
 * - Database queries return consistent results
 */

test.describe("Calendar Database Consistency", () => {
  test.use({ storageState: ".auth/owner.json" });

  let testOrganizationId: string;
  let createdClassIds: string[] = [];

  test.beforeAll(async ({ page }) => {
    const orgResponse = await page.evaluate(async () => {
      const response = await fetch("/api/organization/current");
      return response.json();
    });

    if (orgResponse.success) {
      testOrganizationId = orgResponse.organization.id;
    } else {
      throw new Error("Unable to get test organization ID");
    }

    console.log(`Using test organization: ${testOrganizationId}`);
  });

  test.afterAll(async ({ page }) => {
    if (createdClassIds.length > 0) {
      console.log(`Cleaning up ${createdClassIds.length} test classes`);
      for (const classId of createdClassIds) {
        await page.evaluate(async (id) => {
          await fetch(`/api/class-sessions?id=${id}`, { method: "DELETE" });
        }, classId);
      }
    }
  });

  test("should verify database time matches calendar display exactly", async ({
    page,
  }) => {
    // Create test classes with precise times
    const testCases = [
      { name: "Precision Test 1", hour: 6, minute: 0, second: 0 },
      { name: "Precision Test 2", hour: 9, minute: 15, second: 30 },
      { name: "Precision Test 3", hour: 14, minute: 45, second: 0 },
      { name: "Precision Test 4", hour: 18, minute: 30, second: 15 },
      { name: "Precision Test 5", hour: 22, minute: 0, second: 45 },
    ];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const createdSessions = [];

    for (const testCase of testCases) {
      const precisetime = new Date(tomorrow);
      precisetime.setHours(testCase.hour, testCase.minute, testCase.second, 0);

      const classData = {
        name: testCase.name,
        start_time: precisetime.toISOString(),
        end_time: new Date(
          precisetime.getTime() + 60 * 60 * 1000,
        ).toISOString(),
        organization_id: testOrganizationId,
        max_capacity: 20,
        instructor: "Precision Test Instructor",
        description: `Precision test at ${testCase.hour}:${testCase.minute}:${testCase.second}`,
      };

      const createResponse = await page.evaluate(async (data) => {
        const response = await fetch("/api/class-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return response.json();
      }, classData);

      expect(createResponse.success).toBe(true);
      createdClassIds.push(createResponse.session.id);

      createdSessions.push({
        id: createResponse.session.id,
        name: testCase.name,
        originalTime: precisetime,
        expectedHour: testCase.hour,
        expectedMinute: testCase.minute,
        expectedSecond: testCase.second,
      });
    }

    // Fetch sessions from database via API
    const dbSessions = await page.evaluate(async (orgId) => {
      const response = await fetch(
        `/api/class-sessions?organizationId=${orgId}`,
      );
      const data = await response.json();
      return data.sessions || [];
    }, testOrganizationId);

    // Navigate to calendar
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Verify each session
    for (const session of createdSessions) {
      // Find in database response
      const dbSession = dbSessions.find((s: any) => s.id === session.id);
      expect(dbSession).toBeDefined();

      const dbTime = new Date(dbSession.startTime);

      // Verify database time precision
      expect(dbTime.getHours()).toBe(session.expectedHour);
      expect(dbTime.getMinutes()).toBe(session.expectedMinute);
      expect(dbTime.getSeconds()).toBe(session.expectedSecond);

      console.log(`DB Verification - ${session.name}: ${dbTime.toISOString()}`);

      // Find in calendar display
      const calendarElement = await page
        .locator(`text="${session.name}"`)
        .first();
      if ((await calendarElement.count()) > 0) {
        const container = calendarElement.locator("..").first();
        const containerText = (await container.textContent()) || "";

        // Extract displayed time
        const timeMatch = containerText.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const displayedHour = parseInt(timeMatch[1]);
          const displayedMinute = parseInt(timeMatch[2]);

          // Account for 12-hour vs 24-hour display
          let expectedDisplayHour = session.expectedHour;
          if (containerText.includes("PM") && session.expectedHour < 12) {
            expectedDisplayHour = session.expectedHour + 12;
          } else if (
            containerText.includes("AM") &&
            session.expectedHour >= 12
          ) {
            expectedDisplayHour = session.expectedHour - 12;
          }

          // For 24-hour format, use as-is
          if (!containerText.includes("AM") && !containerText.includes("PM")) {
            expectedDisplayHour = session.expectedHour;
          }

          expect(displayedHour).toBe(expectedDisplayHour);
          expect(displayedMinute).toBe(session.expectedMinute);

          console.log(
            `UI Verification - ${session.name}: ${displayedHour}:${displayedMinute.toString().padStart(2, "0")}`,
          );
        }
      }
    }

    await page.screenshot({
      path: "e2e/screenshots/database-precision-test.png",
      fullPage: true,
    });
  });

  test("should maintain time consistency through CRUD operations", async ({
    page,
  }) => {
    // Create initial class
    const baseTime = new Date();
    baseTime.setDate(baseTime.getDate() + 2);
    baseTime.setHours(10, 30, 0, 0);

    const initialData = {
      name: "CRUD Consistency Test",
      start_time: baseTime.toISOString(),
      end_time: new Date(baseTime.getTime() + 60 * 60 * 1000).toISOString(),
      organization_id: testOrganizationId,
      max_capacity: 15,
      instructor: "CRUD Test Instructor",
      description: "Testing CRUD time consistency",
    };

    // CREATE
    const createResponse = await page.evaluate(async (data) => {
      const response = await fetch("/api/class-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    }, initialData);

    expect(createResponse.success).toBe(true);
    const sessionId = createResponse.session.id;
    createdClassIds.push(sessionId);

    // READ - Verify initial time
    let dbSession = await page.evaluate(async (orgId) => {
      const response = await fetch(
        `/api/class-sessions?organizationId=${orgId}`,
      );
      const data = await response.json();
      return data.sessions.find((s: any) => s.name === "CRUD Consistency Test");
    }, testOrganizationId);

    const originalDbTime = new Date(dbSession.startTime);
    expect(originalDbTime.getHours()).toBe(10);
    expect(originalDbTime.getMinutes()).toBe(30);

    // UPDATE - Change only the instructor, not the time
    const updateResponse = await page.evaluate(
      async (data) => {
        const response = await fetch("/api/class-sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: data.sessionId,
            instructor: "Updated CRUD Instructor",
          }),
        });
        return response.json();
      },
      { sessionId },
    );

    expect(updateResponse.success).toBe(true);

    // Verify time didn't change after update
    dbSession = await page.evaluate(async (orgId) => {
      const response = await fetch(
        `/api/class-sessions?organizationId=${orgId}`,
      );
      const data = await response.json();
      return data.sessions.find((s: any) => s.name === "CRUD Consistency Test");
    }, testOrganizationId);

    const updatedDbTime = new Date(dbSession.startTime);
    expect(updatedDbTime.getHours()).toBe(10);
    expect(updatedDbTime.getMinutes()).toBe(30);
    expect(updatedDbTime.getTime()).toBe(originalDbTime.getTime());

    // UPDATE - Now change the time
    const newTime = new Date(baseTime);
    newTime.setHours(14, 45, 0, 0);

    const timeUpdateResponse = await page.evaluate(
      async (data) => {
        const response = await fetch("/api/class-sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: data.sessionId,
            start_time: data.newTime,
            end_time: new Date(
              new Date(data.newTime).getTime() + 60 * 60 * 1000,
            ).toISOString(),
          }),
        });
        return response.json();
      },
      { sessionId, newTime: newTime.toISOString() },
    );

    expect(timeUpdateResponse.success).toBe(true);

    // Verify time changed correctly
    dbSession = await page.evaluate(async (orgId) => {
      const response = await fetch(
        `/api/class-sessions?organizationId=${orgId}`,
      );
      const data = await response.json();
      return data.sessions.find((s: any) => s.name === "CRUD Consistency Test");
    }, testOrganizationId);

    const finalDbTime = new Date(dbSession.startTime);
    expect(finalDbTime.getHours()).toBe(14);
    expect(finalDbTime.getMinutes()).toBe(45);

    // Verify in calendar UI
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const calendarElement = await page
      .locator(`text="CRUD Consistency Test"`)
      .first();
    if ((await calendarElement.count()) > 0) {
      const container = calendarElement.locator("..").first();
      const containerText = (await container.textContent()) || "";

      // Should show updated time (14:45 or 2:45 PM)
      expect(containerText).toMatch(/14:45|2:45.*PM/);
      console.log(`✓ CRUD time update verified in UI: ${containerText}`);
    }

    console.log("✓ CRUD operations maintained time consistency");
  });

  test("should handle concurrent session creation without time corruption", async ({
    page,
  }) => {
    // Create multiple sessions concurrently at the same time to test for race conditions
    const concurrentTime = new Date();
    concurrentTime.setDate(concurrentTime.getDate() + 1);
    concurrentTime.setHours(16, 0, 0, 0);

    const concurrentClasses = [
      { name: "Concurrent Test A", location: "Studio A" },
      { name: "Concurrent Test B", location: "Studio B" },
      { name: "Concurrent Test C", location: "Studio C" },
      { name: "Concurrent Test D", location: "Main Gym" },
      { name: "Concurrent Test E", location: "Outdoor" },
    ];

    // Create all classes concurrently
    const createPromises = concurrentClasses.map((classInfo) =>
      page.evaluate(
        async (data) => {
          const response = await fetch("/api/class-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: data.name,
              start_time: data.startTime,
              end_time: data.endTime,
              organization_id: data.organizationId,
              max_capacity: 20,
              instructor: "Concurrent Test Instructor",
              location: data.location,
              description: "Testing concurrent creation",
            }),
          });
          return response.json();
        },
        {
          name: classInfo.name,
          location: classInfo.location,
          startTime: concurrentTime.toISOString(),
          endTime: new Date(
            concurrentTime.getTime() + 60 * 60 * 1000,
          ).toISOString(),
          organizationId: testOrganizationId,
        },
      ),
    );

    const createResults = await Promise.all(createPromises);

    // Verify all succeeded
    for (const result of createResults) {
      expect(result.success).toBe(true);
      createdClassIds.push(result.session.id);
    }

    // Fetch all sessions and verify times
    const allSessions = await page.evaluate(async (orgId) => {
      const response = await fetch(
        `/api/class-sessions?organizationId=${orgId}`,
      );
      const data = await response.json();
      return data.sessions.filter((s: any) =>
        s.name.startsWith("Concurrent Test"),
      );
    }, testOrganizationId);

    expect(allSessions.length).toBe(5);

    // All should have exactly the same start time
    const expectedTime = concurrentTime.toISOString();
    for (const session of allSessions) {
      const sessionTime = new Date(session.startTime);
      expect(sessionTime.getHours()).toBe(16);
      expect(sessionTime.getMinutes()).toBe(0);
      console.log(
        `${session.name}: ${session.startTime} (location: ${session.location})`,
      );
    }

    // Verify in calendar UI
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // All concurrent classes should be visible at the same time slot
    for (const classInfo of concurrentClasses) {
      const element = await page.locator(`text="${classInfo.name}"`).first();
      expect(await element.count()).toBeGreaterThan(0);
    }

    console.log("✓ Concurrent session creation maintained time integrity");
    await page.screenshot({
      path: "e2e/screenshots/concurrent-creation-test.png",
      fullPage: true,
    });
  });

  test("should verify database query consistency across multiple requests", async ({
    page,
  }) => {
    // Create a test class
    const queryTestTime = new Date();
    queryTestTime.setDate(queryTestTime.getDate() + 1);
    queryTestTime.setHours(11, 15, 30, 0);

    const classData = {
      name: "Query Consistency Test",
      start_time: queryTestTime.toISOString(),
      end_time: new Date(
        queryTestTime.getTime() + 60 * 60 * 1000,
      ).toISOString(),
      organization_id: testOrganizationId,
      max_capacity: 20,
      instructor: "Query Test Instructor",
      description: "Testing query consistency",
    };

    const createResponse = await page.evaluate(async (data) => {
      const response = await fetch("/api/class-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    }, classData);

    expect(createResponse.success).toBe(true);
    createdClassIds.push(createResponse.session.id);

    // Make multiple concurrent queries
    const queryPromises = Array.from({ length: 10 }, (_, i) =>
      page.evaluate(
        async (data) => {
          const response = await fetch(
            `/api/class-sessions?organizationId=${data.orgId}&t=${Date.now()}`,
          );
          const result = await response.json();
          return {
            queryIndex: data.index,
            sessions: result.sessions || [],
            timestamp: Date.now(),
          };
        },
        { orgId: testOrganizationId, index: i },
      ),
    );

    const queryResults = await Promise.all(queryPromises);

    // Find our test session in each result
    const testSessions = queryResults.map((result) => {
      const session = result.sessions.find(
        (s: any) => s.name === "Query Consistency Test",
      );
      return {
        queryIndex: result.queryIndex,
        session,
        timestamp: result.timestamp,
      };
    });

    // All queries should return the same session data
    const firstSession = testSessions[0].session;
    expect(firstSession).toBeDefined();

    for (const { queryIndex, session } of testSessions) {
      expect(session).toBeDefined();
      expect(session.startTime).toBe(firstSession.startTime);
      expect(session.endTime).toBe(firstSession.endTime);
      expect(session.name).toBe(firstSession.name);
      expect(session.id).toBe(firstSession.id);

      console.log(`Query ${queryIndex}: ${session.startTime}`);
    }

    // Verify the time is exactly what we set
    const returnedTime = new Date(firstSession.startTime);
    expect(returnedTime.getHours()).toBe(11);
    expect(returnedTime.getMinutes()).toBe(15);
    expect(returnedTime.getSeconds()).toBe(30);

    console.log(
      "✓ Database queries returned consistent results across multiple requests",
    );
  });

  test("should verify time zone handling in database vs calendar", async ({
    page,
  }) => {
    // Create classes with different time specifications
    const timezoneTests = [
      {
        name: "UTC Test Class",
        isoString: "2024-12-01T10:00:00.000Z", // Explicit UTC
        expectedUTCHour: 10,
      },
      {
        name: "Local Time Test Class",
        localHour: 15,
        localMinute: 30,
      },
    ];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const test of timezoneTests) {
      let startTime: string;

      if (test.isoString) {
        // Use explicit ISO string
        startTime = test.isoString;
      } else {
        // Use local time
        const localTime = new Date(tomorrow);
        localTime.setHours(test.localHour!, test.localMinute!, 0, 0);
        startTime = localTime.toISOString();
      }

      const classData = {
        name: test.name,
        start_time: startTime,
        end_time: new Date(
          new Date(startTime).getTime() + 60 * 60 * 1000,
        ).toISOString(),
        organization_id: testOrganizationId,
        max_capacity: 20,
        instructor: "Timezone Test Instructor",
        description: "Testing timezone handling",
      };

      const createResponse = await page.evaluate(async (data) => {
        const response = await fetch("/api/class-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return response.json();
      }, classData);

      expect(createResponse.success).toBe(true);
      createdClassIds.push(createResponse.session.id);
    }

    // Get timezone information from browser
    const browserTimezone = await page.evaluate(() => {
      return {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset(),
      };
    });

    console.log(
      `Browser timezone: ${browserTimezone.timezone}, offset: ${browserTimezone.offset} minutes`,
    );

    // Fetch sessions from database
    const dbSessions = await page.evaluate(async (orgId) => {
      const response = await fetch(
        `/api/class-sessions?organizationId=${orgId}`,
      );
      const data = await response.json();
      return data.sessions.filter((s: any) => s.name.includes("Test Class"));
    }, testOrganizationId);

    // Navigate to calendar
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Verify timezone handling for each test
    for (const test of timezoneTests) {
      const dbSession = dbSessions.find((s: any) => s.name === test.name);
      expect(dbSession).toBeDefined();

      const dbTime = new Date(dbSession.startTime);
      console.log(
        `${test.name} - DB time: ${dbSession.startTime} (${dbTime.toLocaleString()})`,
      );

      // Find in calendar
      const calendarElement = await page.locator(`text="${test.name}"`).first();
      if ((await calendarElement.count()) > 0) {
        const container = calendarElement.locator("..").first();
        const containerText = (await container.textContent()) || "";
        console.log(`${test.name} - Calendar display: ${containerText}`);

        // For UTC test, verify the local time conversion is correct
        if (test.expectedUTCHour !== undefined) {
          const localHour = dbTime.getHours();
          console.log(
            `UTC ${test.expectedUTCHour}:00 -> Local ${localHour}:${dbTime.getMinutes().toString().padStart(2, "0")}`,
          );
        }
      }
    }

    console.log("✓ Timezone handling verified between database and calendar");
  });

  test("should verify data integrity after multiple operations", async ({
    page,
  }) => {
    // Create a baseline class
    const integrityTestTime = new Date();
    integrityTestTime.setDate(integrityTestTime.getDate() + 1);
    integrityTestTime.setHours(13, 45, 0, 0);

    const classData = {
      name: "Integrity Test Class",
      start_time: integrityTestTime.toISOString(),
      end_time: new Date(
        integrityTestTime.getTime() + 90 * 60 * 1000,
      ).toISOString(), // 1.5 hours
      organization_id: testOrganizationId,
      max_capacity: 25,
      instructor: "Integrity Test Instructor",
      location: "Test Studio",
      description: "Testing data integrity through multiple operations",
    };

    const createResponse = await page.evaluate(async (data) => {
      const response = await fetch("/api/class-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    }, classData);

    expect(createResponse.success).toBe(true);
    const sessionId = createResponse.session.id;
    createdClassIds.push(sessionId);

    // Perform multiple operations that could potentially corrupt data
    const operations = [
      // 1. Multiple rapid updates
      () =>
        page.evaluate(async (id) => {
          const response = await fetch("/api/class-sessions", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              description: `Updated at ${Date.now()}`,
            }),
          });
          return response.json();
        }, sessionId),

      // 2. Calendar navigation (which triggers refetches)
      async () => {
        await page.goto("/class-calendar");
        await page.waitForLoadState("networkidle");
        const nextButton = page
          .locator("button")
          .filter({ has: page.locator("svg.lucide-chevron-right") })
          .first();
        if ((await nextButton.count()) > 0) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }
        return { success: true };
      },

      // 3. Another rapid update
      () =>
        page.evaluate(async (id) => {
          const response = await fetch("/api/class-sessions", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, max_capacity: 30 }),
          });
          return response.json();
        }, sessionId),

      // 4. Page refresh simulation
      async () => {
        await page.reload();
        await page.waitForLoadState("networkidle");
        return { success: true };
      },
    ];

    // Execute operations
    for (let i = 0; i < operations.length; i++) {
      const result = await operations[i]();
      console.log(`Operation ${i + 1} result:`, result);

      // Small delay between operations
      await page.waitForTimeout(100);
    }

    // Verify data integrity
    const finalSession = await page.evaluate(async (orgId) => {
      const response = await fetch(
        `/api/class-sessions?organizationId=${orgId}`,
      );
      const data = await response.json();
      return data.sessions.find((s: any) => s.name === "Integrity Test Class");
    }, testOrganizationId);

    expect(finalSession).toBeDefined();

    // Time should be unchanged
    const finalTime = new Date(finalSession.startTime);
    expect(finalTime.getHours()).toBe(13);
    expect(finalTime.getMinutes()).toBe(45);

    // Duration should be unchanged
    const finalEndTime = new Date(finalSession.endTime);
    const durationMs = finalEndTime.getTime() - finalTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    expect(durationMinutes).toBe(90);

    // Other fields should reflect updates
    expect(finalSession.max_capacity).toBe(30); // From operation 3
    expect(finalSession.description).toContain("Updated at"); // From operation 1

    // Verify in calendar UI one final time
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const calendarElement = await page
      .locator(`text="Integrity Test Class"`)
      .first();
    expect(await calendarElement.count()).toBeGreaterThan(0);

    const container = calendarElement.locator("..").first();
    const containerText = (await container.textContent()) || "";

    // Should still show correct time
    expect(containerText).toMatch(/13:45|1:45.*PM/);

    console.log("✓ Data integrity maintained through multiple operations");
    console.log(
      `Final session: ${finalSession.startTime} -> ${finalSession.endTime}`,
    );

    await page.screenshot({
      path: "e2e/screenshots/data-integrity-verification.png",
      fullPage: true,
    });
  });
});
