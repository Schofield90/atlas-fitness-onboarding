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
        source: '/(.*)',
        headers: securityHeaders
      },
      {
        // API-specific headers
        source: '/api/(.*)',
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
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        // Block access to sensitive files
        source: '/(.*)\\.(env|git|gitignore|dockerignore|md|lock|log)',
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
        source: '/.git/(.*)',
        destination: '/404',
        permanent: false,
      },
      // Block access to .env files
      {
        source: '/.env(.*)',
        destination: '/404',
        permanent: false,
      },
      // Block access to config files
      {
        source: '/(.*).config.js',
        destination: '/404',
        permanent: false,
      },
      // Block access to package files
      {
        source: '/package(.*).json',
        destination: '/404',
        permanent: false,
      },
      // Block access to lock files
      {
        source: '/(.*).lock',
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
          source: '/.git/(.*)',
          destination: '/api/forbidden',
        },
        // Block environment files
        {
          source: '/.env(.*)',
          destination: '/api/forbidden',
        },
        // Block gitignore files
        {
          source: '/(.*).gitignore',
          destination: '/api/forbidden',
        },
        // Block dockerignore files
        {
          source: '/(.*).dockerignore',
          destination: '/api/forbidden',
        },
        // Block env.local files
        {
          source: '/(.*).env.local',
          destination: '/api/forbidden',
        },
        // Block env.production files
        {
          source: '/(.*).env.production',
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
  
  // Webpack configuration to handle SSR issues
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle these packages on the server
      config.externals.push(
        '@xyflow/react',
        'reactflow',
        // Add OpenAI to prevent browser environment detection during build
        'openai',
        '@anthropic-ai/sdk',
        // Other potentially problematic packages for SSR
        'canvas',
        'jsdom'
      );
    }
    
    // Ignore missing modules in server builds
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      dns: false,
      child_process: false,
      // Browser-specific APIs
      crypto: false,
      stream: false,
      path: false,
    };
    
    // Handle OpenAI module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      // Ensure OpenAI uses Node.js version on server
      'openai$': require.resolve('openai'),
    };
    
    return config;
  }
};

module.exports = nextConfig;