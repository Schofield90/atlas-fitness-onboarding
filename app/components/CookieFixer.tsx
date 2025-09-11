"use client";

import { useEffect } from "react";

export function CookieFixer() {
  useEffect(() => {
    // Check for corrupted Supabase auth cookies and clear them
    if (typeof window !== "undefined") {
      try {
        // Clear ALL Supabase-related cookies that might be corrupted
        const cookiesToClear = [
          "sb-access-token",
          "sb-refresh-token",
          "supabase-auth-token",
          "sb-lzlrojoaxrqvmhempnkn-auth-token",
          "sb-lzlrojoaxrqvmhempnkn-auth-token-code-verifier",
        ];

        cookiesToClear.forEach((cookieName) => {
          // Clear for all possible paths and domains
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.vercel.app`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=atlas-fitness-onboarding.vercel.app`;
        });

        // Get all cookies and clear any that look corrupted
        const cookies = document.cookie.split(";");
        cookies.forEach((cookie) => {
          const [name, value] = cookie.trim().split("=");
          if (name && value) {
            // Check if the value starts with base64- or contains malformed JWT
            if (
              value.startsWith("base64-") ||
              value.startsWith('"base64-') ||
              (value.includes("eyJ") && !value.startsWith("eyJ"))
            ) {
              // Clear the corrupted cookie
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              console.log(`Cleared corrupted cookie: ${name}`);
            }
          }
        });

        // Clear ALL localStorage items related to Supabase
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.includes("supabase") ||
              key.includes("sb-") ||
              key.includes("auth"))
          ) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach((key) => {
          const value = localStorage.getItem(key);
          // Only clear if it looks corrupted
          if (
            value &&
            (value.startsWith("base64-") ||
              value.startsWith('"base64-') ||
              value.includes("base64-eyJ"))
          ) {
            localStorage.removeItem(key);
            console.log(`Cleared corrupted localStorage: ${key}`);
          }
        });

        // Clear sessionStorage as well
        const sessionKeysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (
            key &&
            (key.includes("supabase") ||
              key.includes("sb-") ||
              key.includes("auth"))
          ) {
            sessionKeysToRemove.push(key);
          }
        }

        sessionKeysToRemove.forEach((key) => {
          const value = sessionStorage.getItem(key);
          if (
            value &&
            (value.startsWith("base64-") || value.startsWith('"base64-'))
          ) {
            sessionStorage.removeItem(key);
            console.log(`Cleared corrupted sessionStorage: ${key}`);
          }
        });
      } catch (error) {
        console.error("Error fixing cookies:", error);
      }
    }
  }, []);

  return null;
}
