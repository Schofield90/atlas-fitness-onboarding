import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/app/lib/polyfills";
import { AnalyticsProvider } from "@/app/components/analytics/provider";
import { OrganizationProvider } from "@/app/hooks/useOrganization";
import { ErrorBoundaryProvider } from "@/app/components/errors";
import TeamChatNotificationProvider from "@/app/components/notifications/TeamChatNotificationProvider";
import { AuthProvider } from "@/app/components/providers/AuthProvider";
// import FloatingChatWidget from "@/app/components/team-chat/FloatingChatWidget";
// import { ToastProvider } from '@/app/components/providers/toast-provider'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gymleadhub - AI-Powered Gym Lead Management",
  description:
    "Stop losing gym leads to competitors. Our AI system captures, qualifies, and nurtures leads 24/7.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body className={inter.className}>
        <ErrorBoundaryProvider>
          <AuthProvider>
            <AnalyticsProvider>
              <OrganizationProvider>
                <TeamChatNotificationProvider>
                  {/* <ToastProvider /> */}
                  {children}
                  {/* <FloatingChatWidget /> */}
                </TeamChatNotificationProvider>
              </OrganizationProvider>
            </AnalyticsProvider>
          </AuthProvider>
        </ErrorBoundaryProvider>
      </body>
    </html>
  );
}
