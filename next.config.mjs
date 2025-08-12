/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Let the app build on Vercel even if ESLint finds problems
    ignoreDuringBuilds: true,
  },
  typescript: {
    // We're using JS, but this avoids type-check failures if TS creeps in
    ignoreBuildErrors: true,
  },
};
export default nextConfig;
