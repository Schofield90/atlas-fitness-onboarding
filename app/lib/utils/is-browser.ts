/**
 * Utility to check if code is running in browser environment
 * Use this to guard any browser-specific code that might run during SSR/SSG
 */
export const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Check if running in Next.js build process
 */
export const isBuilding = () => process.env.NODE_ENV === 'production' && !isBrowser();

/**
 * Safe storage that works in both browser and server environments
 */
export const safeStorage = {
  getItem: (key: string) => {
    if (!isBrowser()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    if (!isBrowser()) return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (key: string) => {
    if (!isBrowser()) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  },
};