import { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Owner Portal - GymLeadHub",
  description: "Gym owner management portal",
};

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} owner-portal`}>
        <div className="min-h-screen bg-gray-50">{children}</div>
      </body>
    </html>
  );
}
