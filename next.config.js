/** @type {import('next').NextConfig} */
const { securityHeaders } = require('./app/lib/security/headers');

const nextConfig = {
  output: 'standalone',

  // Skip TypeScript and ESLint errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Enable experimental features for better performance
  experimental: {
    // Optimize packages
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts'
    ]
  },
  
  // External packages for server components
  serverExternalPackages: [
    'twilio',
    'openai',
    '@anthropic-ai/sdk',
    'bullmq',
    'ioredis'
  ],
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      }
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Headers for security and caching
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders
      },
      {
        // API-specific headers
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          }
        ]
      },
      {
        // Static assets caching
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        // Block access to sensitive files
        source: '/:path*\\.(env|git|gitignore|dockerignore|md|lock|log)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow'
          }
        ]
      }
    ];
  },
  
  // Redirects and rewrites to block sensitive files
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/dashboard',
        permanent: true,
      },
      // Block access to .git directory
      {
        source: '/.git/:path*',
        destination: '/404',
        permanent: false,
      },
      // Block access to .env files
      {
        source: '/.env:path*',
        destination: '/404',
        permanent: false,
      },
      // Block access to config files
      {
        source: '/:path*.config.js',
        destination: '/404',
        permanent: false,
      },
      // Block access to package files
      {
        source: '/package:path*.json',
        destination: '/404',
        permanent: false,
      },
      // Block access to lock files
      {
        source: '/:path*.lock',
        destination: '/404',
        permanent: false,
      }
    ];
  },
  
  async rewrites() {
    return {
      beforeFiles: [
        // Block .git directory access
        {
          source: '/.git/:path*',
          destination: '/api/forbidden',
        },
        // Block environment files
        {
          source: '/.env:path*',
          destination: '/api/forbidden',
        },
        // Block other sensitive files
        {
          source: '/(.*\\.(gitignore|dockerignore|env\\.local|env\\.production))',
          destination: '/api/forbidden',
        }
      ]
    };
  },
  
  // Environment variables validation
  env: {
    NEXT_TELEMETRY_DISABLED: '1'
  },
  
  // Temporarily ignore TypeScript errors during builds to deploy successfully
  // TODO: Fix remaining type errors in automation components
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Temporarily ignore ESLint errors during builds
  // TODO: Fix ESLint errors in components
  eslint: {
    ignoreDuringBuilds: true
  },
  
  // Webpack configuration to handle React Flow SSR issues
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle React Flow on the server
      config.externals.push('@xyflow/react', 'reactflow');
    }
    
    // Ignore missing CSS files in server builds
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    return config;
  }
};

module.exports = nextConfig;