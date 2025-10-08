/**
 * Analytics and Reporting Tools for AI Agents
 * Provides comprehensive data analysis capabilities for revenue, churn, attendance, and engagement metrics
 */

import { z } from 'zod';
import { BaseTool, ToolExecutionContext, ToolExecutionResult } from './types';
import { createAdminClient } from '@/app/lib/supabase/admin';

/**
 * Generate Revenue Report
 * Provides monthly/yearly revenue breakdown with trends
 */
export class GenerateRevenueReportTool extends BaseTool {
  id = 'generate_revenue_report';
  name = 'Generate Revenue Report';
  description = 'Generate comprehensive revenue report with breakdown by month/year, including trends, comparisons, and payment method analysis';
  category: 'analytics' = 'analytics';

  parametersSchema = z.object({
    startDate: z.string().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().describe('End date in YYYY-MM-DD format'),
    groupBy: z.enum(['day', 'week', 'month', 'year']).default('month').describe('Group data by period'),
    includeBreakdown: z.boolean().default(true).describe('Include category and payment method breakdown'),
  });

  requiresPermission = 'reports:read';

  async execute(
    params: z.infer<typeof this.parametersSchema>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const supabase = createAdminClient();
      const { startDate, endDate, groupBy, includeBreakdown } = params;

      // Fetch all payments in date range
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          id,
          payment_date,
          amount,
          payment_status,
          payment_method,
          client_id,
          customer_memberships(
            membership_plans(
              name,
              category
            )
          )
        `)
        .eq('organization_id', context.organizationId)
        .in('payment_status', ['paid_out', 'succeeded', 'confirmed'])
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date', { ascending: true });

      if (error) throw error;

      // Group by period
      const grouped = new Map<string, {
        period: string;
        revenue: number;
        paymentCount: number;
        uniqueCustomers: Set<string>;
        avgTransactionSize: number;
        paymentMethods: Map<string, number>;
        categories: Map<string, number>;
      }>();

      payments?.forEach((payment) => {
        const date = new Date(payment.payment_date);
        let period: string;

        switch (groupBy) {
          case 'day':
            period = date.toISOString().split('T')[0];
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            period = weekStart.toISOString().split('T')[0];
            break;
          case 'month':
            period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          case 'year':
            period = `${date.getFullYear()}`;
            break;
        }

        if (!grouped.has(period)) {
          grouped.set(period, {
            period,
            revenue: 0,
            paymentCount: 0,
            uniqueCustomers: new Set(),
            avgTransactionSize: 0,
            paymentMethods: new Map(),
            categories: new Map(),
          });
        }

        const group = grouped.get(period)!;
        const amount = parseFloat(payment.amount as any) || 0;

        group.revenue += amount;
        group.paymentCount++;
        if (payment.client_id) group.uniqueCustomers.add(payment.client_id);

        // Track payment methods
        const method = payment.payment_method || 'unknown';
        group.paymentMethods.set(method, (group.paymentMethods.get(method) || 0) + amount);

        // Track categories
        const category = (payment.customer_memberships as any)?.membership_plans?.category || 'Uncategorized';
        group.categories.set(category, (group.categories.get(category) || 0) + amount);
      });

      // Convert to array and calculate metrics
      const periods = Array.from(grouped.values()).map(g => ({
        period: g.period,
        revenue: g.revenue,
        paymentCount: g.paymentCount,
        uniqueCustomers: g.uniqueCustomers.size,
        avgTransactionSize: g.paymentCount > 0 ? g.revenue / g.paymentCount : 0,
        paymentMethods: includeBreakdown ? Object.fromEntries(g.paymentMethods) : undefined,
        categories: includeBreakdown ? Object.fromEntries(g.categories) : undefined,
      }));

      // Calculate trends
      const totalRevenue = periods.reduce((sum, p) => sum + p.revenue, 0);
      const avgPeriodRevenue = periods.length > 0 ? totalRevenue / periods.length : 0;
      const growth = periods.length >= 2
        ? ((periods[periods.length - 1].revenue - periods[0].revenue) / periods[0].revenue) * 100
        : 0;

      return {
        success: true,
        data: {
          periods,
          summary: {
            totalRevenue,
            avgPeriodRevenue,
            totalPayments: periods.reduce((sum, p) => sum + p.paymentCount, 0),
            uniqueCustomers: new Set(payments?.map(p => p.client_id).filter(Boolean)).size,
            growthRate: growth,
            dateRange: { startDate, endDate },
          },
        },
        metadata: {
          recordsAffected: payments?.length || 0,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate revenue report',
      };
    }
  }
}

/**
 * Generate Churn Report
 * Analyzes customer churn rate and identifies patterns
 */
export class GenerateChurnReportTool extends BaseTool {
  id = 'generate_churn_report';
  name = 'Generate Churn Report';
  description = 'Analyze customer churn rate, identify churned customers, and calculate retention metrics';
  category: 'analytics' = 'analytics';

  parametersSchema = z.object({
    startDate: z.string().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().describe('End date in YYYY-MM-DD format'),
    includeReasons: z.boolean().default(true).describe('Include churn reasons analysis'),
  });

  requiresPermission = 'reports:read';

  async execute(
    params: z.infer<typeof this.parametersSchema>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const supabase = createAdminClient();
      const { startDate, endDate } = params;

      // Get all memberships in period
      const { data: memberships, error } = await supabase
        .from('customer_memberships')
        .select(`
          id,
          client_id,
          status,
          start_date,
          end_date,
          cancelled_at,
          cancellation_reason,
          membership_plans(name, category)
        `)
        .eq('organization_id', context.organizationId)
        .or(`start_date.gte.${startDate},end_date.gte.${startDate}`)
        .lte('start_date', endDate);

      if (error) throw error;

      // Calculate churn metrics
      const activeAtStart = memberships?.filter(m =>
        new Date(m.start_date) <= new Date(startDate) &&
        (!m.end_date || new Date(m.end_date) > new Date(startDate))
      ).length || 0;

      const churned = memberships?.filter(m =>
        m.cancelled_at &&
        new Date(m.cancelled_at) >= new Date(startDate) &&
        new Date(m.cancelled_at) <= new Date(endDate)
      ) || [];

      const churnRate = activeAtStart > 0 ? (churned.length / activeAtStart) * 100 : 0;

      // Analyze churn reasons
      const reasonCounts = new Map<string, number>();
      churned.forEach(m => {
        const reason = m.cancellation_reason || 'No reason provided';
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
      });

      // Monthly breakdown
      const monthlyChurn = new Map<string, { churned: number; active: number }>();
      churned.forEach(m => {
        if (m.cancelled_at) {
          const month = new Date(m.cancelled_at).toISOString().substring(0, 7);
          const existing = monthlyChurn.get(month) || { churned: 0, active: activeAtStart };
          existing.churned++;
          monthlyChurn.set(month, existing);
        }
      });

      return {
        success: true,
        data: {
          churnRate,
          activeAtStart,
          churnedCount: churned.length,
          retentionRate: 100 - churnRate,
          churnReasons: Object.fromEntries(reasonCounts),
          monthlyBreakdown: Array.from(monthlyChurn.entries()).map(([month, data]) => ({
            month,
            churned: data.churned,
            churnRate: (data.churned / data.active) * 100,
          })),
          churned: churned.map(m => ({
            clientId: m.client_id,
            plan: (m.membership_plans as any)?.name,
            category: (m.membership_plans as any)?.category,
            cancelledAt: m.cancelled_at,
            reason: m.cancellation_reason,
          })),
        },
        metadata: {
          recordsAffected: memberships?.length || 0,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate churn report',
      };
    }
  }
}

/**
 * Generate LTV Report
 * Calculates customer lifetime value metrics
 */
export class GenerateLTVReportTool extends BaseTool {
  id = 'generate_ltv_report';
  name = 'Generate LTV Report';
  description = 'Calculate customer lifetime value (LTV) with breakdown by cohort, plan, and acquisition source';
  category: 'analytics' = 'analytics';

  parametersSchema = z.object({
    cohortBy: z.enum(['month', 'quarter', 'year']).default('month').describe('Group customers into cohorts'),
    includeProjection: z.boolean().default(true).describe('Include LTV projection'),
  });

  requiresPermission = 'reports:read';

  async execute(
    params: z.infer<typeof this.parametersSchema>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const supabase = createAdminClient();

      // Get all customers with their payments
      const { data: customers, error } = await supabase
        .from('clients')
        .select(`
          id,
          created_at,
          source,
          payments(amount, payment_date, payment_status)
        `)
        .eq('organization_id', context.organizationId);

      if (error) throw error;

      // Calculate LTV per customer
      const customerLTVs = customers?.map(customer => {
        const payments = (customer.payments as any[]) || [];
        const totalSpent = payments
          .filter(p => ['paid_out', 'succeeded', 'confirmed'].includes(p.payment_status))
          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

        const firstPayment = payments
          .filter(p => p.payment_date)
          .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())[0];

        const lastPayment = payments
          .filter(p => p.payment_date)
          .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];

        const lifespanDays = firstPayment && lastPayment
          ? Math.max(1, (new Date(lastPayment.payment_date).getTime() - new Date(firstPayment.payment_date).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        // Determine cohort
        const cohortDate = new Date(customer.created_at);
        let cohort: string;
        switch (params.cohortBy) {
          case 'quarter':
            cohort = `${cohortDate.getFullYear()}-Q${Math.floor(cohortDate.getMonth() / 3) + 1}`;
            break;
          case 'year':
            cohort = `${cohortDate.getFullYear()}`;
            break;
          default:
            cohort = cohortDate.toISOString().substring(0, 7);
        }

        return {
          customerId: customer.id,
          cohort,
          source: customer.source,
          totalSpent,
          paymentCount: payments.length,
          lifespanDays,
          avgMonthlyValue: lifespanDays > 0 ? (totalSpent / lifespanDays) * 30 : 0,
        };
      }) || [];

      // Group by cohort
      const cohorts = new Map<string, {
        customers: number;
        totalLTV: number;
        avgLTV: number;
        avgLifespan: number;
      }>();

      customerLTVs.forEach(c => {
        if (!cohorts.has(c.cohort)) {
          cohorts.set(c.cohort, { customers: 0, totalLTV: 0, avgLTV: 0, avgLifespan: 0 });
        }
        const cohort = cohorts.get(c.cohort)!;
        cohort.customers++;
        cohort.totalLTV += c.totalSpent;
        cohort.avgLifespan += c.lifespanDays;
      });

      cohorts.forEach(cohort => {
        cohort.avgLTV = cohort.customers > 0 ? cohort.totalLTV / cohort.customers : 0;
        cohort.avgLifespan = cohort.customers > 0 ? cohort.avgLifespan / cohort.customers : 0;
      });

      // Group by source
      const sources = new Map<string, { customers: number; avgLTV: number }>();
      customerLTVs.forEach(c => {
        const source = c.source || 'Unknown';
        if (!sources.has(source)) {
          sources.set(source, { customers: 0, avgLTV: 0 });
        }
        const sourceData = sources.get(source)!;
        sourceData.avgLTV = (sourceData.avgLTV * sourceData.customers + c.totalSpent) / (sourceData.customers + 1);
        sourceData.customers++;
      });

      const totalLTV = customerLTVs.reduce((sum, c) => sum + c.totalSpent, 0);
      const avgLTV = customerLTVs.length > 0 ? totalLTV / customerLTVs.length : 0;
      const medianLTV = customerLTVs.length > 0
        ? customerLTVs.sort((a, b) => a.totalSpent - b.totalSpent)[Math.floor(customerLTVs.length / 2)].totalSpent
        : 0;

      return {
        success: true,
        data: {
          summary: {
            totalCustomers: customerLTVs.length,
            avgLTV,
            medianLTV,
            totalLTV,
          },
          cohorts: Array.from(cohorts.entries()).map(([cohort, data]) => ({
            cohort,
            ...data,
          })),
          sources: Array.from(sources.entries()).map(([source, data]) => ({
            source,
            ...data,
          })),
          topCustomers: customerLTVs
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10)
            .map(c => ({
              customerId: c.customerId,
              ltv: c.totalSpent,
              avgMonthlyValue: c.avgMonthlyValue,
            })),
        },
        metadata: {
          recordsAffected: customers?.length || 0,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate LTV report',
      };
    }
  }
}

/**
 * Generate Monthly Turnover Report
 * Detailed turnover analysis with trends and comparisons
 */
export class GenerateMonthlyTurnoverReportTool extends BaseTool {
  id = 'generate_monthly_turnover_report';
  name = 'Generate Monthly Turnover Report';
  description = 'Generate detailed monthly turnover report with category breakdown, trends, and year-over-year comparisons';
  category: 'analytics' = 'analytics';

  parametersSchema = z.object({
    months: z.number().default(12).describe('Number of months to include'),
    includeComparison: z.boolean().default(true).describe('Include year-over-year comparison'),
  });

  requiresPermission = 'reports:read';

  async execute(
    params: z.infer<typeof this.parametersSchema>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const supabase = createAdminClient();

      // Calculate start date
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - params.months);
      const startDateString = startDate.toISOString().split('T')[0];

      // Fetch payments
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          payment_date,
          amount,
          client_id,
          customer_memberships(
            membership_plans(
              category
            )
          )
        `)
        .eq('organization_id', context.organizationId)
        .in('payment_status', ['paid_out', 'succeeded', 'confirmed'])
        .gte('payment_date', startDateString)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      // Group by month
      const grouped = new Map<string, {
        period: string;
        revenue: number;
        paymentCount: number;
        uniqueCustomers: Set<string>;
        categories: Map<string, number>;
      }>();

