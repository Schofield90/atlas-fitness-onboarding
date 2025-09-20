/**
 * Custom Calendar Test Reporter
 *
 * Provides specialized reporting for calendar E2E tests with metrics
 * specific to time display accuracy, navigation consistency, and
 * timezone handling verification.
 */

class CalendarTestReporter {
  constructor(options) {
    this.options = options || {};
    this.results = {
      timeDisplayTests: [],
      navigationTests: [],
      timezoneTests: [],
      databaseConsistencyTests: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        timeDisplayAccuracy: 0,
        navigationConsistency: 0,
        timezoneHandling: 0,
        databaseConsistency: 0,
      },
    };
    this.startTime = Date.now();
  }

  onBegin(config, suite) {
    console.log(`\n🕐 Starting Calendar E2E Test Suite`);
    console.log(`📅 Test Configuration:`);
    console.log(
      `   - Timezone: ${config.projects[0]?.use?.timezoneId || "System Default"}`,
    );
    console.log(
      `   - Viewport: ${config.projects[0]?.use?.viewport?.width}x${config.projects[0]?.use?.viewport?.height}`,
    );
    console.log(`   - Workers: ${config.workers}`);
    console.log(`   - Retries: ${config.retries}`);
    console.log(`   - Total Tests: ${suite.allTests().length}\n`);
  }

  onTestBegin(test) {
    const testCategory = this.categorizeTest(test.title);
    console.log(`🧪 ${testCategory.emoji} Starting: ${test.title}`);
  }

  onTestEnd(test, result) {
    const testCategory = this.categorizeTest(test.title);
    const duration = result.duration;
    const status = result.status;

    // Update summary
    this.results.summary.totalTests++;
    this.results.summary.duration += duration;

    if (status === "passed") {
      this.results.summary.passed++;
      console.log(
        `✅ ${testCategory.emoji} PASSED: ${test.title} (${duration}ms)`,
      );
    } else if (status === "failed") {
      this.results.summary.failed++;
      console.log(
        `❌ ${testCategory.emoji} FAILED: ${test.title} (${duration}ms)`,
      );
      if (result.error) {
        console.log(`   Error: ${result.error.message}`);
      }
    } else if (status === "skipped") {
      this.results.summary.skipped++;
      console.log(`⏭️  ${testCategory.emoji} SKIPPED: ${test.title}`);
    }

    // Categorize results
    const testResult = {
      title: test.title,
      status,
      duration,
      category: testCategory.name,
      error: result.error?.message || null,
      retries: result.retry,
    };

    switch (testCategory.name) {
      case "timeDisplay":
        this.results.timeDisplayTests.push(testResult);
        break;
      case "navigation":
        this.results.navigationTests.push(testResult);
        break;
      case "timezone":
        this.results.timezoneTests.push(testResult);
        break;
      case "database":
        this.results.databaseConsistencyTests.push(testResult);
        break;
    }
  }

  onEnd(result) {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    this.calculateAccuracyMetrics();
    this.generateSummaryReport(totalDuration);
    this.generateDetailedReport();
    this.generateRecommendations();
  }

  categorizeTest(title) {
    const categories = [
      {
        name: "timeDisplay",
        emoji: "🕐",
        keywords: [
          "6am",
          "6pm",
          "time display",
          "displays correctly",
          "multiple classes",
        ],
      },
      {
        name: "navigation",
        emoji: "🧭",
        keywords: [
          "navigation",
          "navigate",
          "week",
          "month",
          "today button",
          "switching views",
        ],
      },
      {
        name: "timezone",
        emoji: "🌍",
        keywords: [
          "timezone",
          "midnight",
          "DST",
          "daylight saving",
          "year boundary",
          "leap year",
        ],
      },
      {
        name: "database",
        emoji: "🗄️",
        keywords: [
          "database",
          "consistency",
          "CRUD",
          "concurrent",
          "integrity",
        ],
      },
    ];

    for (const category of categories) {
      if (
        category.keywords.some((keyword) =>
          title.toLowerCase().includes(keyword.toLowerCase()),
        )
      ) {
        return category;
      }
    }

    return { name: "general", emoji: "🔧" };
  }

  calculateAccuracyMetrics() {
    const calculateCategoryAccuracy = (tests) => {
      if (tests.length === 0) return 0;
      const passed = tests.filter((t) => t.status === "passed").length;
      return (passed / tests.length) * 100;
    };

    this.results.summary.timeDisplayAccuracy = calculateCategoryAccuracy(
      this.results.timeDisplayTests,
    );
    this.results.summary.navigationConsistency = calculateCategoryAccuracy(
      this.results.navigationTests,
    );
    this.results.summary.timezoneHandling = calculateCategoryAccuracy(
      this.results.timezoneTests,
    );
    this.results.summary.databaseConsistency = calculateCategoryAccuracy(
      this.results.databaseConsistencyTests,
    );
  }

  generateSummaryReport(totalDuration) {
    console.log(`\n📊 CALENDAR E2E TEST SUMMARY`);
    console.log(`${"=".repeat(50)}`);
    console.log(`⏱️  Total Duration: ${this.formatDuration(totalDuration)}`);
    console.log(`📈 Overall Results:`);
    console.log(`   ✅ Passed: ${this.results.summary.passed}`);
    console.log(`   ❌ Failed: ${this.results.summary.failed}`);
    console.log(`   ⏭️  Skipped: ${this.results.summary.skipped}`);
    console.log(
      `   📊 Pass Rate: ${((this.results.summary.passed / this.results.summary.totalTests) * 100).toFixed(1)}%\n`,
    );

    console.log(`🎯 ACCURACY METRICS:`);
    console.log(
      `   🕐 Time Display Accuracy: ${this.results.summary.timeDisplayAccuracy.toFixed(1)}%`,
    );
    console.log(
      `   🧭 Navigation Consistency: ${this.results.summary.navigationConsistency.toFixed(1)}%`,
    );
    console.log(
      `   🌍 Timezone Handling: ${this.results.summary.timezoneHandling.toFixed(1)}%`,
    );
    console.log(
      `   🗄️  Database Consistency: ${this.results.summary.databaseConsistency.toFixed(1)}%\n`,
    );
  }

  generateDetailedReport() {
    console.log(`📋 DETAILED RESULTS BY CATEGORY:`);
    console.log(`${"=".repeat(50)}`);

    const categories = [
      {
        name: "Time Display Tests",
        tests: this.results.timeDisplayTests,
        emoji: "🕐",
      },
      {
        name: "Navigation Tests",
        tests: this.results.navigationTests,
        emoji: "🧭",
      },
      {
        name: "Timezone Tests",
        tests: this.results.timezoneTests,
        emoji: "🌍",
      },
      {
        name: "Database Consistency Tests",
        tests: this.results.databaseConsistencyTests,
        emoji: "🗄️",
      },
    ];

    categories.forEach((category) => {
      if (category.tests.length > 0) {
        console.log(`\n${category.emoji} ${category.name}:`);

        const passed = category.tests.filter(
          (t) => t.status === "passed",
        ).length;
        const failed = category.tests.filter(
          (t) => t.status === "failed",
        ).length;
        const skipped = category.tests.filter(
          (t) => t.status === "skipped",
        ).length;

        console.log(
          `   Summary: ${passed} passed, ${failed} failed, ${skipped} skipped`,
        );

        if (failed > 0) {
          console.log(`   Failed Tests:`);
          category.tests
            .filter((t) => t.status === "failed")
            .forEach((test) => {
              console.log(`     ❌ ${test.title}`);
              if (test.error) {
                console.log(`        Error: ${test.error}`);
              }
              if (test.retries > 0) {
                console.log(`        Retries: ${test.retries}`);
              }
            });
        }

        // Show slowest tests in category
        const slowestTests = category.tests
          .filter((t) => t.status === "passed")
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 2);

        if (slowestTests.length > 0) {
          console.log(`   Slowest Tests:`);
          slowestTests.forEach((test) => {
            console.log(
              `     🐌 ${test.title} (${this.formatDuration(test.duration)})`,
            );
          });
        }
      }
    });
  }

  generateRecommendations() {
    console.log(`\n💡 RECOMMENDATIONS:`);
    console.log(`${"=".repeat(50)}`);

    const recommendations = [];

    // Time Display Recommendations
    if (this.results.summary.timeDisplayAccuracy < 95) {
      recommendations.push(
        `🕐 Time Display: ${this.results.summary.timeDisplayAccuracy.toFixed(1)}% accuracy is below target (95%)`,
      );
      recommendations.push(
        `   - Review timezone configuration in calendar components`,
      );
      recommendations.push(
        `   - Check date/time parsing logic for 6am and 6pm classes`,
      );
      recommendations.push(`   - Verify 12-hour vs 24-hour format handling`);
    }

    // Navigation Recommendations
    if (this.results.summary.navigationConsistency < 90) {
      recommendations.push(
        `🧭 Navigation: ${this.results.summary.navigationConsistency.toFixed(1)}% consistency is below target (90%)`,
      );
      recommendations.push(`   - Review state management during navigation`);
      recommendations.push(
        `   - Check for race conditions in calendar data fetching`,
      );
      recommendations.push(`   - Verify URL state synchronization`);
    }

    // Timezone Recommendations
    if (this.results.summary.timezoneHandling < 85) {
      recommendations.push(
        `🌍 Timezone: ${this.results.summary.timezoneHandling.toFixed(1)}% handling is below target (85%)`,
      );
      recommendations.push(`   - Review DST transition handling`);
      recommendations.push(`   - Check midnight boundary calculations`);
      recommendations.push(`   - Verify browser timezone detection`);
    }

    // Database Recommendations
    if (this.results.summary.databaseConsistency < 98) {
      recommendations.push(
        `🗄️  Database: ${this.results.summary.databaseConsistency.toFixed(1)}% consistency is below target (98%)`,
      );
      recommendations.push(`   - Review database timezone storage`);
      recommendations.push(`   - Check API response time formatting`);
      recommendations.push(`   - Verify CRUD operation time handling`);
    }

    // Performance Recommendations
    const avgDuration =
      this.results.summary.duration / this.results.summary.totalTests;
    if (avgDuration > 60000) {
      // 60 seconds
      recommendations.push(
        `⚡ Performance: Average test duration (${this.formatDuration(avgDuration)}) is high`,
      );
      recommendations.push(`   - Consider optimizing calendar data loading`);
      recommendations.push(`   - Review wait times in navigation tests`);
      recommendations.push(`   - Check for unnecessary API calls`);
    }

    // Flaky Test Recommendations
    const retriedTests = this.getAllTests().filter((t) => t.retries > 0);
    if (retriedTests.length > 0) {
      recommendations.push(
        `🔄 Flaky Tests: ${retriedTests.length} tests required retries`,
      );
      recommendations.push(`   - Review timing-sensitive assertions`);
      recommendations.push(`   - Add better wait conditions`);
      recommendations.push(
        `   - Consider increasing timeouts for slow operations`,
      );
    }

    if (recommendations.length === 0) {
      console.log(`🎉 All metrics are within acceptable ranges!`);
      console.log(
        `   - Time Display Accuracy: ${this.results.summary.timeDisplayAccuracy.toFixed(1)}% ≥ 95% ✅`,
      );
      console.log(
        `   - Navigation Consistency: ${this.results.summary.navigationConsistency.toFixed(1)}% ≥ 90% ✅`,
      );
      console.log(
        `   - Timezone Handling: ${this.results.summary.timezoneHandling.toFixed(1)}% ≥ 85% ✅`,
      );
      console.log(
        `   - Database Consistency: ${this.results.summary.databaseConsistency.toFixed(1)}% ≥ 98% ✅`,
      );
    } else {
      recommendations.forEach((rec) => console.log(rec));
    }

    console.log(`\n📝 Test artifacts saved to:`);
    console.log(`   - Screenshots: e2e/screenshots/`);
    console.log(`   - Traces: test-results/`);
    console.log(`   - HTML Report: playwright-calendar-report/`);
    console.log(`   - JSON Results: calendar-test-results.json\n`);
  }

  getAllTests() {
    return [
      ...this.results.timeDisplayTests,
      ...this.results.navigationTests,
      ...this.results.timezoneTests,
      ...this.results.databaseConsistencyTests,
    ];
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}

module.exports = CalendarTestReporter;
