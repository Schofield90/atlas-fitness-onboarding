"use client";

import { useEffect } from "react";
import Button from "@/app/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Class Calendar Error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md mx-auto p-6">
        <div className="text-red-500 text-lg font-medium">
          Class Calendar Error
        </div>
        <div className="text-gray-600 text-sm">
          {error.message ||
            "Something went wrong while loading the class calendar."}
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="primary">
            Try Again
          </Button>
          <Button
            onClick={() => (window.location.href = "/dashboard")}
            variant="ghost"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