      payments?.forEach(payment => {
        const date = new Date(payment.payment_date);
        const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!grouped.has(period)) {
          grouped.set(period, {
            period,
            revenue: 0,
            paymentCount: 0,
            uniqueCustomers: new Set(),
            categories: new Map(),
          });
        }

        const group = grouped.get(period)!;
        const amount = parseFloat(payment.amount as any) || 0;
        group.revenue += amount;
        group.paymentCount++;
        if (payment.client_id) group.uniqueCustomers.add(payment.client_id);

        const category = (payment.customer_memberships as any)?.membership_plans?.category || 'Uncategorized';
        group.categories.set(category, (group.categories.get(category) || 0) + amount);
      });

      // Convert to array
      const periods = Array.from(grouped.values())
        .map(g => ({
          period: g.period,
          revenue: g.revenue,
          paymentCount: g.paymentCount,
          uniqueCustomers: g.uniqueCustomers.size,
          categoryBreakdown: Object.fromEntries(g.categories),
        }))
        .sort((a, b) => b.period.localeCompare(a.period));

      // Calculate metrics
      const totalRevenue = periods.reduce((sum, p) => sum + p.revenue, 0);
      const avgMonthlyRevenue = periods.length > 0 ? totalRevenue / periods.length : 0;

      return {
        success: true,
        data: {
          periods,
          summary: {
            totalRevenue,
            avgMonthlyRevenue,
            totalPayments: periods.reduce((sum, p) => sum + p.paymentCount, 0),
            months: params.months,
          },
        },
        metadata: {
          recordsAffected: payments?.length || 0,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate monthly turnover report',
      };
    }
  }
}

