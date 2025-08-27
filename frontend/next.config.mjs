/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  webpack: (config) => {
    // Exclude pages/ folder from being treated as Next.js pages
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
}

export default nextConfig