/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    dirs: ['app', 'components', 'lib', 'hooks', 'services'],
  },
  images: {
    unoptimized: true,
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // experimental: {
  //   typedRoutes: true,
  // },
  webpack: (config) => {
    // Exclude pages/ folder from being treated as Next.js pages
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
}

export default nextConfig