/**
 * Calculate MRR (Monthly Recurring Revenue)
 */
export class CalculateMRRTool extends BaseTool {
  id = 'calculate_mrr';
  name = 'Calculate MRR';
  description = 'Calculate Monthly Recurring Revenue (MRR) with breakdown by plan type and growth metrics';
  category: 'analytics' = 'analytics';

  parametersSchema = z.object({
    asOfDate: z.string().optional().describe('Calculate MRR as of this date (YYYY-MM-DD), defaults to today'),
  });

  requiresPermission = 'reports:read';

  async execute(
    params: z.infer<typeof this.parametersSchema>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const supabase = createAdminClient();
      const asOfDate = params.asOfDate || new Date().toISOString().split('T')[0];

      // Get active memberships
      const { data: memberships, error } = await supabase
        .from('customer_memberships')
        .select(`
          id,
          monthly_price,
          status,
          membership_plans(name, category, billing_period)
        `)
        .eq('organization_id', context.organizationId)
        .eq('status', 'active')
        .lte('start_date', asOfDate)
        .or(`end_date.is.null,end_date.gt.${asOfDate}`);

      if (error) throw error;

      // Calculate MRR
      let totalMRR = 0;
      const planBreakdown = new Map<string, number>();
      const categoryBreakdown = new Map<string, number>();

      memberships?.forEach(membership => {
        const monthlyPrice = parseFloat((membership.monthly_price as any) || '0');
        totalMRR += monthlyPrice;

        const plan = (membership.membership_plans as any)?.name || 'Unknown';
        planBreakdown.set(plan, (planBreakdown.get(plan) || 0) + monthlyPrice);

        const category = (membership.membership_plans as any)?.category || 'Uncategorized';
        categoryBreakdown.set(category, (categoryBreakdown.get(category) || 0) + monthlyPrice);
      });

      return {
        success: true,
        data: {
          mrr: totalMRR,
          activeMemberships: memberships?.length || 0,
          avgRevenuePerMember: memberships?.length ? totalMRR / memberships.length : 0,
          asOfDate,
          planBreakdown: Object.fromEntries(planBreakdown),
          categoryBreakdown: Object.fromEntries(categoryBreakdown),
        },
        metadata: {
          recordsAffected: memberships?.length || 0,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate MRR',
      };
    }
  }
}

