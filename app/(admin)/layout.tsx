import { Metadata } from "next";
import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Admin Portal - GymLeadHub",
  description: "SaaS administration portal for GymLeadHub platform owners",
  robots: "noindex, nofollow",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in, redirect to signin
  if (!user) {
    redirect("/signin");
  }

  // Check admin authorization
  const ADMIN_EMAIL = "sam@gymleadhub.co.uk";
  if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
    redirect("/"); // Redirect unauthorized users to home
  }

  return (
    <html lang="en">
      <body className={`${inter.className} admin-portal`}>
        <div className="min-h-screen bg-gray-900">
          <div className="bg-gray-800 border-b border-gray-700 px-6 py-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Admin Portal</span>
              <span className="text-purple-400">
                Logged in as: {user.email}
              </span>
            </div>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
