"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  MoreVertical,
  Wand2,
} from "lucide-react";
import { AITemplateImport } from "@/app/components/landing-builder/AITemplateImport";
import DashboardLayout from "@/app/components/DashboardLayout";

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  status: "draft" | "published" | "archived";
  views_count: number;
  conversions_count: number;
  conversion_rate: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

function LandingPagesContent() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAIImport, setShowAIImport] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await fetch("/api/landing-pages");
      if (!response.ok) throw new Error("Failed to fetch pages");
      const { data } = await response.json();
      setPages(data || []);
    } catch (error) {
      console.error("Error fetching pages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this landing page?")) return;

    try {
      const response = await fetch(`/api/landing-pages/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete page");
      fetchPages();
    } catch (error) {
      console.error("Error deleting page:", error);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const response = await fetch(`/api/landing-pages/${id}/publish`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to publish page");
      fetchPages();
    } catch (error) {
      console.error("Error publishing page:", error);
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      const response = await fetch(`/api/landing-pages/${id}/publish`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to unpublish page");
      fetchPages();
    } catch (error) {
      console.error("Error unpublishing page:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-700 text-gray-300",
      published: "bg-green-900 text-green-300",
      archived: "bg-red-900 text-red-300",
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Landing Pages</h1>
          <p className="text-gray-400 mt-1">
            Create and manage your landing pages
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAIImport(!showAIImport)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Wand2 className="w-5 h-5" />
            AI Import
          </button>
          <Link
            href="/landing-pages/builder"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New Page
          </Link>
        </div>
      </div>

      {showAIImport && (
        <div className="mb-8">
          <AITemplateImport
            onImportComplete={(id) => {
              setShowAIImport(false);
              router.push(`/landing-pages/builder/${id}`);
            }}
          />
        </div>
      )}

      {pages.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 rounded-lg border border-gray-700">
          <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Copy className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No landing pages yet
          </h3>
          <p className="text-gray-400 mb-6">
            Create your first landing page to get started
          </p>
          <Link
            href="/landing-pages/builder"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Landing Page
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map((page) => (
            <div
              key={page.id}
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors"
            >
              {/* Page Preview */}
              <div className="h-48 bg-gradient-to-br from-gray-700 to-gray-800 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Copy className="w-16 h-16 text-gray-600" />
                </div>
                <div className="absolute top-2 right-2">
                  {getStatusBadge(page.status)}
                </div>
              </div>

              {/* Page Info */}
              <div className="p-4">
                <h3 className="font-semibold text-white mb-1">{page.name}</h3>
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                  {page.description || "No description"}
                </p>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {page.views_count || 0} views
                  </span>
                  <span>{page.conversion_rate || 0}% conversion</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/landing-pages/builder/${page.id}`}
                    className="flex-1 bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600 transition-colors text-sm text-center"
                  >
                    Edit
                  </Link>

                  {page.status === "published" ? (
                    <>
                      <a
                        href={`/l/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:bg-gray-700 rounded transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleUnpublish(page.id)}
                        className="p-1.5 text-gray-400 hover:bg-gray-700 rounded transition-colors"
                        title="Unpublish"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handlePublish(page.id)}
                      className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      Publish
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(page.id)}
                    className="p-1.5 text-red-500 hover:bg-red-900/20 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LandingPagesPage() {
  return (
    <DashboardLayout userData={null}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        }
      >
        <LandingPagesContent />
      </Suspense>
    </DashboardLayout>
  );
}
