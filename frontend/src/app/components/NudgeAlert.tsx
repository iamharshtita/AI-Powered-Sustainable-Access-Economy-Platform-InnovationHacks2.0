'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  borrow_count: number;
  buy_count: number;
  co2_saved_kg: number;
  money_saved: number;
}

export default function NudgeAlert() {
  const [isVisible, setIsVisible] = useState(false);
  const [user, setUser] = useState<{ sub?: string } | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    // Only show nudge to signed-in users
    fetch('/auth/profile', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        if (!data) return; // Not signed in — do NOT show nudge
        setUser(data);

        // Fetch their dashboard stats for personalized nudge
        try {
          const userId = data?.sub || '';
          const params = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
          const res = await fetch(`/api/dashboard${params}`);
          if (res.ok) {
            const dashData = await res.json();
            setStats(dashData.stats || null);
          }
        } catch {}

        // Show the nudge after a short delay
        setTimeout(() => setIsVisible(true), 2500);
      })
      .catch(() => {});
  }, []);

  if (!isVisible || !user) return null;

  // Build personalized message based on dashboard stats
  const borrowCount = stats?.borrow_count ?? 0;
  const moneyText = stats?.money_saved && stats.money_saved > 0
    ? `You've already saved $${stats.money_saved} by borrowing!`
    : `Borrowing costs just $12/day vs $150 to buy new!`;

  const nudgeText = borrowCount > 3
    ? `You've borrowed ${borrowCount} items! Before your next purchase, check if you can borrow it first — ${moneyText}`
    : `You've looked at power drills 3 times this month. ${moneyText}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-6 right-6 w-[360px] z-50 bg-white dark:bg-[#0f1c33] rounded-2xl shadow-2xl shadow-earth/10 border border-earth-200 dark:border-white/8 overflow-hidden"
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
              className="text-earth-400 hover:text-earth-600 dark:hover:text-earth-200 transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-sm text-earth-600 dark:text-earth-400 leading-relaxed mb-4">
            {nudgeText}
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
              className="flex-1 bg-earth-100 dark:bg-white/8 text-earth-500 dark:text-earth-400 text-sm font-medium py-2.5 rounded-xl hover:bg-earth-200 dark:hover:bg-white/12 transition-colors"
            >
              Dismiss
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