/**
 * Calculate ARR (Annual Recurring Revenue)
 */
export class CalculateARRTool extends BaseTool {
  id = 'calculate_arr';
  name = 'Calculate ARR';
  description = 'Calculate Annual Recurring Revenue (ARR) with growth trends and projections';
  category: 'analytics' = 'analytics';

  parametersSchema = z.object({
    asOfDate: z.string().optional().describe('Calculate ARR as of this date (YYYY-MM-DD), defaults to today'),
  });

  requiresPermission = 'reports:read';

  async execute(
    params: z.infer<typeof this.parametersSchema>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const supabase = createAdminClient();
      const asOfDate = params.asOfDate || new Date().toISOString().split('T')[0];

      // Get active memberships
      const { data: memberships, error } = await supabase
        .from('customer_memberships')
        .select(`
          id,
          monthly_price,
          status,
          start_date,
          membership_plans(name, category)
        `)
        .eq('organization_id', context.organizationId)
        .eq('status', 'active')
        .lte('start_date', asOfDate)
        .or(`end_date.is.null,end_date.gt.${asOfDate}`);

      if (error) throw error;

      // Calculate ARR (MRR * 12)
      const mrr = memberships?.reduce((sum, m) => sum + parseFloat((m.monthly_price as any) || '0'), 0) || 0;
      const arr = mrr * 12;

      // Calculate growth (compare to last year)
      const lastYearDate = new Date(asOfDate);
      lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
      const lastYearDateString = lastYearDate.toISOString().split('T')[0];

      const { data: lastYearMemberships } = await supabase
        .from('customer_memberships')
        .select('monthly_price')
        .eq('organization_id', context.organizationId)
        .eq('status', 'active')
        .lte('start_date', lastYearDateString)
        .or(`end_date.is.null,end_date.gt.${lastYearDateString}`);

      const lastYearMRR = lastYearMemberships?.reduce((sum, m) => sum + parseFloat((m.monthly_price as any) || '0'), 0) || 0;
      const lastYearARR = lastYearMRR * 12;
      const growth = lastYearARR > 0 ? ((arr - lastYearARR) / lastYearARR) * 100 : 0;

      return {
        success: true,
        data: {
          arr,
          mrr,
          activeMemberships: memberships?.length || 0,
          asOfDate,
          yearOverYear: {
            currentARR: arr,
            previousARR: lastYearARR,
            growth,
            growthAmount: arr - lastYearARR,
          },
        },
        metadata: {
          recordsAffected: memberships?.length || 0,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate ARR',
      };
    }
  }
}

