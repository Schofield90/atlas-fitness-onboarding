"use client";

import dynamic from "next/dynamic";

// Dynamically import the client component with SSR disabled
const ClassCalendarClient = dynamic(() => import("./ClientPage"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>
  ),
});

export default function ClassCalendarPage() {
  return <ClassCalendarClient />;
}
