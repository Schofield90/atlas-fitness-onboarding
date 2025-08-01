/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Docker-specific settings
  webpackDevMiddleware: config => {
    // Enable polling for file changes in Docker
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
      ignored: /node_modules/
    }
    return config
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
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate'
          }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/dashboard',
        permanent: true,
      }
    ];
  },
  
  // Environment variables validation
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
    HOSTNAME: '0.0.0.0'
  }
};

module.exports = nextConfig;