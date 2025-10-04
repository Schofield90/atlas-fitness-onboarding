"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import { RequireOrganization } from "@/app/components/auth/RequireOrganization";
import { useOrganization } from "@/app/hooks/useOrganization";
import { isFeatureEnabled } from "@/app/lib/feature-flags";
import ComingSoon from "@/app/components/ComingSoon";
import { useToast } from "@/app/lib/hooks/useToast";
import CampaignAnalytics from "@/app/components/campaigns/CampaignAnalytics";
import {
  PlusIcon,
  FacebookIcon,
  InstagramIcon,
  MailIcon,
  TrendingUpIcon,
  EyeIcon,
  TargetIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";

// Mock data for campaigns
const mockCampaigns = [
  {
    id: 1,
    name: "Summer Membership Drive",
    type: "Facebook Ads",
    status: "active",
    budget: 500,
    spent: 287.5,
    impressions: 12450,
    clicks: 342,
    leads: 23,
    conversions: 8,
    ctr: 2.75,
    cpc: 0.84,
    costPerLead: 12.5,
    startDate: "2025-01-01",
    endDate: "2025-01-31",
  },
  {
    id: 2,
    name: "New Year Motivation Email",
    type: "Email",
    status: "completed",
    recipients: 2456,
    opened: 1234,
    clicked: 234,
    unsubscribed: 12,
    bounced: 23,
    openRate: 50.2,
    clickRate: 9.5,
    unsubscribeRate: 0.5,
    startDate: "2024-12-28",
    endDate: "2025-01-05",
  },
  {
    id: 3,
    name: "Instagram Fitness Challenge",
    type: "Instagram",
    status: "draft",
    reach: 0,
    engagement: 0,
    profileVisits: 0,
    websiteClicks: 0,
    startDate: "2025-02-01",
    endDate: "2025-02-28",
  },
];

const emailTemplates = [
  {
    id: 1,
    name: "Welcome Series",
    description: "Automated welcome sequence for new members",
  },
  {
    id: 2,
    name: "Win-Back Campaign",
    description: "Re-engage inactive members",
  },
  {
    id: 3,
    name: "Membership Renewal",
    description: "Encourage membership renewals",
  },
  {
    id: 4,
    name: "Class Promotion",
    description: "Promote new class offerings",
  },
];

function CampaignsPageContent() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { organizationId } = useOrganization();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "create" | "analytics"
  >("overview");
  const [selectedCampaignType, setSelectedCampaignType] = useState<
    "facebook" | "instagram" | "email"
  >("facebook");
  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    type: "facebook",
    budget: "",
    duration: "1 week",
    targetAudience: "",
    template: "",
    sendSchedule: "immediately",
    sendDate: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const toast = useToast();

  const handleCreateCampaign = () => {
    // Check if feature is enabled
    if (!isFeatureEnabled("campaignsCreate") && !selectedCampaign) {
      toast.error("Campaign creation is coming soon!");
      return;
    }

    if (!isFeatureEnabled("campaignsActions") && selectedCampaign) {
      toast.error("Campaign editing is coming soon!");
      return;
    }

    // Validate form
    if (!campaignForm.name) {
      toast.error("Please enter a campaign name");
      return;
    }

    if (selectedCampaign) {
      // Update existing campaign
      const updatedCampaigns = campaigns.map((c) =>
        c.id === selectedCampaign.id
          ? {
              ...c,
              name: campaignForm.name,
              budget: parseFloat(campaignForm.budget) || c.budget,
              type:
                selectedCampaignType === "facebook"
                  ? "Facebook Ads"
                  : selectedCampaignType === "email"
                    ? "Email"
                    : "Instagram",
            }
          : c,
      );
      setCampaigns(updatedCampaigns);
      toast.success("Campaign updated successfully!");
    } else {
      // Create new campaign
      const newCampaign = {
        id: campaigns.length + 1,
        name: campaignForm.name,
        type:
          selectedCampaignType === "facebook"
            ? "Facebook Ads"
            : selectedCampaignType === "email"
              ? "Email"
              : "Instagram",
        status: "active",
        budget: parseFloat(campaignForm.budget) || 0,
        spent: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        costPerLead: 0,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        recipients: selectedCampaignType === "email" ? 1000 : undefined,
        opened: 0,
        clicked: 0,
        openRate: 0,
        clickRate: 0,
      };

      // Add to campaigns list
      setCampaigns([...campaigns, newCampaign]);
      toast.success("Campaign created successfully!");
    }

    // Reset form and selected campaign
    setCampaignForm({
      name: "",
      type: "facebook",
      budget: "",
      duration: "1 week",
      targetAudience: "",
      template: "",
      sendSchedule: "immediately",
      sendDate: "",
    });
    setSelectedCampaign(null);

    // Go back to overview
    setActiveTab("overview");
  };

  if (!mounted) {
    return (
      <DashboardLayout userData={null}>
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-96 mb-8"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-500 text-white",
      paused: "bg-yellow-500 text-black",
      completed: "bg-blue-500 text-white",
      draft: "bg-gray-500 text-white",
      failed: "bg-red-500 text-white",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-500 text-white"}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">
                Active Campaigns
              </p>
              <p className="text-2xl font-bold text-white">
                {campaigns.filter((c) => c.status === "active").length}
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <TargetIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Leads</p>
              <p className="text-2xl font-bold text-white">
                {campaigns.reduce((sum, c) => sum + (c.leads || 0), 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <TrendingUpIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="mt-2 flex items-center">
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-500">+12% from last month</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Spend</p>
              <p className="text-2xl font-bold text-white">
                £
                {campaigns
                  .reduce((sum, c) => sum + (c.spent || 0), 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-orange-500 rounded-lg">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">
                Avg. Cost/Lead
              </p>
              <p className="text-2xl font-bold text-white">
                £
                {(
                  campaigns.reduce((sum, c) => sum + (c.costPerLead || 0), 0) /
                    campaigns.filter((c) => c.costPerLead).length || 0
                ).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Table */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">All Campaigns</h2>
          <button
            onClick={() => setActiveTab("create")}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Create Campaign
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-400">
                  Campaign
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">
                  Type
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">
                  Performance
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">
                  Budget
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="border-b border-gray-700 hover:bg-gray-700"
                >
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-white">
                        {campaign.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        {new Date(campaign.startDate).toLocaleDateString()} -{" "}
                        {new Date(campaign.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {campaign.type === "Facebook Ads" && (
                        <div className="w-4 h-4 bg-blue-600 rounded"></div>
                      )}
                      {campaign.type === "Email" && (
                        <div className="w-4 h-4 bg-green-600 rounded"></div>
                      )}
                      {campaign.type === "Instagram" && (
                        <div className="w-4 h-4 bg-pink-600 rounded"></div>
                      )}
                      <span className="text-gray-300">{campaign.type}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(campaign.status)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm">
                      {campaign.type === "Facebook Ads" && (
                        <>
                          <div className="text-white">
                            {campaign.leads} leads
                          </div>
                          <div className="text-gray-400">
                            {campaign.clicks} clicks
                          </div>
                        </>
                      )}
                      {campaign.type === "Email" && (
                        <>
                          <div className="text-white">
                            {campaign.openRate}% opened
                          </div>
                          <div className="text-gray-400">
                            {campaign.clickRate}% clicked
                          </div>
                        </>
                      )}
                      {campaign.type === "Instagram" && (
                        <>
                          <div className="text-white">
                            {campaign.reach} reach
                          </div>
                          <div className="text-gray-400">
                            {campaign.engagement} engagement
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {campaign.budget && (
                      <div className="text-sm">
                        <div className="text-white">
                          £{campaign.spent}/{campaign.budget}
                        </div>
                        <div className="w-20 bg-gray-600 rounded-full h-2 mt-1">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{
                              width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {campaign.recipients && (
                      <div className="text-sm">
                        <div className="text-white">
                          {campaign.recipients} sent
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowViewModal(true);
                        }}
                        className="text-blue-400 hover:text-blue-300"
                        title="View Campaign Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (!isFeatureEnabled("campaignsActions")) {
                            toast.info("Campaign editing coming soon!");
                            return;
                          }

                          // Pre-fill form with campaign data for editing
                          setCampaignForm({
                            name: campaign.name,
                            type: campaign.type
                              .toLowerCase()
                              .replace(" ads", "")
                              .replace(" ", "_"),
                            budget: campaign.budget?.toString() || "",
                            duration: "1 month",
                            targetAudience: "",
                            template: "",
                            sendSchedule: "immediately",
                            sendDate: "",
                          });
                          setSelectedCampaign(campaign);
                          setActiveTab("create");
                          toast.info(`Editing ${campaign.name}`);
                        }}
                        className="text-gray-400 hover:text-white"
                        title="Edit Campaign"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCreateCampaign = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6">
          {selectedCampaign
            ? `Edit Campaign: ${selectedCampaign.name}`
            : "Create New Campaign"}
        </h2>

        {/* Campaign Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Campaign Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setSelectedCampaignType("facebook")}
              className={`p-4 rounded-lg border-2 ${
                selectedCampaignType === "facebook"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-600 hover:border-gray-500"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-medium text-white">
                    Facebook & Instagram Ads
                  </div>
                  <div className="text-sm text-gray-400">
                    Reach targeted audiences with compelling ads
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedCampaignType("email")}
              className={`p-4 rounded-lg border-2 ${
                selectedCampaignType === "email"
                  ? "border-green-500 bg-green-500/10"
                  : "border-gray-600 hover:border-gray-500"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-medium text-white">Email Marketing</div>
                  <div className="text-sm text-gray-400">
                    Send targeted emails to your contact list
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedCampaignType("instagram")}
              className={`p-4 rounded-lg border-2 ${
                selectedCampaignType === "instagram"
                  ? "border-pink-500 bg-pink-500/10"
                  : "border-gray-600 hover:border-gray-500"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-medium text-white">
                    Instagram Content
                  </div>
                  <div className="text-sm text-gray-400">
                    Create engaging posts and stories
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Campaign Form */}
        {selectedCampaignType === "facebook" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={campaignForm.name}
                onChange={(e) =>
                  setCampaignForm({ ...campaignForm, name: e.target.value })
                }
                placeholder="e.g., Summer Membership Drive"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Daily Budget (£)
                </label>
                <input
                  type="number"
                  value={campaignForm.budget}
                  onChange={(e) =>
                    setCampaignForm({ ...campaignForm, budget: e.target.value })
                  }
                  placeholder="25.00"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Campaign Duration
                </label>
                <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  <option>1 week</option>
                  <option>2 weeks</option>
                  <option>1 month</option>
                  <option>3 months</option>
                  <option>Ongoing</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Target Audience
              </label>
              <textarea
                placeholder="Describe your ideal customer (age, interests, location, etc.)"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Ad Creative
              </label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                <svg
                  className="w-12 h-12 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-gray-400">
                  Upload images or videos for your ad
                </p>
                <button className="mt-2 text-orange-500 hover:text-orange-400">
                  Browse Files
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedCampaignType === "email" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={campaignForm.name}
                onChange={(e) =>
                  setCampaignForm({ ...campaignForm, name: e.target.value })
                }
                placeholder="e.g., New Year Motivation Email"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email Template
              </label>
              <select
                value={campaignForm.template}
                onChange={(e) =>
                  setCampaignForm({ ...campaignForm, template: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select a template</option>
                {emailTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
                <option value="custom">Create Custom Email</option>
              </select>
            </div>

            {/* Email Content Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email Subject
              </label>
              <input
                type="text"
                placeholder="e.g., New Year Special - 50% Off Membership!"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email Content
              </label>
              <div className="space-y-4">
                {/* Email Editor Toolbar */}
                <div className="flex gap-2 p-2 bg-gray-700 rounded-lg">
                  <button
                    className="p-2 hover:bg-gray-600 rounded"
                    title="Bold"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"
                      ></path>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"
                      ></path>
                    </svg>
                  </button>
                  <button
                    className="p-2 hover:bg-gray-600 rounded"
                    title="Italic"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 4h4m0 0l-4 16m4-16h4m-8 16h4m0 0h4"
                      ></path>
                    </svg>
                  </button>
                  <button
                    className="p-2 hover:bg-gray-600 rounded"
                    title="Underline"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 4v7a5 5 0 0010 0V4M5 21h14"
                      ></path>
                    </svg>
                  </button>
                  <div className="w-px bg-gray-600"></div>
                  <button
                    className="p-2 hover:bg-gray-600 rounded"
                    title="Link"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      ></path>
                    </svg>
                  </button>
                  <button
                    className="p-2 hover:bg-gray-600 rounded"
                    title="Image"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      ></path>
                    </svg>
                  </button>
                  <div className="w-px bg-gray-600"></div>
                  <button
                    className="p-2 hover:bg-gray-600 rounded"
                    title="Add Button"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 15l-2 5L9 9l11 4-5 2z"
                      ></path>
                    </svg>
                  </button>
                </div>

                {/* Email Content Area */}
                <div
                  className="bg-gray-700 rounded-lg p-4"
                  style={{ minHeight: "400px" }}
                >
                  <textarea
                    placeholder="Start writing your email content here...

Hi [FirstName],

We're excited to announce our New Year special offer! 

For a limited time, get 50% off your first month of membership when you join Atlas Fitness.

[Add Button: Claim Your Discount]

Why join Atlas Fitness?
• State-of-the-art equipment
• Expert personal trainers
• Group fitness classes
• Flexible membership options

Don't miss out on this amazing opportunity to start your fitness journey!

Best regards,
The Atlas Fitness Team"
                    className="w-full h-96 px-3 py-2 bg-transparent border-none outline-none text-white resize-none"
                  />
                </div>

                {/* Email Preview Toggle */}
                <div className="flex justify-between items-center">
                  <button className="text-orange-500 hover:text-orange-400 flex items-center gap-2">
                    <EyeIcon className="h-4 w-4" />
                    Preview Email
                  </button>
                  <button className="text-blue-500 hover:text-blue-400 flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2"
                      ></path>
                    </svg>
                    Save as Template
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Target Audience
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-gray-300">All contacts</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-gray-300">Active members only</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-gray-300">
                    Inactive members (win-back)
                  </span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-gray-300">Prospects (leads)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Send Schedule
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                    <option>Send immediately</option>
                    <option>Schedule for later</option>
                  </select>
                </div>
                <div>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedCampaignType === "instagram" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Post Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 border border-gray-600 rounded-lg hover:border-gray-500">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-600 rounded-lg mx-auto mb-2"></div>
                    <div className="font-medium text-white">Feed Post</div>
                  </div>
                </button>
                <button className="p-4 border border-gray-600 rounded-lg hover:border-gray-500">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-pink-600 rounded-lg mx-auto mb-2"></div>
                    <div className="font-medium text-white">Story</div>
                  </div>
                </button>
                <button className="p-4 border border-gray-600 rounded-lg hover:border-gray-500">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-2"></div>
                    <div className="font-medium text-white">Reel</div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Caption
              </label>
              <textarea
                placeholder="Write your Instagram caption..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-32"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Hashtags
              </label>
              <input
                type="text"
                placeholder="#fitness #gym #workout #motivation"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-6">
          <button
            onClick={handleCreateCampaign}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg"
          >
            Create Campaign
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <CampaignAnalytics
      campaignId={selectedCampaign?.id}
      campaignData={selectedCampaign}
    />
  );

  return (
    <DashboardLayout userData={null}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Marketing & Campaigns</h1>
          <p className="text-gray-400">
            Manage your Facebook, Instagram, and email marketing campaigns
          </p>
          {!isFeatureEnabled("campaignsActions") && (
            <ComingSoon
              variant="banner"
              feature="Marketing Campaigns"
              description="This module is currently in development. You can view mock data but creation and editing features are coming soon."
            />
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-orange-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            Campaign Overview
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "create"
                ? "bg-orange-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            Create Campaign
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "analytics"
                ? "bg-orange-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            Analytics & Reports
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && renderOverview()}
        {activeTab === "create" && renderCreateCampaign()}
        {activeTab === "analytics" && renderAnalytics()}

        {/* Campaign View Modal */}
        {showViewModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedCampaign.name}
                  </h3>
                  <p className="text-gray-400 mt-1">
                    {selectedCampaign.description ||
                      "Campaign details and performance metrics"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedCampaign(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Campaign Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {selectedCampaign.type === "Facebook Ads" && (
                      <div className="w-4 h-4 bg-blue-600 rounded"></div>
                    )}
                    {selectedCampaign.type === "Email" && (
                      <div className="w-4 h-4 bg-green-600 rounded"></div>
                    )}
                    {selectedCampaign.type === "Instagram" && (
                      <div className="w-4 h-4 bg-pink-600 rounded"></div>
                    )}
                    <span className="text-gray-300 font-medium">
                      {selectedCampaign.type}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedCampaign.status === "active"
                            ? "bg-green-500 text-white"
                            : selectedCampaign.status === "completed"
                              ? "bg-blue-500 text-white"
                              : selectedCampaign.status === "paused"
                                ? "bg-yellow-500 text-black"
                                : "bg-gray-500 text-white"
                        }`}
                      >
                        {selectedCampaign.status.charAt(0).toUpperCase() +
                          selectedCampaign.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration</span>
                      <span className="text-white">
                        {new Date(
                          selectedCampaign.startDate,
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(
                          selectedCampaign.endDate,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">
                    Performance Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    {selectedCampaign.type === "Facebook Ads" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Leads</span>
                          <span className="text-green-400 font-medium">
                            {selectedCampaign.leads}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Clicks</span>
                          <span className="text-blue-400 font-medium">
                            {selectedCampaign.clicks}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">CTR</span>
                          <span className="text-purple-400 font-medium">
                            {selectedCampaign.ctr}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Cost per Lead</span>
                          <span className="text-orange-400 font-medium">
                            £{selectedCampaign.costPerLead}
                          </span>
                        </div>
                      </>
                    )}
                    {selectedCampaign.type === "Email" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Recipients</span>
                          <span className="text-blue-400 font-medium">
                            {selectedCampaign.recipients}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Open Rate</span>
                          <span className="text-green-400 font-medium">
                            {selectedCampaign.openRate}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Click Rate</span>
                          <span className="text-purple-400 font-medium">
                            {selectedCampaign.clickRate}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Unsubscribes</span>
                          <span className="text-red-400 font-medium">
                            {selectedCampaign.unsubscribed || 0}
                          </span>
                        </div>
                      </>
                    )}
                    {selectedCampaign.type === "Instagram" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Reach</span>
                          <span className="text-blue-400 font-medium">
                            {selectedCampaign.reach}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Engagement</span>
                          <span className="text-green-400 font-medium">
                            {selectedCampaign.engagement}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Profile Visits</span>
                          <span className="text-purple-400 font-medium">
                            {selectedCampaign.profileVisits}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Website Clicks</span>
                          <span className="text-orange-400 font-medium">
                            {selectedCampaign.websiteClicks}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Budget Information */}
              {selectedCampaign.budget && (
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <h4 className="text-white font-medium mb-3">
                    Budget & Spending
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Budget</span>
                      <span className="text-white font-medium">
                        £{selectedCampaign.budget}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Amount Spent</span>
                      <span className="text-orange-400 font-medium">
                        £{selectedCampaign.spent}
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((selectedCampaign.spent / selectedCampaign.budget) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">
                        Remaining: £
                        {selectedCampaign.budget - selectedCampaign.spent}
                      </span>
                      <span className="text-gray-500">
                        {Math.round(
                          (selectedCampaign.spent / selectedCampaign.budget) *
                            100,
                        )}
                        % used
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedCampaign(selectedCampaign);
                    setActiveTab("analytics");
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  View Full Analytics
                </button>
                <button
                  onClick={() => {
                    if (!isFeatureEnabled("campaignsActions")) {
                      toast.info("Campaign editing coming soon!");
                      return;
                    }
                    setShowViewModal(false);
                    // Navigate to edit mode
                    setCampaignForm({
                      name: selectedCampaign.name,
                      type: selectedCampaign.type
                        .toLowerCase()
                        .replace(" ads", "")
                        .replace(" ", "_"),
                      budget: selectedCampaign.budget?.toString() || "",
                      duration: "1 month",
                      targetAudience: "",
                      template: "",
                      sendSchedule: "immediately",
                      sendDate: "",
                    });
                    setSelectedCampaign(selectedCampaign);
                    setActiveTab("create");
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Edit Campaign
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedCampaign(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function CampaignsPage() {
  return (
    <RequireOrganization>
      <CampaignsPageContent />
    </RequireOrganization>
  );
}
