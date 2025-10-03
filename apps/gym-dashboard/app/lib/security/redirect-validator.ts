/**
 * Redirect URL Validator
 * Prevents XSS attacks via redirect parameters
 */

const ALLOWED_HOSTS = [
  "localhost",
  "localhost:3000",
  "localhost:3001",
  "atlas-fitness-onboarding.vercel.app",
  "atlas-gyms.co.uk",
  "gymleadhub.co.uk",
  "admin.gymleadhub.co.uk",
  "login.gymleadhub.co.uk",
  "members.gymleadhub.co.uk",
];

const ALLOWED_PATHS = [
  "/dashboard",
  "/signin",
  "/signup",
  "/leads",
  "/booking",
  "/settings",
  "/automations",
  "/client",
  "/coach",
  "/admin",
];

const BLOCKED_PROTOCOLS = [
  "javascript:",
  "data:",
  "vbscript:",
  "about:",
  "file:",
];

export function validateRedirectUrl(
  url: string | null | undefined,
  defaultPath: string = "/dashboard",
  hostname?: string,
): string {
  // Use provided default or fallback
  const defaultRedirect = defaultPath;

  if (!url) return defaultRedirect;

  // Remove any whitespace and decode
  const cleanUrl = decodeURIComponent(url.trim());

  // Block dangerous protocols
  const lowerUrl = cleanUrl.toLowerCase();
  for (const protocol of BLOCKED_PROTOCOLS) {
    if (lowerUrl.startsWith(protocol)) {
      console.warn(`Blocked dangerous redirect: ${url}`);
      return defaultRedirect;
    }
  }

  // Parse URL
  try {
    // Handle relative URLs
    if (cleanUrl.startsWith("/")) {
      // Ensure it starts with an allowed path
      const pathMatch = ALLOWED_PATHS.some(
        (path) =>
          cleanUrl === path ||
          cleanUrl.startsWith(`${path}/`) ||
          cleanUrl.startsWith(`${path}?`),
      );

      if (!pathMatch) {
        console.warn(`Blocked unauthorized path: ${cleanUrl}`);
        return defaultRedirect;
      }

      // Remove any potential XSS in query params
      const sanitized = sanitizeQueryParams(cleanUrl);
      return sanitized;
    }

    // Handle absolute URLs
    const urlObj = new URL(cleanUrl);

    // Check if host is allowed
    if (!ALLOWED_HOSTS.includes(urlObj.hostname)) {
      console.warn(`Blocked unauthorized host: ${urlObj.hostname}`);
      return defaultRedirect;
    }

    // Check path
    const pathMatch = ALLOWED_PATHS.some(
      (path) =>
        urlObj.pathname === path || urlObj.pathname.startsWith(`${path}/`),
    );

    if (!pathMatch) {
      console.warn(`Blocked unauthorized path: ${urlObj.pathname}`);
      return defaultRedirect;
    }

    // Sanitize and return
    return sanitizeQueryParams(urlObj.pathname + urlObj.search);
  } catch (e) {
    console.error("Invalid redirect URL:", e);
    return defaultRedirect;
  }
}

function sanitizeQueryParams(url: string): string {
  try {
    const [path, query] = url.split("?");

    if (!query) return path;

    // Parse and sanitize query params
    const params = new URLSearchParams(query);
    const sanitized = new URLSearchParams();

    for (const [key, value] of params.entries()) {
      // HTML encode values to prevent XSS
      const safeValue = htmlEncode(value);
      sanitized.set(htmlEncode(key), safeValue);
    }

    return `${path}?${sanitized.toString()}`;
  } catch {
    return url.split("?")[0]; // Return just the path if parsing fails
  }
}

export function htmlEncode(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return "";

  // Remove any HTML tags
  const withoutTags = input.replace(/<[^>]*>/g, "");

  // HTML encode the result
  return htmlEncode(withoutTags);
}
