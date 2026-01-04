/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Next.js App Router for subscriber-facing app
  experimental: {
    serverComponentsExternalPackages: ['express']
  },
  
  // PWA and performance optimizations
  poweredByHeader: false,
  compress: true,
  
  // Static export for better deployment flexibility
  output: 'standalone',
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE || 'http://localhost:8080'
  },
  
  // Redirects for legacy routes
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin.html',
        permanent: true
      }
    ];
  },
  
  // Headers for PWA and security
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          }
        ]
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;