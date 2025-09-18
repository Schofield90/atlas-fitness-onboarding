import { Suspense, ReactNode } from "react";

interface ReportPageWrapperProps {
  children: ReactNode;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mb-4 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading report...</p>
      </div>
    </div>
  );
}

export default function ReportPageWrapper({
  children,
}: ReportPageWrapperProps) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}
