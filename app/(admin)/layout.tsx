import { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Admin Portal - GymLeadHub",
  description: "SaaS administration portal for GymLeadHub platform owners",
  robots: "noindex, nofollow",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} admin-portal`}>
        <div className="min-h-screen bg-gray-900">{children}</div>
      </body>
    </html>
  );
}
