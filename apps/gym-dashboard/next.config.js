/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@atlas-fitness/shared-ui", "@atlas-fitness/database", "@atlas-fitness/auth", "@atlas-fitness/redis"],
  env: {
    NEXT_PUBLIC_APP_TYPE: 'gym',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_GYM_URL || 'https://login.gymleadhub.co.uk',
  },
}

module.exports = nextConfig
