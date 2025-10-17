"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Copy,
  Globe,
  ArrowLeft,
  Search,
  Filter,
  ChevronDown,
  ExternalLink,
  Building2,
} from "lucide-react";
import toast from "@/lib/toast";

interface AdminLandingPage {
  id: string;
  name: string;
  slug: string;
  title: string;
  description?: string;
  status: "draft" | "published" | "archived";
  content: any[];
  created_at: string;
  updated_at: string;
  organization_id?: string;
  organization?: {
    name: string;
  };
  is_admin_page: boolean;
}

export default function AdminLandingPages() {
  const [pages, setPages] = useState<AdminLandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    fetchPages();
  }, []);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const authorizedEmails = ["sam@gymleadhub.co.uk", "sam@atlas-gyms.co.uk"];
    if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
      toast.error("Unauthorized access - Admin only");
      router.push("/dashboard-direct");
      return;
    }
  };

  const fetchPages = async () => {
    try {
      // Fetch admin landing pages (marked with is_admin_page = true)
      const { data, error } = await supabase
        .from("landing_pages")
        .select(
          `
          *,
          organization:organizations(name)
        `,
        )
        .eq("is_admin_page", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error("Error fetching landing pages:", error);
      toast.error("Failed to load landing pages");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from("landing_pages")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Landing page deleted successfully");
      fetchPages();
    } catch (error) {
      console.error("Error deleting page:", error);
      toast.error("Failed to delete landing page");
    }
  };

  const handleDuplicate = async (page: AdminLandingPage) => {
    try {
      const { data, error } = await supabase
        .from("landing_pages")
        .insert({
          name: `${page.name} (Copy)`,
          slug: `${page.slug}-copy-${Date.now()}`,
          title: page.title,
          description: page.description,
          status: "draft",
          content: page.content,
          is_admin_page: true,
          meta_title: page.title,
          meta_description: page.description,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Landing page duplicated successfully");
      fetchPages();
    } catch (error) {
      console.error("Error duplicating page:", error);
      toast.error("Failed to duplicate landing page");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("landing_pages")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Page status changed to ${newStatus}`);
      fetchPages();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update page status");
    }
  };

  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || page.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-purple-500">
                Admin Landing Pages
              </h1>
              <p className="text-sm text-gray-400">
                Manage platform-wide landing pages
              </p>
            </div>
          </div>
          <Link
            href="/admin/landing-pages/builder"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create New Page
          </Link>
        </div>
      </header>

      {/* Filters */}
      <div className="p-6">
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Pages Grid */}
        {filteredPages.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              No Admin Landing Pages
            </h3>
            <p className="text-gray-400 mb-6">
              Create your first admin landing page to get started
            </p>
            <Link
              href="/admin/landing-pages/builder"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Landing Page
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPages.map((page) => (
              <div
                key={page.id}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{page.name}</h3>
                    <p className="text-sm text-gray-400 mb-2">{page.slug}</p>
                    {page.description && (
                      <p className="text-sm text-gray-500">
                        {page.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      page.status === "published"
                        ? "bg-green-500/20 text-green-400"
                        : page.status === "draft"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {page.status}
                  </span>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  Updated {new Date(page.updated_at).toLocaleDateString()}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/landing-pages/builder/${page.id}`}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Link>

                  {page.status === "published" && (
                    <a
                      href={`/p/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={() => handleDuplicate(page)}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <div className="relative group">
                    <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={() =>
                          handleStatusChange(
                            page.id,
                            page.status === "published" ? "draft" : "published",
                          )
                        }
                        className="w-full px-4 py-2 text-left hover:bg-gray-600 text-sm"
                      >
                        {page.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => handleStatusChange(page.id, "archived")}
                        className="w-full px-4 py-2 text-left hover:bg-gray-600 text-sm"
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => handleDelete(page.id, page.name)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-600 text-sm text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
