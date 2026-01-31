/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Статический экспорт для мобильного
  trailingSlash: true,
  distDir: 'out', // Папка для статического экспорта
  images: {
    unoptimized: true,
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080],
    imageSizes: [16, 32, 64, 96, 128],
  },
  // Disable all caching для уменьшения размера
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
    // Агрессивная оптимизация для мобильных устройств
    if (!dev && !isServer) {
      // Удаляем devtools и source maps в production
      config.devtool = false;
      
      // Агрессивная оптимизация размера бандла
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          minSize: 10000,
          maxSize: 150000, // 150KB chunks
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
              maxSize: 200000, // 200KB для vendor
            },
          },
        },
      };
      
      // Удаляем неиспользуемые плагины
      config.plugins = config.plugins.filter(plugin => 
        plugin.constructor.name !== 'SourceMapDevToolPlugin'
      );
    }
    
    return config;
  },
}

export default nextConfig
