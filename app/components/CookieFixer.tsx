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
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.vercel.app;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=atlas-fitness-onboarding.vercel.app;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.atlas-fitness-onboarding.vercel.app;`;
        });

        // Get all cookies and clear any that look corrupted or malformed
        const cookies = document.cookie.split(";");
        let clearedCount = 0;

        cookies.forEach((cookie) => {
          const trimmed = cookie.trim();
          if (!trimmed) return;

          const equalIndex = trimmed.indexOf("=");
          if (equalIndex === -1) return;

          const name = trimmed.substring(0, equalIndex);
          const value = trimmed.substring(equalIndex + 1);

          if (name && value) {
            // Check for various corruption patterns
            const isCorrupted =
              value.startsWith("base64-") ||
              value.startsWith('"base64-') ||
              value.includes("base64-eyJ") ||
              value.includes('\\"base64-') ||
              (value.includes("eyJ") && !value.startsWith("eyJ")) ||
              // Check for malformed JSON
              (value.startsWith("{") && !value.endsWith("}")) ||
              // Check for malformed quotes
              (value.startsWith('"') && !value.endsWith('"')) ||
              // Check for base64 fragments in wrong places
              value.match(/[^a-zA-Z0-9+/=]base64-/) ||
              // Check for encoding issues
              value.includes("%22base64-");

            if (isCorrupted) {
              // Clear the corrupted cookie with all possible domain/path combinations
              const domains = [
                "",
                "domain=.vercel.app;",
                "domain=atlas-fitness-onboarding.vercel.app;",
                "domain=.atlas-fitness-onboarding.vercel.app;",
              ];

              domains.forEach((domain) => {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; ${domain}`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/client; ${domain}`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/client-portal; ${domain}`;
              });

              clearedCount++;
              console.log(
                `Cleared corrupted cookie: ${name} (value started with: ${value.substring(0, 50)}...)`,
              );
            }
          }
        });

        if (clearedCount > 0) {
          console.log(`CookieFixer: Cleared ${clearedCount} corrupted cookies`);
        }

        // Clear localStorage items that look corrupted
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.includes("supabase") ||
              key.includes("sb-") ||
              key.includes("auth"))
          ) {
            const value = localStorage.getItem(key);
            // Check for corruption patterns
            if (
              value &&
              (value.startsWith("base64-") ||
                value.startsWith('"base64-') ||
                value.includes("base64-eyJ") ||
                value.includes('\\"base64-') ||
                value.match(/[^a-zA-Z0-9+/=]base64-/))
            ) {
              keysToRemove.push(key);
            }
          }
        }

        keysToRemove.forEach((key) => {
          localStorage.removeItem(key);
          console.log(`Cleared corrupted localStorage: ${key}`);
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
            const value = sessionStorage.getItem(key);
            if (
              value &&
              (value.startsWith("base64-") ||
                value.startsWith('"base64-') ||
                value.includes("base64-eyJ") ||
                value.includes('\\"base64-'))
            ) {
              sessionKeysToRemove.push(key);
            }
          }
        }

        sessionKeysToRemove.forEach((key) => {
          sessionStorage.removeItem(key);
          console.log(`Cleared corrupted sessionStorage: ${key}`);
        });
      } catch (error) {
        console.error("Error fixing cookies:", error);
        // If all else fails, try to clear everything Supabase-related
        try {
          document.cookie.split(";").forEach((cookie) => {
            const name = cookie.trim().split("=")[0];
            if (name && (name.includes("sb-") || name.includes("supabase"))) {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
          });
        } catch (clearError) {
          console.error(
            "Failed to clear cookies in error handler:",
            clearError,
          );
        }
      }
    }
  }, []);

  return null;
}