/**
 * Analyze Payment Trends
 */
export class AnalyzePaymentTrendsTool extends BaseTool {
  id = 'analyze_payment_trends';
  name = 'Analyze Payment Trends';
  description = 'Analyze payment patterns, methods, timing, and identify anomalies or trends';
  category: 'analytics' = 'analytics';

  parametersSchema = z.object({
    startDate: z.string().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().describe('End date in YYYY-MM-DD format'),
  });

  requiresPermission = 'reports:read';

  async execute(
    params: z.infer<typeof this.parametersSchema>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const supabase = createAdminClient();

      const { data: payments, error } = await supabase
        .from('payments')
        .select('payment_date, amount, payment_method, payment_status, created_at')
        .eq('organization_id', context.organizationId)
        .gte('payment_date', params.startDate)
        .lte('payment_date', params.endDate)
        .order('payment_date', { ascending: true });

      if (error) throw error;

      // Analyze payment methods
      const methodCounts = new Map<string, { count: number; total: number }>();
      const statusCounts = new Map<string, number>();
      const dayOfWeek = new Array(7).fill(0);
      const hourOfDay = new Array(24).fill(0);

      payments?.forEach(payment => {
        const amount = parseFloat(payment.amount as any) || 0;
        const method = payment.payment_method || 'unknown';

        if (!methodCounts.has(method)) {
          methodCounts.set(method, { count: 0, total: 0 });
        }
        const methodData = methodCounts.get(method)!;
        methodData.count++;
        methodData.total += amount;

        const status = payment.payment_status;
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);

        const date = new Date(payment.created_at);
        dayOfWeek[date.getDay()]++;
        hourOfDay[date.getHours()]++;
      });

      // Find peak times
      const peakDay = dayOfWeek.indexOf(Math.max(...dayOfWeek));
      const peakHour = hourOfDay.indexOf(Math.max(...hourOfDay));
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      return {
        success: true,
        data: {
          totalPayments: payments?.length || 0,
          paymentMethods: Object.fromEntries(
            Array.from(methodCounts.entries()).map(([method, data]) => [
              method,
              {
                count: data.count,
                totalAmount: data.total,
                avgAmount: data.count > 0 ? data.total / data.count : 0,
                percentage: payments?.length ? (data.count / payments.length) * 100 : 0,
              },
            ])
          ),
          paymentStatus: Object.fromEntries(statusCounts),
          timing: {
            peakDay: dayNames[peakDay],
            peakHour: `${peakHour}:00`,
            dayOfWeekDistribution: dayNames.map((day, i) => ({ day, count: dayOfWeek[i] })),
            hourlyDistribution: hourOfDay.map((count, hour) => ({ hour, count })),
          },
        },
        metadata: {
          recordsAffected: payments?.length || 0,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze payment trends',
      };
    }
  }
}

/**
 * Analyze Class Attendance
 */
export class AnalyzeClassAttendanceTool extends BaseTool {
  id = 'analyze_class_attendance';
  name = 'Analyze Class Attendance';
  description = 'Analyze class attendance patterns, capacity utilization, and popular class times';
  category: 'analytics' = 'analytics';

  parametersSchema = z.object({
    startDate: z.string().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().describe('End date in YYYY-MM-DD format'),
    programId: z.string().optional().describe('Filter by specific program/class type'),
  });

  requiresPermission = 'reports:read';

