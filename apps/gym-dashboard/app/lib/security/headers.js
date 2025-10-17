/**
 * Security Headers Configuration
 * Implements defense-in-depth with multiple security layers
 */

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.stripe.com https://*.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: https://*.supabase.co https://*.googleapis.com https://*.stripe.com",
      "media-src 'self' https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co https://*.stripe.com wss://*.supabase.co https://api.anthropic.com https://api.openai.com",
      "frame-src 'self' https://*.stripe.com https://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "block-all-mixed-content",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

// Additional headers for static file security
const staticFileHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=31536000, immutable",
  },
];

// Headers to block sensitive files
const blockSensitiveFiles = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive, nosnippet",
  },
  {
    key: "Content-Type",
    value: "text/plain",
  },
];

// Export for CommonJS (next.config.js)
module.exports = {
  securityHeaders,
  staticFileHeaders,
  blockSensitiveFiles,
};
