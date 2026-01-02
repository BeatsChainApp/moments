/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is actually a Node.js Express app, not Next.js
  // This file exists only to satisfy Vercel's framework detection
  experimental: {
    serverComponentsExternalPackages: ['express']
  },
  // Disable Next.js features
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  // Custom server
  useFileSystemPublicRoutes: false
}

module.exports = nextConfig