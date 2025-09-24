/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@atlas-fitness/shared-ui", "@atlas-fitness/database", "@atlas-fitness/auth"],
  env: {
    NEXT_PUBLIC_APP_TYPE: 'admin',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.gymleadhub.co.uk',
  },
}

module.exports = nextConfig
