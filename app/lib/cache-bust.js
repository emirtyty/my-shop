// Cache busting strategy for Vercel
// This file will force Vercel to invalidate all cached assets

// Force cache invalidation by changing filename
export const CACHE_BUST = `v2.0.1-${Date.now()}`;

// Add cache busting to all static assets
export const addCacheBusting = (url) => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${CACHE_BUST}`;
};

// Export for use in components
export default CACHE_BUST;
