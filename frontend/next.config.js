/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { domains: ['pub-6ae4c66941734f46886ef8c15900c8ec.r2.dev', 'avatars.githubusercontent.com'] }
};

module.exports = nextConfig;
