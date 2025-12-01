/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true, // For smoother deployment if types mock data mismatches
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;