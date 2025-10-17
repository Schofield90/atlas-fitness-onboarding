"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageBuilder from "@/app/components/landing-builder/PageBuilder";
import toast from "@/lib/toast";

export default function EditAdminLandingPage() {
  const router = useRouter();
  const params = useParams();
  const pageId = params.id as string;
  const supabase = createClient();

  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchPage();
  }, [pageId]);

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

  const fetchPage = async () => {
    try {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("id", pageId)
        .eq("is_admin_page", true)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error("Admin landing page not found");
        router.push("/admin/landing-pages");
        return;
      }

      setPage(data);
    } catch (error) {
      console.error("Error fetching page:", error);
      toast.error("Failed to load landing page");
      router.push("/admin/landing-pages");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (content: any[]) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("landing_pages")
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pageId);

      if (error) throw error;

      toast.success("Admin landing page updated successfully!");
      router.push("/admin/landing-pages");
    } catch (error: any) {
      console.error("Error saving page:", error);
      toast.error(error.message || "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!page) {
    return null;
  }

  return (
    <PageBuilder
      initialContent={page.content}
      onSave={handleSave}
      onCancel={() => router.push("/admin/landing-pages")}
      saving={saving}
      isAdminPage={true}
    />
  );
}
