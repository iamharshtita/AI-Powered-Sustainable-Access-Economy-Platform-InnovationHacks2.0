'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function NudgeAlert() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-6 right-6 w-[360px] z-50 bg-white rounded-2xl shadow-2xl shadow-earth/10 border border-earth-200 overflow-hidden"
      >
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-leaf to-ocean" />

        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 text-leaf-dark">
              <div className="w-8 h-8 rounded-full bg-leaf/10 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <span className="text-sm font-bold">Smart Suggestion</span>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-earth-400 hover:text-earth-600 transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-sm text-earth-600 leading-relaxed mb-4">
            You&apos;ve looked at power drills 3 times this month. Borrowing
            costs <strong className="text-earth font-semibold">$12/day</strong>{' '}
            vs <strong className="text-earth font-semibold">$150</strong> to buy
            new!
          </p>

          <div className="flex gap-2">
            <Link href="/dashboard" className="flex-1">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-1.5 bg-leaf text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-leaf-dark transition-colors"
              >
                See Savings
                <ArrowRight size={14} />
              </motion.div>
            </Link>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsVisible(false)}
              className="flex-1 bg-earth-100 text-earth-500 text-sm font-medium py-2.5 rounded-xl hover:bg-earth-200 transition-colors"
            >
              Dismiss
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
