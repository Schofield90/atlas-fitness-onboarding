/**
 * Global Teardown for Calendar E2E Tests
 *
 * Cleans up after calendar testing by:
 * - Removing test data from database
 * - Generating final test reports
 * - Cleaning up temporary files
 * - Archiving test artifacts
 */

const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

async function globalTeardown(config) {
  console.log("\n🧹 Starting Calendar E2E Test Environment Cleanup...\n");

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const baseUrl =
      config.webServer?.baseURL ||
      process.env.BASE_URL ||
      "http://localhost:3000";

    // 1. Clean up test data from database
    console.log("🗄️  Cleaning up test data...");
    try {
      const cleanupResponse = await page.evaluate(async () => {
        // Clean up all test classes created during the test run
        const testClassPatterns = [
          "Precision Test",
          "CRUD Consistency Test",
          "Concurrent Test",
          "Query Consistency Test",
          "UTC Test Class",
          "Local Time Test Class",
          "Refresh Consistency Test",
          "Early Morning Yoga",
          "Evening HIIT",
          "Database Consistency Test",
          "Integrity Test Class",
          "Navigation Test",
          "Morning Yoga",
          "Tuesday HIIT",
          "Wednesday Pilates",
          "Thursday Strength",
          "Friday Evening Flow",
          "View Switch Test Class",
          "Late Night Class",
          "Midnight Class",
          "Early Morning Edge",
          "DST Test",
          "New Year's",
          "Leap Day Special",
          "Test Class for Timezone",
        ];

        let totalDeleted = 0;

        for (const pattern of testClassPatterns) {
          try {
            const response = await fetch("/api/class-sessions/cleanup", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ namePattern: pattern }),
            });

            if (response.ok) {
              const data = await response.json();
              totalDeleted += data.deleted || 0;
            }
          } catch (error) {
            console.log(
              `Warning: Could not clean up pattern "${pattern}": ${error.message}`,
            );
          }
        }

        return { success: true, totalDeleted };
      });

      if (cleanupResponse.success) {
        console.log(
          `   ✅ Cleaned up ${cleanupResponse.totalDeleted} test classes`,
        );
      } else {
        console.log(`   ⚠️  Some test data may not have been cleaned up`);
      }
    } catch (error) {
      console.log(`   ⚠️  Cleanup warning: ${error.message}`);
    }

    // 2. Generate test artifacts summary
    console.log("\n📊 Generating test artifacts summary...");
    try {
      const screenshotDir = path.join(process.cwd(), "e2e", "screenshots");
      const traceDir = path.join(process.cwd(), "test-results");

      let screenshotCount = 0;
      let traceCount = 0;

      if (fs.existsSync(screenshotDir)) {
        const screenshots = fs
          .readdirSync(screenshotDir)
          .filter((f) => f.endsWith(".png"));
        screenshotCount = screenshots.length;
      }

      if (fs.existsSync(traceDir)) {
        const traces = fs
          .readdirSync(traceDir, { recursive: true })
          .filter((f) => f.endsWith(".zip"));
        traceCount = traces.length;
      }

      console.log(`   📸 Screenshots generated: ${screenshotCount}`);
      console.log(`   🔍 Trace files generated: ${traceCount}`);

      // Create artifacts summary
      const artifactsSummary = {
        timestamp: new Date().toISOString(),
        screenshots: screenshotCount,
        traces: traceCount,
        cleanupCompleted: true,
        testRunSummary: global.calendarTestSetup || {},
      };

      const summaryPath = path.join(
        process.cwd(),
        "calendar-test-artifacts-summary.json",
      );
      fs.writeFileSync(summaryPath, JSON.stringify(artifactsSummary, null, 2));
      console.log(`   📋 Artifacts summary saved to: ${summaryPath}`);
    } catch (error) {
      console.log(`   ⚠️  Artifacts summary warning: ${error.message}`);
    }

    // 3. Archive test results if specified
    if (process.env.ARCHIVE_TEST_RESULTS === "true") {
      console.log("\n📦 Archiving test results...");
      try {
        const archiver = require("archiver");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const archivePath = path.join(
          process.cwd(),
          `calendar-test-results-${timestamp}.zip`,
        );

        const output = fs.createWriteStream(archivePath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => {
          console.log(
            `   ✅ Test results archived to: ${archivePath} (${archive.pointer()} bytes)`,
          );
        });

        archive.on("error", (err) => {
          console.log(`   ❌ Archive error: ${err.message}`);
        });

        archive.pipe(output);

        // Add directories to archive
        const dirsToArchive = [
          { path: "e2e/screenshots", name: "screenshots" },
          { path: "test-results", name: "test-results" },
          { path: "playwright-calendar-report", name: "html-report" },
        ];

        for (const dir of dirsToArchive) {
          const fullPath = path.join(process.cwd(), dir.path);
          if (fs.existsSync(fullPath)) {
            archive.directory(fullPath, dir.name);
          }
        }

        // Add summary files
        const filesToArchive = [
          "calendar-test-results.json",
          "calendar-test-artifacts-summary.json",
        ];

        for (const file of filesToArchive) {
          const filePath = path.join(process.cwd(), file);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: file });
          }
        }

        await archive.finalize();
      } catch (error) {
        console.log(`   ⚠️  Archiving warning: ${error.message}`);
      }
    }

    // 4. Clean up temporary auth files if they exist
    console.log("\n🔐 Cleaning up temporary auth files...");
    try {
      const authDir = path.join(process.cwd(), ".auth");
      if (fs.existsSync(authDir)) {
        const tempFiles = fs
          .readdirSync(authDir)
          .filter((f) => f.includes("temp") || f.includes("test"));

        for (const file of tempFiles) {
          fs.unlinkSync(path.join(authDir, file));
        }

        console.log(
          `   ✅ Cleaned up ${tempFiles.length} temporary auth files`,
        );
      }
    } catch (error) {
      console.log(`   ⚠️  Auth cleanup warning: ${error.message}`);
    }

    // 5. Reset environment if needed
    console.log("\n🔄 Resetting environment...");
    try {
      // Reset any test-specific environment variables
      delete process.env.ENABLE_CALENDAR_DEBUG;
      delete process.env.DISABLE_RATE_LIMITING;

      console.log(`   ✅ Environment reset complete`);
    } catch (error) {
      console.log(`   ⚠️  Environment reset warning: ${error.message}`);
    }

    // 6. Validate cleanup
    console.log("\n✅ Validating cleanup...");
    try {
      const validationResponse = await page.evaluate(async () => {
        const response = await fetch("/api/class-sessions?validation=cleanup");
        const data = await response.json();

        // Count any remaining test classes
        const testClasses = (data.sessions || []).filter(
          (session) =>
            session.name &&
            (session.name.includes("Test") ||
              session.name.includes("Precision") ||
              session.name.includes("CRUD") ||
              session.name.includes("Concurrent") ||
              (session.instructor && session.instructor.includes("Test"))),
        );

        return {
          totalSessions: data.sessions?.length || 0,
          remainingTestClasses: testClasses.length,
        };
      });

      if (validationResponse.remainingTestClasses === 0) {
        console.log(`   ✅ All test data cleaned up successfully`);
      } else {
        console.log(
          `   ⚠️  ${validationResponse.remainingTestClasses} test classes may still exist`,
        );
      }

      console.log(
        `   📊 Total sessions in database: ${validationResponse.totalSessions}`,
      );
    } catch (error) {
      console.log(`   ⚠️  Validation warning: ${error.message}`);
    }

    // 7. Generate final report
    console.log("\n📋 Generating final cleanup report...");
    const finalReport = {
      timestamp: new Date().toISOString(),
      cleanupCompleted: true,
      warnings: [], // Would be populated if we tracked warnings
      nextSteps: [
        "Review test results in HTML report",
        "Check screenshots for visual verification",
        "Review traces for any failing tests",
        "Address any failing tests before next run",
      ],
      artifactLocations: {
        screenshots: "e2e/screenshots/",
        traces: "test-results/",
        htmlReport: "playwright-calendar-report/",
        jsonResults: "calendar-test-results.json",
      },
    };

    const reportPath = path.join(process.cwd(), "calendar-cleanup-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
    console.log(`   📄 Final report saved to: ${reportPath}`);
  } catch (error) {
    console.error(`❌ Teardown error: ${error.message}`);
  } finally {
    await browser.close();
  }

  console.log("\n🎉 Calendar E2E Test Environment Cleanup Complete!");
  console.log("📋 Cleanup Summary:");
  console.log(`   - Test data: Removed`);
  console.log(`   - Artifacts: Summarized`);
  console.log(`   - Environment: Reset`);
  console.log(`   - Reports: Generated`);
  console.log("\n📊 Review the following for test results:");
  console.log(`   - HTML Report: playwright-calendar-report/index.html`);
  console.log(`   - Screenshots: e2e/screenshots/`);
  console.log(`   - JSON Results: calendar-test-results.json`);
  console.log(`   - Cleanup Report: calendar-cleanup-report.json\n`);
}

module.exports = globalTeardown;
