/**
 * Tests for AgentScheduler
 */

import { AgentScheduler } from '../scheduler';
import { parseExpression } from 'cron-parser';

// Mock dependencies
jest.mock('../task-queue', () => ({
  agentTaskQueue: {
    addTask: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis()
    })
  })
}));

describe('AgentScheduler', () => {
  let scheduler: AgentScheduler;

  beforeEach(() => {
    scheduler = new AgentScheduler();
    scheduler.resetMetrics();
  });

  afterEach(async () => {
    await scheduler.stop();
  });

  describe('Lifecycle Management', () => {
    test('should start scheduler', async () => {
      await scheduler.start();
      const status = scheduler.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.metrics.isRunning).toBe(true);
    });

    test('should stop scheduler', async () => {
      await scheduler.start();
      await scheduler.stop();
      const status = scheduler.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.metrics.isRunning).toBe(false);
    });

    test('should not start scheduler twice', async () => {
      await scheduler.start();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await scheduler.start();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[AgentScheduler] Scheduler already running'
      );

      consoleWarnSpy.mockRestore();
    });

    test('should not stop scheduler if not running', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await scheduler.stop();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[AgentScheduler] Scheduler not running'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Cron Expression Validation', () => {
    test('should validate valid cron expression', () => {
      expect(() => {
        scheduler.validateCronExpression('0 * * * *');
      }).not.toThrow();
    });

    test('should throw error for invalid cron expression', () => {
      expect(() => {
        scheduler.validateCronExpression('invalid cron');
      }).toThrow('Invalid cron expression');
    });

    test('should validate complex cron expressions', () => {
      const validExpressions = [
        '0 0 * * *', // Daily at midnight
        '*/15 * * * *', // Every 15 minutes
        '0 9 * * 1-5', // Weekdays at 9 AM
        '0 0 1 * *', // First day of month
        '30 8 * * 1' // Mondays at 8:30 AM
      ];

      validExpressions.forEach(expr => {
        expect(() => {
          scheduler.validateCronExpression(expr);
        }).not.toThrow();
      });
    });
  });

  describe('Cron Expression Description', () => {
    test('should describe simple cron expression', () => {
      const description = scheduler.describeCronExpression('0 * * * *');
      expect(description).toContain('hour');
    });

    test('should describe complex cron expression', () => {
      const description = scheduler.describeCronExpression('0 9 * * 1-5');
      expect(description.toLowerCase()).toContain('9');
    });

    test('should handle invalid cron expression', () => {
      const description = scheduler.describeCronExpression('invalid');
      expect(description).toBe('Invalid cron expression');
    });
  });

  describe('Next Run Calculation', () => {
    test('should calculate next run for hourly cron', () => {
      const nextRun = scheduler.calculateNextRun('0 * * * *', 'UTC');
      const now = new Date();

      expect(nextRun.getTime()).toBeGreaterThan(now.getTime());
      expect(nextRun.getMinutes()).toBe(0);
    });

    test('should calculate next run for daily cron', () => {
      const nextRun = scheduler.calculateNextRun('0 0 * * *', 'UTC');
      const now = new Date();

      expect(nextRun.getTime()).toBeGreaterThan(now.getTime());
      expect(nextRun.getUTCHours()).toBe(0);
      expect(nextRun.getUTCMinutes()).toBe(0);
    });

    test('should respect timezone in calculation', () => {
      const utcRun = scheduler.calculateNextRun('0 12 * * *', 'UTC');
      const estRun = scheduler.calculateNextRun('0 12 * * *', 'America/New_York');

      // Times should be different due to timezone
      expect(utcRun.getTime()).not.toBe(estRun.getTime());
    });

    test('should handle invalid timezone gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const nextRun = scheduler.calculateNextRun('0 * * * *', 'Invalid/Timezone');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid timezone')
      );
      expect(nextRun).toBeInstanceOf(Date);

      consoleWarnSpy.mockRestore();
    });

    test('should fallback to 1 hour for invalid cron', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const nextRun = scheduler.calculateNextRun('invalid', 'UTC');
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      // Should be approximately 1 hour from now (within 1 second tolerance)
      expect(Math.abs(nextRun.getTime() - oneHourFromNow.getTime())).toBeLessThan(1000);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Metrics Tracking', () => {
    test('should initialize with zero metrics', () => {
      const metrics = scheduler.getMetrics();

      expect(metrics.checksPerformed).toBe(0);
      expect(metrics.tasksQueued).toBe(0);
      expect(metrics.tasksFailed).toBe(0);
      expect(metrics.lastCheckTime).toBeNull();
      expect(metrics.nextCheckTime).toBeNull();
    });

    test('should reset metrics', () => {
      // Manually set some metrics
      scheduler['metrics'].checksPerformed = 10;
      scheduler['metrics'].tasksQueued = 5;
      scheduler['metrics'].tasksFailed = 2;

      scheduler.resetMetrics();

      const metrics = scheduler.getMetrics();
      expect(metrics.checksPerformed).toBe(0);
      expect(metrics.tasksQueued).toBe(0);
      expect(metrics.tasksFailed).toBe(0);
    });

    test('should preserve isRunning in metrics after reset', async () => {
      await scheduler.start();

      scheduler.resetMetrics();

      const metrics = scheduler.getMetrics();
      expect(metrics.isRunning).toBe(true);
    });
  });

  describe('Status Reporting', () => {
    test('should return complete status', () => {
      const status = scheduler.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('isChecking');
      expect(status).toHaveProperty('metrics');
      expect(status.metrics).toHaveProperty('checksPerformed');
      expect(status.metrics).toHaveProperty('tasksQueued');
      expect(status.metrics).toHaveProperty('tasksFailed');
    });

    test('should reflect running state in status', async () => {
      const statusBefore = scheduler.getStatus();
      expect(statusBefore.isRunning).toBe(false);

      await scheduler.start();

      const statusAfter = scheduler.getStatus();
      expect(statusAfter.isRunning).toBe(true);
    });
  });

  describe('Cron Parser Integration', () => {
    test('should use cron-parser for next run calculation', () => {
      const cronExpression = '0 12 * * *'; // Daily at noon
      const nextRun = scheduler.calculateNextRun(cronExpression, 'UTC');

      // Verify using cron-parser directly
      const interval = parseExpression(cronExpression, {
        currentDate: new Date(),
        tz: 'UTC'
      });
      const expectedNext = interval.next().toDate();

      // Should be within 1 second (accounting for execution time)
      expect(Math.abs(nextRun.getTime() - expectedNext.getTime())).toBeLessThan(1000);
    });

    test('should handle every 15 minutes cron', () => {
      const cronExpression = '*/15 * * * *';
      const nextRun = scheduler.calculateNextRun(cronExpression, 'UTC');
      const now = new Date();

      // Next run should be within 15 minutes
      expect(nextRun.getTime()).toBeGreaterThan(now.getTime());
      expect(nextRun.getTime()).toBeLessThan(now.getTime() + 15 * 60 * 1000);

      // Minutes should be 0, 15, 30, or 45
      expect([0, 15, 30, 45]).toContain(nextRun.getMinutes());
    });

    test('should handle weekly cron on Monday', () => {
      const cronExpression = '0 9 * * 1'; // Mondays at 9 AM
      const nextRun = scheduler.calculateNextRun(cronExpression, 'UTC');

      // Should be a Monday
      expect(nextRun.getUTCDay()).toBe(1);
      expect(nextRun.getUTCHours()).toBe(9);
      expect(nextRun.getUTCMinutes()).toBe(0);
    });

    test('should handle monthly cron', () => {
      const cronExpression = '0 0 1 * *'; // First day of month at midnight
      const nextRun = scheduler.calculateNextRun(cronExpression, 'UTC');

      // Should be the 1st of a month
      expect(nextRun.getUTCDate()).toBe(1);
      expect(nextRun.getUTCHours()).toBe(0);
      expect(nextRun.getUTCMinutes()).toBe(0);
    });
  });
});
