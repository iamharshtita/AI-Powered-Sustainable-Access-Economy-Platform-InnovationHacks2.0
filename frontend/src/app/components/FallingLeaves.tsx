'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface LeafParticle {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  swayAmount: number;
  opacity: number;
  type: number; // 0-3 for different leaf shapes
}

const LEAF_COLORS = [
  'text-leaf/40',
  'text-leaf-dark/30',
  'text-leaf-light/50',
  'text-ocean/25',
  'text-amber/20',
];

function LeafSVG({ type, className }: { type: number; className?: string }) {
  switch (type % 4) {
    case 0:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20c4 0 8.71-3.13 9.49-7.5A14.28 14.28 0 0017 8z" />
          <path d="M12.71 3.29a1 1 0 00-1.42 0C8.56 6.03 7 9 7 12a5 5 0 005 5 5 5 0 005-5c0-3-1.56-5.97-4.29-8.71z" opacity="0.5" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M6.05 8.05a7 7 0 009.9 9.9L21 12V3h-9l-5.95 5.05zM15 9a1 1 0 10-2 0 1 1 0 002 0z" />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 22c4-4 8-7.58 8-12a8 8 0 10-16 0c0 4.42 4 8 8 12z" opacity="0.6" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M21 3c-1.5 5.5-4 9-8 11.5C9 17 5.5 18.5 3 21c2.5-10 7-15 18-18z" />
        </svg>
      );
  }
}

export default function FallingLeaves({ count = 18 }: { count?: number }) {
  const [leaves, setLeaves] = useState<LeafParticle[]>([]);

  useEffect(() => {
    const generated: LeafParticle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 14 + 10,
      delay: Math.random() * 12,
      duration: Math.random() * 8 + 10,
      rotation: Math.random() * 360,
      swayAmount: Math.random() * 80 + 40,
      opacity: Math.random() * 0.4 + 0.15,
      type: Math.floor(Math.random() * 4),
    }));
    setLeaves(generated);
  }, [count]);

  if (leaves.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {leaves.map((leaf) => (
        <motion.div
          key={leaf.id}
          className={LEAF_COLORS[leaf.id % LEAF_COLORS.length]}
          style={{
            position: 'absolute',
            left: `${leaf.x}%`,
            top: -30,
            width: leaf.size,
            height: leaf.size,
          }}
          animate={{
            y: ['0vh', '105vh'],
            x: [0, leaf.swayAmount, -leaf.swayAmount / 2, leaf.swayAmount / 3, 0],
            rotate: [leaf.rotation, leaf.rotation + 360 + Math.random() * 180],
          }}
          transition={{
            y: {
              duration: leaf.duration,
              repeat: Infinity,
              delay: leaf.delay,
              ease: 'linear',
            },
            x: {
              duration: leaf.duration * 0.8,
              repeat: Infinity,
              delay: leaf.delay,
              ease: 'easeInOut',
            },
            rotate: {
              duration: leaf.duration * 1.2,
              repeat: Infinity,
              delay: leaf.delay,
              ease: 'linear',
            },
          }}
        >
          <LeafSVG
            type={leaf.type}
            className="w-full h-full"
          />
        </motion.div>
      ))}
    </div>
  );
}
