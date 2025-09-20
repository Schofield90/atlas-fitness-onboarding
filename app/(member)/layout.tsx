import { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Member Portal - GymLeadHub",
  description: "Gym member portal for bookings and account management",
};

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} member-portal`}>
        <div className="min-h-screen bg-white">{children}</div>
      </body>
    </html>
  );
}
