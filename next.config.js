/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
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
    '@anthropic-ai/sdk'
  ],
  
  // Webpack optimizations
  webpack: (config, { dev, isServer, webpack }) => {
    // Fix for browser-only packages
    if (isServer) {
      // Create a mock module for server-side
      const mockModule = `module.exports = {};`;
      
      // Replace problematic modules with mock modules on server
      config.resolve.alias = {
        ...config.resolve.alias,
        'reactflow': require.resolve('./app/lib/mocks/empty.js'),
        '@reactflow/core': require.resolve('./app/lib/mocks/empty.js'),
        '@reactflow/node-resizer': require.resolve('./app/lib/mocks/empty.js'),
        '@reactflow/node-toolbar': require.resolve('./app/lib/mocks/empty.js'),
        '@reactflow/controls': require.resolve('./app/lib/mocks/empty.js'),
        '@reactflow/background': require.resolve('./app/lib/mocks/empty.js'),
        '@reactflow/minimap': require.resolve('./app/lib/mocks/empty.js'),
        '@dnd-kit/core': require.resolve('./app/lib/mocks/empty.js'),
        '@dnd-kit/sortable': require.resolve('./app/lib/mocks/empty.js'),
        '@dnd-kit/utilities': require.resolve('./app/lib/mocks/empty.js'),
        '@dnd-kit/modifiers': require.resolve('./app/lib/mocks/empty.js'),
      };
    }
    
    // Optimize for production
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            }
          }
        }
      };
    }
    
    // Ignore certain warnings
    config.ignoreWarnings = [
      { module: /node_modules\/punycode/ },
      { module: /node_modules\/encoding/ }
    ];
    
    // Add bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
          openAnalyzer: false
        })
      );
    }
    
    return config;
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
    NEXT_TELEMETRY_DISABLED: '1'
  }
};

// Add turbopack configuration if using --turbo
if (process.env.TURBOPACK) {
  nextConfig.experimental = {
    ...nextConfig.experimental,
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  };
}

module.exports = nextConfig;