  async execute(
    params: z.infer<typeof this.parametersSchema>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const supabase = createAdminClient();

      let query = supabase
        .from('class_sessions')
        .select(`
          id,
          start_time,
          max_capacity,
          current_bookings,
          programs(name, program_type),
          bookings(id, booking_status, attended_at)
        `)
        .eq('organization_id', context.organizationId)
        .gte('start_time', params.startDate)
        .lte('start_time', params.endDate);

      if (params.programId) {
        query = query.eq('program_id', params.programId);
      }

      const { data: sessions, error } = await query;

      if (error) throw error;

      // Analyze attendance
      let totalCapacity = 0;
      let totalBookings = 0;
      let totalAttended = 0;
      const programStats = new Map<string, {
        sessions: number;
        capacity: number;
        bookings: number;
        attended: number;
      }>();

      sessions?.forEach(session => {
        const capacity = session.max_capacity || 0;
        const bookings = (session.bookings as any[])?.length || 0;
        const attended = (session.bookings as any[])?.filter(b => b.attended_at).length || 0;
        const program = (session.programs as any)?.name || 'Unknown';

        totalCapacity += capacity;
        totalBookings += bookings;
        totalAttended += attended;

        if (!programStats.has(program)) {
          programStats.set(program, { sessions: 0, capacity: 0, bookings: 0, attended: 0 });
        }
        const stats = programStats.get(program)!;
        stats.sessions++;
        stats.capacity += capacity;
        stats.bookings += bookings;
        stats.attended += attended;
      });

      const utilizationRate = totalCapacity > 0 ? (totalBookings / totalCapacity) * 100 : 0;
      const attendanceRate = totalBookings > 0 ? (totalAttended / totalBookings) * 100 : 0;

      return {
        success: true,
        data: {
          summary: {
            totalSessions: sessions?.length || 0,
            totalCapacity,
            totalBookings,
            totalAttended,
            utilizationRate,
            attendanceRate,
            noShowRate: 100 - attendanceRate,
          },
          byProgram: Array.from(programStats.entries()).map(([program, stats]) => ({
            program,
            sessions: stats.sessions,
            avgCapacity: stats.sessions > 0 ? stats.capacity / stats.sessions : 0,
            avgBookings: stats.sessions > 0 ? stats.bookings / stats.sessions : 0,
            utilizationRate: stats.capacity > 0 ? (stats.bookings / stats.capacity) * 100 : 0,
            attendanceRate: stats.bookings > 0 ? (stats.attended / stats.bookings) * 100 : 0,
          })),
        },
        metadata: {
          recordsAffected: sessions?.length || 0,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze class attendance',
      };
    }
  }
}

/**
 * Analyze Member Engagement
 */
export class AnalyzeMemberEngagementTool extends BaseTool {
  id = 'analyze_member_engagement';
  name = 'Analyze Member Engagement';
  description = 'Analyze member engagement metrics including activity levels, visit frequency, and engagement trends';
  category: 'analytics' = 'analytics';

  parametersSchema = z.object({
    startDate: z.string().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().describe('End date in YYYY-MM-DD format'),
  });

  requiresPermission = 'reports:read';

  async execute(
    params: z.infer<typeof this.parametersSchema>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const supabase = createAdminClient();

      // Get all clients with their bookings
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          id,
          created_at,
          status,
          bookings!inner(
            id,
            booking_time,
            attended_at,
            booking_status
          )
        `)
        .eq('organization_id', context.organizationId)
        .gte('bookings.booking_time', params.startDate)
        .lte('bookings.booking_time', params.endDate);

      if (error) throw error;

      // Analyze engagement
      const engagementLevels = {
        high: 0,      // 8+ visits
        medium: 0,    // 4-7 visits
        low: 0,       // 1-3 visits
        inactive: 0,  // 0 visits
      };

      const clientEngagement = clients?.map(client => {
        const bookings = (client.bookings as any[]) || [];
        const attended = bookings.filter(b => b.attended_at).length;

        let level: keyof typeof engagementLevels;
        if (attended >= 8) level = 'high';
        else if (attended >= 4) level = 'medium';
        else if (attended >= 1) level = 'low';
        else level = 'inactive';

        engagementLevels[level]++;

        return {
          clientId: client.id,
          totalBookings: bookings.length,
          attended,
          engagementLevel: level,
        };
      }) || [];

      const totalClients = clientEngagement.length;

      return {
        success: true,
        data: {
          summary: {
            totalClients,
            activeClients: totalClients - engagementLevels.inactive,
            engagementDistribution: {
              high: {
                count: engagementLevels.high,
                percentage: totalClients > 0 ? (engagementLevels.high / totalClients) * 100 : 0,
              },
              medium: {
                count: engagementLevels.medium,
                percentage: totalClients > 0 ? (engagementLevels.medium / totalClients) * 100 : 0,
              },
              low: {
                count: engagementLevels.low,
                percentage: totalClients > 0 ? (engagementLevels.low / totalClients) * 100 : 0,
              },
              inactive: {
                count: engagementLevels.inactive,
                percentage: totalClients > 0 ? (engagementLevels.inactive / totalClients) * 100 : 0,
              },
            },
          },
          clients: clientEngagement,
        },
        metadata: {
          recordsAffected: clients?.length || 0,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze member engagement',
      };
    }
  }
}

/**
 * Analyze No-Show Rates
 */
export class AnalyzeNoShowRatesTool extends BaseTool {
  id = 'analyze_no_show_rates';
  name = 'Analyze No-Show Rates';
  description = 'Analyze booking no-show rates with breakdown by class, time, and customer patterns';
  category: 'analytics' = 'analytics';

  parametersSchema = z.object({
    startDate: z.string().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().describe('End date in YYYY-MM-DD format'),
  });

  requiresPermission = 'reports:read';

  async execute(
    params: z.infer<typeof this.parametersSchema>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const supabase = createAdminClient();

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_id,
          booking_time,
          attended_at,
          booking_status,
          class_sessions!inner(
            start_time,
            programs(name)
          )
        `)
        .eq('booking_status', 'confirmed')
        .gte('booking_time', params.startDate)
        .lte('booking_time', params.endDate);

