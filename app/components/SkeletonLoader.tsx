'use client';

export default function SkeletonLoader() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pb-32">
      {[...Array(8)].map((_, index) => (
        <div key={index} className="animate-fade-in-up animate-delay-100">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl overflow-hidden shadow-xl backdrop-blur border border-purple-500/20">
            <div className="relative aspect-square bg-slate-800">
              <div className="skeleton w-full h-full" />
            </div>
            <div className="p-4">
              <div className="skeleton skeleton-text h-3 mb-2" />
              <div className="skeleton skeleton-text h-4 mb-3" />
              <div className="skeleton skeleton-text h-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
