"use client";

import { useEffect } from "react";

export function CookieFixer() {
  useEffect(() => {
    // Check for corrupted Supabase auth cookies and clear them
    if (typeof window !== "undefined") {
      try {
        // Get all cookies
        const cookies = document.cookie.split(";");

        // Look for corrupted base64 cookies
        cookies.forEach((cookie) => {
          const [name, value] = cookie.trim().split("=");
          if (name && value) {
            // Check if the value starts with base64- which indicates corruption
            if (value.startsWith("base64-") || value.includes("eyJ")) {
              try {
                // Try to parse as JSON - if it fails, it's likely corrupted
                JSON.parse(decodeURIComponent(value));
              } catch (e) {
                // Clear the corrupted cookie
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                console.log(`Cleared corrupted cookie: ${name}`);
              }
            }
          }
        });

        // Also clear localStorage items that might be corrupted
        const keysToCheck = ["supabase.auth.token", "sb-auth-token"];
        keysToCheck.forEach((key) => {
          const item = localStorage.getItem(key);
          if (
            item &&
            (item.startsWith("base64-") || item.startsWith('"base64-'))
          ) {
            localStorage.removeItem(key);
            console.log(`Cleared corrupted localStorage item: ${key}`);
          }
        });
      } catch (error) {
        console.error("Error fixing cookies:", error);
      }
    }
  }, []);

  return null;
}
