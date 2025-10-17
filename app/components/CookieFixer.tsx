"use client";

import { useEffect, useRef } from "react";

export function CookieFixer() {
  const hasCleanedRef = useRef(false);

  useEffect(() => {
    // Only run once per mount to avoid excessive cleaning
    if (hasCleanedRef.current) return;
    hasCleanedRef.current = true;

    // Check for corrupted Supabase auth cookies and clear them
    if (typeof window !== "undefined") {
      try {
        // Get all cookies
        const cookies = document.cookie.split(";");
        let clearedCount = 0;
        const corruptedCookies: string[] = [];

        cookies.forEach((cookie) => {
          const trimmed = cookie.trim();
          if (!trimmed) return;

          const equalIndex = trimmed.indexOf("=");
          if (equalIndex === -1) return;

          const name = trimmed.substring(0, equalIndex);
          const value = trimmed.substring(equalIndex + 1);

          if (name && value) {
            // Check for chunked cookies (atlas-fitness-auth.0, atlas-fitness-auth.1, etc.)
            if (name.match(/^atlas-fitness-auth\.\d+$/)) {
              corruptedCookies.push(name);
              console.log(
                `Cleared corrupted cookie: ${name} (value started with: ${value.substring(0, 50)}...)`,
              );
            }
            // Check for other corruption patterns
            else if (
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
              value.includes("%22base64-")
            ) {
              corruptedCookies.push(name);
              console.log(
                `Cleared corrupted cookie: ${name} (value started with: ${value.substring(0, 50)}...)`,
              );
            }
          }
        });

        // Clear all corrupted cookies
        if (corruptedCookies.length > 0) {
          corruptedCookies.forEach((name) => {
            // Clear with various domain/path combinations to ensure removal
            const clearCommands = [
              `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`,
              `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.vercel.app;`,
              `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`,
              `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict;`,
            ];

            clearCommands.forEach((cmd) => {
              document.cookie = cmd;
            });
            clearedCount++;
          });

          console.log(`CookieFixer: Cleared ${clearedCount} corrupted cookies`);

          // If we cleared the main auth cookie chunks, also clear the base cookie
          if (
            corruptedCookies.some((name) =>
              name.startsWith("atlas-fitness-auth."),
            )
          ) {
            document.cookie =
              "atlas-fitness-auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            console.log("Also cleared base atlas-fitness-auth cookie");
          }
        }

        // Clear corrupted localStorage items
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const value = localStorage.getItem(key);
            // Check for corruption patterns in auth-related keys
            if (
              (key.includes("supabase") || key.includes("auth")) &&
              value &&
              (value.startsWith("base64-") ||
                value.includes("base64-eyJ") ||
                value.includes('\\"base64-'))
            ) {
              keysToRemove.push(key);
            }
          }
        }

        keysToRemove.forEach((key) => {
          localStorage.removeItem(key);
          console.log(`Cleared corrupted localStorage: ${key}`);
        });

        // Clear corrupted sessionStorage items
        const sessionKeysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            const value = sessionStorage.getItem(key);
            if (
              (key.includes("supabase") || key.includes("auth")) &&
              value &&
              (value.startsWith("base64-") ||
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
      }
    }
  }, []);

  return null;
}
