import { useState, useCallback } from 'react';

type ToastVariant = 'default' | 'destructive';

interface Toast {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((toastData: Toast) => {
    // Simple implementation - just log for now
    // In production, you'd integrate with a toast library
    if (toastData.variant === 'destructive') {
      console.error(`[Toast Error] ${toastData.title}:`, toastData.description);
    } else {
      console.log(`[Toast] ${toastData.title}:`, toastData.description);
    }

    // Add to state for potential UI rendering
    setToasts(prev => [...prev, toastData]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 5000);
  }, []);

  return { toast, toasts };
}