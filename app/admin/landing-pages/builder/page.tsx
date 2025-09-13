// Force dynamic rendering since this page uses authentication
export const dynamic = "force-dynamic";

("use client");

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import PageBuilder from "@/app/components/landing-builder/PageBuilder";
import { AITemplateImport } from "@/app/components/landing-builder/AITemplateImport";
import { ArrowLeft, Wand2, Edit, Globe } from "lucide-react";
import Link from "next/link";
import toast from "@/app/lib/toast";

export default function AdminLandingPageBuilderPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [showAIImport, setShowAIImport] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  useEffect(() => {
    checkAuth();
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

  const handleSave = async (content: any[]) => {
    // Get page details with better UX
    const name = prompt("Enter a name for this admin landing page:");
    if (name === null) return;

    const finalName = name.trim() === "" ? "Untitled Admin Page" : name;

    const slug = prompt('Enter a URL slug (e.g., "special-offer"):');
    if (slug === null) return;

    const finalSlug =
      slug.trim() === ""
        ? finalName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        : slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-");

    const description = prompt("Enter a description (optional):");
    if (description === null) return;

    const finalDescription = description || "";

    setSaving(true);
    try {
      // Save to landing_pages table with is_admin_page flag
      const { data, error } = await supabase
        .from("landing_pages")
        .insert({
          name: finalName,
          slug: `admin-${finalSlug}`, // Prefix with admin to avoid conflicts
          title: finalName,
          description: finalDescription,
          content,
          status: "draft",
          is_admin_page: true, // Mark as admin page
          meta_title: finalName,
          meta_description: finalDescription,
          custom_styles: {},
          custom_scripts: {},
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Admin landing page saved successfully!");
      router.push("/admin/landing-pages");
    } catch (error: any) {
      console.error("Error saving page:", error);
      toast.error(error.message || "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const handleAIImport = (template: any) => {
    setShowAIImport(false);
    setShowBuilder(true);
  };

  if (!showBuilder && !showAIImport) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/landing-pages"
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-purple-500">
                Create Admin Landing Page
              </h1>
              <p className="text-sm text-gray-400">
                Build a new platform-wide landing page
              </p>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Start from Scratch */}
            <button
              onClick={() => setShowBuilder(true)}
              className="bg-gray-800 rounded-lg p-8 hover:bg-gray-750 transition-colors text-left group"
            >
              <div className="flex items-center justify-between mb-4">
                <Edit className="w-12 h-12 text-purple-500" />
                <span className="text-sm text-gray-500 group-hover:text-gray-400">
                  Recommended
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Start from Scratch</h3>
              <p className="text-gray-400">
                Build your admin landing page from the ground up with our
                drag-and-drop builder
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 bg-gray-700 rounded">
                  Hero Sections
                </span>
                <span className="text-xs px-2 py-1 bg-gray-700 rounded">
                  Forms
                </span>
                <span className="text-xs px-2 py-1 bg-gray-700 rounded">
                  CTAs
                </span>
                <span className="text-xs px-2 py-1 bg-gray-700 rounded">
                  Pricing
                </span>
              </div>
            </button>

            {/* AI Template Import */}
            <button
              onClick={() => setShowAIImport(true)}
              className="bg-gray-800 rounded-lg p-8 hover:bg-gray-750 transition-colors text-left group"
            >
              <div className="flex items-center justify-between mb-4">
                <Wand2 className="w-12 h-12 text-green-500" />
                <span className="text-sm text-green-500 group-hover:text-green-400">
                  AI Powered
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Import from URL</h3>
              <p className="text-gray-400">
                Let AI analyze any website and recreate it as an editable admin
                landing page
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 bg-gray-700 rounded">
                  Auto Import
                </span>
                <span className="text-xs px-2 py-1 bg-gray-700 rounded">
                  AI Analysis
                </span>
                <span className="text-xs px-2 py-1 bg-gray-700 rounded">
                  Fully Editable
                </span>
              </div>
            </button>
          </div>

          {/* Templates Section */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Globe className="w-6 h-6 text-purple-500" />
              Admin Page Templates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 opacity-50 cursor-not-allowed">
                <div className="aspect-video bg-gray-700 rounded mb-3"></div>
                <h4 className="font-medium mb-1">Platform Announcement</h4>
                <p className="text-sm text-gray-400">Coming soon</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 opacity-50 cursor-not-allowed">
                <div className="aspect-video bg-gray-700 rounded mb-3"></div>
                <h4 className="font-medium mb-1">Feature Launch</h4>
                <p className="text-sm text-gray-400">Coming soon</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 opacity-50 cursor-not-allowed">
                <div className="aspect-video bg-gray-700 rounded mb-3"></div>
                <h4 className="font-medium mb-1">Maintenance Notice</h4>
                <p className="text-sm text-gray-400">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showAIImport) {
    return (
      <AITemplateImport
        onImport={handleAIImport}
        onBack={() => setShowAIImport(false)}
        isAdminPage={true}
      />
    );
  }

  return (
    <PageBuilder
      onSave={handleSave}
      onCancel={() => router.push("/admin/landing-pages")}
      saving={saving}
      isAdminPage={true}
    />
  );
}
// temp
// Deployment fix
