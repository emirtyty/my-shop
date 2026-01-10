/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Это поможет избежать проблем с путями в APK
  trailingSlash: true, 
};

export default nextConfig;