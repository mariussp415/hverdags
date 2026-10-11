import type { NextConfig } from 'next';

// GitHub Pages hosts project repos below /<repo>/; local dev stays at /.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};
export default nextConfig;
