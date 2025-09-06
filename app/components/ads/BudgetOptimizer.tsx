"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";
import {
  LightBulbIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

interface Campaign {
  id: string;
  campaign_name: string;
  facebook_campaign_id: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads_count: number;
  daily_budget?: number;
  lifetime_budget?: number;
}

interface BudgetRecommendation {
  campaign_id: string;
  campaign_name: string;
  current_budget: number;
  recommended_budget: number;
  reason: string;
  impact: "increase" | "decrease" | "maintain";
  priority: "high" | "medium" | "low";
  potential_leads_change: number;
  confidence: number;
}

interface BudgetOptimizationData {
  total_budget: number;
  total_spend: number;
  budget_utilization: number;
  recommendations: BudgetRecommendation[];
  performance_insights: {
    best_performing_campaigns: string[];
    underperforming_campaigns: string[];
    budget_waste_amount: number;
  };
}

interface BudgetOptimizerProps {
  accountId: string;
  campaigns: Campaign[];
}

export function BudgetOptimizer({
  accountId,
  campaigns,
}: BudgetOptimizerProps) {
  const [optimizationData, setOptimizationData] =
    useState<BudgetOptimizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState<string[]>([]);

  useEffect(() => {
    if (accountId && campaigns.length > 0) {
      fetchOptimizationData();
    }
  }, [accountId, campaigns]);

  const fetchOptimizationData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ads/budget-optimization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          campaigns: campaigns.map((c) => ({
            id: c.id,
            facebook_campaign_id: c.facebook_campaign_id,
            current_budget: c.daily_budget || c.lifetime_budget || 0,
            spend: c.spend,
            leads: c.leads_count,
            clicks: c.clicks,
            impressions: c.impressions,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOptimizationData(data);
      }
    } catch (error) {
      console.error("Failed to fetch optimization data:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendation = async (recommendation: BudgetRecommendation) => {
    setApplying((prev) => [...prev, recommendation.campaign_id]);

    try {
      const response = await fetch(
        `/api/ads/campaigns/${recommendation.campaign_id}/budget`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            daily_budget: recommendation.recommended_budget * 100, // Convert to cents
          }),
        },
      );

      if (response.ok) {
        // Remove the applied recommendation from the list
        setOptimizationData((prev) =>
          prev
            ? {
                ...prev,
                recommendations: prev.recommendations.filter(
                  (r) => r.campaign_id !== recommendation.campaign_id,
                ),
              }
            : null,
        );
      } else {
        throw new Error("Failed to apply budget change");
      }
    } catch (error) {
      console.error("Failed to apply recommendation:", error);
      alert("Failed to apply budget change. Please try again.");
    } finally {
      setApplying((prev) =>
        prev.filter((id) => id !== recommendation.campaign_id),
      );
    }
  };

  const toggleDetails = (campaignId: string) => {
    setShowDetails((prev) =>
      prev.includes(campaignId)
        ? prev.filter((id) => id !== campaignId)
        : [...prev, campaignId],
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getImpactIcon = (impact: "increase" | "decrease" | "maintain") => {
    switch (impact) {
      case "increase":
        return <TrendingUpIcon className="h-4 w-4 text-green-400" />;
      case "decrease":
        return <TrendingDownIcon className="h-4 w-4 text-red-400" />;
      default:
        return <ClockIcon className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "bg-red-600";
      case "medium":
        return "bg-yellow-600";
      default:
        return "bg-blue-600";
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <LightBulbIcon className="h-5 w-5 mr-2 text-yellow-400" />
            AI Budget Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!optimizationData || optimizationData.recommendations.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <LightBulbIcon className="h-5 w-5 mr-2 text-yellow-400" />
            AI Budget Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <div className="text-lg font-medium text-white mb-2">
              Your budgets are optimized!
            </div>
            <div className="text-gray-400">
              No budget adjustments recommended at this time.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <LightBulbIcon className="h-5 w-5 mr-2 text-yellow-400" />
            AI Budget Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {formatCurrency(optimizationData.total_budget)}
              </div>
              <div className="text-sm text-gray-400">Total Daily Budget</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {optimizationData.budget_utilization.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Budget Utilization</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {formatCurrency(
                  optimizationData.performance_insights.budget_waste_amount,
                )}
              </div>
              <div className="text-sm text-gray-400">Potential Waste</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-white mb-2 flex items-center">
                <TrendingUpIcon className="h-4 w-4 mr-2 text-green-400" />
                Top Performers
              </h4>
              <div className="space-y-2">
                {optimizationData.performance_insights.best_performing_campaigns
                  .slice(0, 3)
                  .map((campaignName) => (
                    <div
                      key={campaignName}
                      className="text-sm text-gray-300 bg-green-600/10 p-2 rounded"
                    >
                      {campaignName}
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2 flex items-center">
                <TrendingDownIcon className="h-4 w-4 mr-2 text-red-400" />
                Needs Attention
              </h4>
              <div className="space-y-2">
                {optimizationData.performance_insights.underperforming_campaigns
                  .slice(0, 3)
                  .map((campaignName) => (
                    <div
                      key={campaignName}
                      className="text-sm text-gray-300 bg-red-600/10 p-2 rounded"
                    >
                      {campaignName}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle>Budget Recommendations</CardTitle>
          <p className="text-sm text-gray-400">
            AI-powered suggestions to optimize your ad spend
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {optimizationData.recommendations.map((rec) => (
              <div key={rec.campaign_id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-white">
                        {rec.campaign_name}
                      </h4>
                      <Badge className={getPriorityColor(rec.priority)}>
                        {rec.priority} priority
                      </Badge>
                      <div className="flex items-center text-gray-400">
                        {getImpactIcon(rec.impact)}
                        <span className="ml-1 text-sm capitalize">
                          {rec.impact}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-300 mb-2">
                      <span>Current: {formatCurrency(rec.current_budget)}</span>
                      <ArrowRightIcon className="h-4 w-4" />
                      <span
                        className={
                          rec.impact === "increase"
                            ? "text-green-400"
                            : rec.impact === "decrease"
                              ? "text-red-400"
                              : "text-yellow-400"
                        }
                      >
                        Recommended: {formatCurrency(rec.recommended_budget)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-400 mb-3">{rec.reason}</p>

                    {rec.potential_leads_change !== 0 && (
                      <div className="flex items-center text-sm">
                        {rec.potential_leads_change > 0 ? (
                          <div className="text-green-400">
                            +{rec.potential_leads_change} potential leads/day
                          </div>
                        ) : (
                          <div className="text-red-400">
                            {rec.potential_leads_change} leads/day
                          </div>
                        )}
                        <div className="ml-4 text-gray-500">
                          {rec.confidence}% confidence
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleDetails(rec.campaign_id)}
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => applyRecommendation(rec)}
                      disabled={applying.includes(rec.campaign_id)}
                      className={
                        rec.impact === "increase"
                          ? "bg-green-600 hover:bg-green-700"
                          : rec.impact === "decrease"
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-blue-600 hover:bg-blue-700"
                      }
                    >
                      {applying.includes(rec.campaign_id)
                        ? "Applying..."
                        : "Apply"}
                    </Button>
                  </div>
                </div>

                {/* Detailed breakdown */}
                {showDetails.includes(rec.campaign_id) && (
                  <div className="border-t border-gray-600 pt-4 mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Budget Change</div>
                        <div className="font-medium text-white">
                          {rec.impact === "increase"
                            ? "+"
                            : rec.impact === "decrease"
                              ? "-"
                              : ""}
                          {formatCurrency(
                            Math.abs(
                              rec.recommended_budget - rec.current_budget,
                            ),
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Expected Impact</div>
                        <div className="font-medium text-white">
                          {rec.potential_leads_change > 0 ? "+" : ""}
                          {rec.potential_leads_change} leads/day
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Confidence Level</div>
                        <div className="font-medium text-white">
                          {rec.confidence}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Priority</div>
                        <div className="font-medium text-white capitalize">
                          {rec.priority}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Apply All Button */}
          <div className="mt-6 text-center">
            <Button
              onClick={async () => {
                // Apply all high and medium priority recommendations
                const toApply = optimizationData.recommendations.filter(
                  (r) => r.priority !== "low",
                );
                for (const rec of toApply) {
                  await applyRecommendation(rec);
                }
              }}
              disabled={applying.length > 0}
              className="bg-green-600 hover:bg-green-700"
            >
              Apply All High Priority Recommendations
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Budget Optimization Tips */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-400" />
            Optimization Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
              <div>
                <div className="text-white font-medium">
                  Monitor Performance Daily
                </div>
                <div className="text-gray-400">
                  Check your campaign metrics daily and adjust budgets based on
                  performance.
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
              <div>
                <div className="text-white font-medium">
                  Increase Budgets for Winners
                </div>
                <div className="text-gray-400">
                  Scale up spending on campaigns with low cost-per-lead and high
                  conversion rates.
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
              <div>
                <div className="text-white font-medium">
                  Pause Underperforming Ads
                </div>
                <div className="text-gray-400">
                  Stop spending on ads that aren't generating quality leads or
                  conversions.
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
              <div>
                <div className="text-white font-medium">
                  Test Different Budget Levels
                </div>
                <div className="text-gray-400">
                  A/B test different budget amounts to find the optimal spend
                  for each campaign.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
