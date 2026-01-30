/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Disable all caching
  generateEtags: false,
  poweredByHeader: false,
  experimental: {
    isrMemoryCacheSize: 0,
  },
  // Force revalidation
  revalidate: 0,
}

export default nextConfig