      if (error) throw error;

      // Filter only past bookings
      const now = new Date();
      const pastBookings = bookings?.filter(b =>
        new Date((b.class_sessions as any)?.start_time) < now
      ) || [];

      const totalBookings = pastBookings.length;
      const noShows = pastBookings.filter(b => !b.attended_at).length;
      const noShowRate = totalBookings > 0 ? (noShows / totalBookings) * 100 : 0;

      // Identify repeat offenders
      const customerNoShows = new Map<string, number>();
      pastBookings.forEach(booking => {
        if (!booking.attended_at) {
          const count = customerNoShows.get(booking.customer_id) || 0;
          customerNoShows.set(booking.customer_id, count + 1);
        }
      });

      const repeatOffenders = Array.from(customerNoShows.entries())
        .filter(([_, count]) => count >= 3)
        .map(([customerId, count]) => ({ customerId, noShowCount: count }))
        .sort((a, b) => b.noShowCount - a.noShowCount);

      // No-shows by program
      const programNoShows = new Map<string, { total: number; noShows: number }>();
      pastBookings.forEach(booking => {
        const program = (booking.class_sessions as any)?.programs?.name || 'Unknown';
        if (!programNoShows.has(program)) {
          programNoShows.set(program, { total: 0, noShows: 0 });
        }
        const stats = programNoShows.get(program)!;
        stats.total++;
        if (!booking.attended_at) stats.noShows++;
      });

      return {
        success: true,
        data: {
          summary: {
            totalBookings,
            attended: totalBookings - noShows,
            noShows,
            noShowRate,
            attendanceRate: 100 - noShowRate,
          },
          byProgram: Array.from(programNoShows.entries()).map(([program, stats]) => ({
            program,
            totalBookings: stats.total,
            noShows: stats.noShows,
            noShowRate: stats.total > 0 ? (stats.noShows / stats.total) * 100 : 0,
          })),
          repeatOffenders: repeatOffenders.slice(0, 20),
        },
        metadata: {
          recordsAffected: bookings?.length || 0,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze no-show rates',
      };
    }
  }
}

/**
 * Identify At-Risk Members
 */
export class IdentifyAtRiskMembersTool extends BaseTool {
  id = 'identify_at_risk_members';
  name = 'Identify At-Risk Members';
  description = 'Identify members at risk of churning based on engagement patterns, payment history, and activity';
  category: 'analytics' = 'analytics';

  parametersSchema = z.object({
    daysInactive: z.number().default(30).describe('Number of days without activity to consider at-risk'),
    includeRecommendations: z.boolean().default(true).describe('Include retention recommendations'),
  });

  requiresPermission = 'reports:read';

