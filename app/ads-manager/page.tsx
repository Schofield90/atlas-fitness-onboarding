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
import Link from "next/link";
import {
  ChartBarIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  BanknotesIcon,
  UserGroupIcon,
  AdjustmentsHorizontalIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { AdAccountSelector } from "@/app/components/ads/AdAccountSelector";
import { AdPerformanceChart } from "@/app/components/ads/AdPerformanceChart";

interface AdAccount {
  id: string;
  account_name: string;
  facebook_ad_account_id: string;
  currency: string;
  is_active: boolean;
  spend_cap?: number;
  last_insights_sync_at?: string;
}

interface Campaign {
  id: string;
  campaign_name: string;
  facebook_campaign_id: string;
  objective: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads_count: number;
  start_time?: string;
  stop_time?: string;
  insights: any;
}

interface PerformanceMetrics {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalLeads: number;
  averageCTR: number;
  averageCPC: number;
  averageCPL: number;
  roas: number;
}

interface TopAd {
  ad_name: string;
  facebook_ad_id: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  leads_count: number;
  cost_per_lead: number;
}

export default function AdsManagerPage() {
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalLeads: 0,
    averageCTR: 0,
    averageCPC: 0,
    averageCPL: 0,
    roas: 0,
  });
  const [topAds, setTopAds] = useState<TopAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dateRange, setDateRange] = useState("7"); // days

  useEffect(() => {
    fetchAdAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchCampaigns();
      fetchMetrics();
      fetchTopAds();
    }
  }, [selectedAccount, dateRange]);

  const fetchAdAccounts = async () => {
    try {
      const response = await fetch("/api/ads/accounts");
      if (response.ok) {
        const data = await response.json();
        setAdAccounts(data.accounts || []);
        if (data.accounts?.length > 0) {
          setSelectedAccount(data.accounts[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch ad accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    if (!selectedAccount) return;

    try {
      const response = await fetch(
        `/api/ads/campaigns?account_id=${selectedAccount}&days=${dateRange}`,
      );
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    }
  };

  const fetchMetrics = async () => {
    if (!selectedAccount) return;

    try {
      const response = await fetch(
        `/api/ads/metrics?account_id=${selectedAccount}&days=${dateRange}`,
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics || metrics);
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    }
  };

  const fetchTopAds = async () => {
    if (!selectedAccount) return;

    try {
      const response = await fetch(
        `/api/ads/top-ads?account_id=${selectedAccount}&days=${dateRange}&limit=5`,
      );
      if (response.ok) {
        const data = await response.json();
        setTopAds(data.ads || []);
      }
    } catch (error) {
      console.error("Failed to fetch top ads:", error);
    }
  };

  const syncMetrics = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/ads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: selectedAccount }),
      });

      if (response.ok) {
        // Refresh all data after sync
        await Promise.all([fetchCampaigns(), fetchMetrics(), fetchTopAds()]);
      }
    } catch (error) {
      console.error("Failed to sync metrics:", error);
    } finally {
      setSyncing(false);
    }
  };

  const toggleCampaignStatus = async (
    campaignId: string,
    currentStatus: string,
  ) => {
    try {
      const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
      const response = await fetch(`/api/ads/campaigns/${campaignId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Failed to update campaign status:", error);
    }
  };

  const duplicateCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(
        `/api/ads/campaigns/${campaignId}/duplicate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Failed to duplicate campaign:", error);
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Facebook Ads Manager</h1>
            <p className="text-gray-400 mt-2">
              Monitor and manage your Facebook advertising campaigns
            </p>
          </div>
          <div className="flex space-x-4">
            <Button
              onClick={syncMetrics}
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {syncing ? "Syncing..." : "Sync Data"}
            </Button>
            <Link href="/ads-manager/create">
              <Button className="bg-green-600 hover:bg-green-700">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </Link>
          </div>
        </div>

        {/* Ad Account Selector and Date Range */}
        <div className="flex justify-between items-center mb-6">
          <AdAccountSelector
            accounts={adAccounts}
            selectedAccount={selectedAccount}
            onAccountChange={setSelectedAccount}
          />

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white"
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Total Spend
              </CardTitle>
              <BanknotesIcon className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(metrics.totalSpend)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Impressions
              </CardTitle>
              <EyeIcon className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatNumber(metrics.totalImpressions)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Clicks
              </CardTitle>
              <CursorArrowRaysIcon className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatNumber(metrics.totalClicks)}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                CTR: {formatPercentage(metrics.averageCTR)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Leads
              </CardTitle>
              <UserGroupIcon className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatNumber(metrics.totalLeads)}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                CPL: {formatCurrency(metrics.averageCPL)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <AdPerformanceChart
              accountId={selectedAccount}
              days={parseInt(dateRange)}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Campaigns Overview */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Active Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">
                        {campaign.campaign_name}
                      </h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-300">
                        <span>{campaign.objective}</span>
                        <Badge
                          className={
                            campaign.status === "ACTIVE"
                              ? "bg-green-600"
                              : campaign.status === "PAUSED"
                                ? "bg-yellow-600"
                                : "bg-red-600"
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-gray-400">Spend:</span>
                          <div className="font-medium">
                            {formatCurrency(campaign.spend)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Impressions:</span>
                          <div className="font-medium">
                            {formatNumber(campaign.impressions)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Clicks:</span>
                          <div className="font-medium">
                            {formatNumber(campaign.clicks)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Leads:</span>
                          <div className="font-medium">
                            {formatNumber(campaign.leads_count)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggleCampaignStatus(campaign.id, campaign.status)
                        }
                        className="p-2"
                      >
                        {campaign.status === "ACTIVE" ? (
                          <PauseIcon className="h-4 w-4" />
                        ) : (
                          <PlayIcon className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => duplicateCampaign(campaign.id)}
                        className="p-2"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </Button>
                      <Link href={`/ads-manager/campaigns/${campaign.id}`}>
                        <Button size="sm" variant="outline" className="p-2">
                          <AdjustmentsHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
                {campaigns.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No campaigns found. Create your first campaign to get
                    started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Ads */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Top Performing Ads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topAds.map((ad, index) => (
                  <div
                    key={ad.facebook_ad_id}
                    className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{ad.ad_name}</h4>
                        <div className="text-sm text-gray-400 mt-1">
                          CTR: {formatPercentage(ad.ctr)} • CPL:{" "}
                          {formatCurrency(ad.cost_per_lead)} • Leads:{" "}
                          {ad.leads_count}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        {formatCurrency(ad.spend)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatNumber(ad.impressions)} impressions
                      </div>
                    </div>
                  </div>
                ))}
                {topAds.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No ad performance data available.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Allocation Overview */}
        <Card className="bg-gray-800 border-gray-700 mt-8">
          <CardHeader>
            <CardTitle className="text-white">
              Budget Allocation & ROAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">
                  {metrics.roas.toFixed(2)}x
                </div>
                <div className="text-sm text-gray-400">Return on Ad Spend</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {formatCurrency(metrics.averageCPC)}
                </div>
                <div className="text-sm text-gray-400">
                  Average Cost per Click
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">
                  {formatCurrency(metrics.averageCPL)}
                </div>
                <div className="text-sm text-gray-400">
                  Average Cost per Lead
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
