/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@atlas-fitness/shared-ui", "@atlas-fitness/database", "@atlas-fitness/auth"],
  env: {
    NEXT_PUBLIC_APP_TYPE: 'member',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_MEMBER_URL || 'https://members.gymleadhub.co.uk',
  },
}

module.exports = nextConfig