  async execute(
    params: z.infer<typeof this.parametersSchema>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const supabase = createAdminClient();

      // Get active members with their activity
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          email,
          created_at,
          status,
          customer_memberships!inner(
            status,
            start_date,
            end_date
          ),
          bookings(
            id,
            booking_time,
            attended_at
          ),
          payments(
            id,
            payment_date,
            payment_status
          )
        `)
        .eq('organization_id', context.organizationId)
        .eq('customer_memberships.status', 'active');

      if (error) throw error;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - params.daysInactive);

      const atRiskMembers = clients?.map(client => {
        const bookings = (client.bookings as any[]) || [];
        const payments = (client.payments as any[]) || [];

        const recentBookings = bookings.filter(b =>
          new Date(b.booking_time) >= cutoffDate
        );

        const recentAttendance = bookings.filter(b =>
          b.attended_at && new Date(b.attended_at) >= cutoffDate
        );

        const recentPayments = payments.filter(p =>
          ['paid_out', 'succeeded', 'confirmed'].includes(p.payment_status) &&
          new Date(p.payment_date) >= cutoffDate
        );

        // Calculate risk score (0-100, higher = more at risk)
        let riskScore = 0;
        const reasons: string[] = [];

        if (recentAttendance.length === 0) {
          riskScore += 40;
          reasons.push(`No attendance in ${params.daysInactive} days`);
        } else if (recentAttendance.length < 2) {
          riskScore += 20;
          reasons.push('Very low attendance');
        }

        if (recentBookings.length === 0) {
          riskScore += 30;
          reasons.push('No bookings made');
        }

        if (recentPayments.length === 0) {
          riskScore += 30;
          reasons.push('No recent payments');
        }

        return {
          clientId: client.id,
          name: client.name,
          email: client.email,
          riskScore,
          riskLevel: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
          reasons,
          lastActivity: Math.max(
            ...bookings.map(b => new Date(b.booking_time).getTime()),
            0
          ),
          recentBookings: recentBookings.length,
          recentAttendance: recentAttendance.length,
        };
      }).filter(m => m.riskScore >= 40) || []; // Only return medium/high risk

      return {
        success: true,
        data: {
          summary: {
            totalAtRisk: atRiskMembers.length,
            highRisk: atRiskMembers.filter(m => m.riskLevel === 'high').length,
            mediumRisk: atRiskMembers.filter(m => m.riskLevel === 'medium').length,
            daysInactive: params.daysInactive,
          },
          atRiskMembers: atRiskMembers
            .sort((a, b) => b.riskScore - a.riskScore)
            .map(m => ({
              ...m,
              lastActivity: m.lastActivity > 0 ? new Date(m.lastActivity).toISOString() : null,
            })),
        },
        metadata: {
          recordsAffected: clients?.length || 0,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to identify at-risk members',
      };
    }
  }
}

/**
 * Generate Operations Report
 */
export class GenerateOperationsReportTool extends BaseTool {
  id = 'generate_operations_report';
  name = 'Generate Operations Report';
  description = 'Generate comprehensive operations dashboard with key metrics, capacity, staff performance, and operational insights';
  category: 'analytics' = 'analytics';

  parametersSchema = z.object({
    startDate: z.string().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().describe('End date in YYYY-MM-DD format'),
  });

  requiresPermission = 'reports:read';

  async execute(
    params: z.infer<typeof this.parametersSchema>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const supabase = createAdminClient();

      // Fetch multiple datasets in parallel
      const [
        { data: sessions },
        { data: bookings },
        { data: members },
        { data: payments },
      ] = await Promise.all([
        supabase
          .from('class_sessions')
          .select('id, start_time, max_capacity, current_bookings, session_status')
          .eq('organization_id', context.organizationId)
          .gte('start_time', params.startDate)
          .lte('start_time', params.endDate),

        supabase
          .from('bookings')
          .select('id, booking_status, attended_at, booking_time')
          .gte('booking_time', params.startDate)
          .lte('booking_time', params.endDate),

        supabase
          .from('clients')
          .select('id, created_at, status')
          .eq('organization_id', context.organizationId),

        supabase
          .from('payments')
          .select('id, amount, payment_status, payment_date')
          .eq('organization_id', context.organizationId)
          .gte('payment_date', params.startDate)
          .lte('payment_date', params.endDate),
      ]);

      // Calculate metrics
      const totalCapacity = sessions?.reduce((sum, s) => sum + (s.max_capacity || 0), 0) || 0;
      const totalBookings = sessions?.reduce((sum, s) => sum + (s.current_bookings || 0), 0) || 0;
      const utilizationRate = totalCapacity > 0 ? (totalBookings / totalCapacity) * 100 : 0;

      const confirmedBookings = bookings?.filter(b => b.booking_status === 'confirmed').length || 0;
      const attended = bookings?.filter(b => b.attended_at).length || 0;
      const attendanceRate = confirmedBookings > 0 ? (attended / confirmedBookings) * 100 : 0;

      const newMembers = members?.filter(m =>
        new Date(m.created_at) >= new Date(params.startDate) &&
        new Date(m.created_at) <= new Date(params.endDate)
      ).length || 0;

      const activeMembers = members?.filter(m => m.status === 'active').length || 0;

      const revenue = payments
        ?.filter(p => ['paid_out', 'succeeded', 'confirmed'].includes(p.payment_status))
        .reduce((sum, p) => sum + (parseFloat(p.amount as any) || 0), 0) || 0;

      return {
        success: true,
        data: {
          period: {
            startDate: params.startDate,
            endDate: params.endDate,
          },
          operations: {
            totalSessions: sessions?.length || 0,
            totalCapacity,
            totalBookings,
            utilizationRate,
            attendanceRate,
            noShowRate: 100 - attendanceRate,
          },
          membership: {
            activeMembers,
            newMembers,
            totalMembers: members?.length || 0,
          },
          revenue: {
            totalRevenue: revenue,
            totalPayments: payments?.filter(p => ['paid_out', 'succeeded', 'confirmed'].includes(p.payment_status)).length || 0,
            avgTransactionSize: payments?.length ? revenue / payments.length : 0,
          },
        },
        metadata: {
          recordsAffected: (sessions?.length || 0) + (bookings?.length || 0) + (members?.length || 0) + (payments?.length || 0),
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate operations report',
      };
    }
  }
}

/**
 * Export all analytics tools
 */
export const ANALYTICS_TOOLS = [
  new GenerateRevenueReportTool(),
  new GenerateChurnReportTool(),
  new GenerateLTVReportTool(),
  new GenerateMonthlyTurnoverReportTool(),
  new CalculateMRRTool(),
  new CalculateARRTool(),
  new AnalyzePaymentTrendsTool(),
  new AnalyzeClassAttendanceTool(),
  new AnalyzeMemberEngagementTool(),
  new AnalyzeNoShowRatesTool(),
  new IdentifyAtRiskMembersTool(),
  new GenerateOperationsReportTool(),
];
