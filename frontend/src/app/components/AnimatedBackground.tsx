'use client';
import { useEffect, useState } from 'react';

export default function AnimatedBackground() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Apply saved theme on mount
    const saved = localStorage.getItem('reearth-theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }

    // Listen for theme changes (toggled from nav)
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const bgGradient = isDark
    ? 'linear-gradient(135deg, #060d1f, #0a1628, #060d1f)'
    : 'linear-gradient(135deg, #f8fafc, #ffffff, #f8fafc)';

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      style={{ isolation: 'isolate' }}
    >
      {/* Deep base gradient — JS-driven for reliable dark/light switch */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{ background: bgGradient }}
      />

      {/* Animated color blobs */}
      <div
        className="animated-bg-blob-1 absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full transition-opacity duration-700"
        style={{
          background: 'radial-gradient(circle, #22c55e 0%, #06b6d4 60%, transparent 100%)',
          filter: 'blur(80px)',
          opacity: isDark ? 0.15 : 0.07,
        }}
      />
      <div
        className="animated-bg-blob-2 absolute top-[20%] right-[-10%] w-[700px] h-[700px] rounded-full transition-opacity duration-700"
        style={{
          background: 'radial-gradient(circle, #8b5cf6 0%, #06b6d4 50%, transparent 100%)',
          filter: 'blur(100px)',
          opacity: isDark ? 0.12 : 0.06,
        }}
      />
      <div
        className="animated-bg-blob-3 absolute bottom-[-5%] left-[20%] w-[500px] h-[500px] rounded-full transition-opacity duration-700"
        style={{
          background: 'radial-gradient(circle, #f59e0b 0%, #22c55e 60%, transparent 100%)',
          filter: 'blur(90px)',
          opacity: isDark ? 0.11 : 0.05,
        }}
      />
      <div
        className="animated-bg-blob-4 absolute bottom-[30%] right-[15%] w-[400px] h-[400px] rounded-full transition-opacity duration-700"
        style={{
          background: 'radial-gradient(circle, #f43f5e 0%, #8b5cf6 70%, transparent 100%)',
          filter: 'blur(70px)',
          opacity: isDark ? 0.1 : 0.05,
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34,197,94,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,197,94,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          opacity: isDark ? 0.03 : 0.018,
        }}
      />
    </div>
  );
}
