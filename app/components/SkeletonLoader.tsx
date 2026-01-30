'use client';

export default function SkeletonLoader() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pb-32">
      {[...Array(8)].map((_, index) => (
          <div className="rounded-2xl overflow-hidden shadow-xl backdrop-blur border animate-fade-in-up animate-delay-100" style={{
            background: 'linear-gradient(to bottom right, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.5))',
            borderColor: 'rgba(147, 51, 234, 0.2)'
          }}>
            <div className="relative aspect-square" style={{
              backgroundColor: '#1e293b'
            }}>
              <div className="w-full h-full skeleton" />
            </div>
            <div className="p-4">
              <div className="h-3 mb-2 skeleton skeleton-text" />
              <div className="h-4 mb-3 skeleton skeleton-text" />
              <div className="h-8 skeleton skeleton-text" />
            </div>
          </div>
      ))}
    </div>
  );
}
