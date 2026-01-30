/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Disable all caching
  generateEtags: false,
  poweredByHeader: false,
  // Force revalidation
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    // Пустая конфигурация для Turbopack
  },
  webpack: (config, { dev, isServer }) => {
    // Оптимизация для мобильных устройств
    if (!dev && !isServer) {
      // Удаляем devtools и source maps в production
      config.devtool = false;
      
      // Оптимизация размера бандла
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
            },
          },
        },
      };
    }
    
    return config;
  },
}

export default nextConfig
