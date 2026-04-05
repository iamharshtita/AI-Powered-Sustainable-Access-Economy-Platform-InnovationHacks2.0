'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, ShieldCheck, Leaf, Star, Calendar, ChevronRight,
  PackageOpen, Bell, Settings, LogOut, Award, LogIn
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TABS = ['Reward History', 'Transactions'] as const;

const REWARD_HISTORY = [
  { id: 1, icon: '📸', title: 'Borrowed · Professional Mirrorless Camera', date: 'Jan 25, 2026 · 7 days', status: 'completed', co2: 12.5 },
  { id: 2, icon: '🧘', title: 'Borrowed · Natural Cork Yoga Mat', date: 'Feb 15, 2026 · 14 days', status: 'completed', co2: 4.2 },
  { id: 3, icon: '💡', title: 'Bought Resale · Mid-Century Modern Desk Lamp', date: 'Mar 5, 2026', status: 'completed', co2: 8.7 },
  { id: 4, icon: '📖', title: 'Borrowed · E-Reader with Warm Light', date: 'Mar 20, 2026 · 21 days', status: 'active', co2: 6.1 },
  { id: 5, icon: '🚲', title: 'Borrowed · Carbon Road Bicycle', date: 'Feb 20, 2026 · 3 days', status: 'completed', co2: 15.3 },
  { id: 6, icon: '🎧', title: 'Borrowed · Premium Noise-Canceling Headphones', date: 'Mar 10, 2026 · 5 days', status: 'completed', co2: 3.8 },
];

const REDEEM_TIERS = [
  { points: 500, credit: '$25 credit' },
  { points: 1000, credit: '$55 credit' },
  { points: 2000, credit: '$120 credit' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

interface Auth0User {
  name?: string;
  email?: string;
  picture?: string;
  sub?: string;
  nickname?: string;
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Reward History');
  const [user, setUser] = useState<Auth0User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbProfile, setDbProfile] = useState<Record<string, string | number> | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/auth/profile', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setUser(data ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user?.sub) return;
    fetch(`/api/profile?user_id=${encodeURIComponent(user.sub)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setDbProfile(data);
        }
      })
      .catch(() => {});
  }, [user?.sub]);

  const handleLogout = () => {
    document.cookie = 'reearth_onboarded=; path=/; max-age=0';
    window.location.href = '/auth/logout';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-3 border-leaf/20 border-t-leaf rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <User size={48} className="text-earth-300" />
        <h2 className="text-xl font-bold text-earth">Not signed in</h2>
        <p className="text-earth-400 text-sm">Sign in to view your profile</p>
        <a
          href="/auth/login"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-leaf to-leaf-dark text-white text-sm font-bold shadow-lg shadow-leaf/25 hover:shadow-xl transition-all"
        >
          <LogIn size={16} />
          Sign In
        </a>
      </div>
    );
  }

  const displayName = user.name || user.nickname || user.email || 'User';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-earth-200/60 shadow-sm overflow-hidden mb-8"
      >
        {/* Avatar + name */}
        <div className="px-6 sm:px-8 py-6 sm:py-8">
          <div className="flex items-center gap-4 sm:gap-5 mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-leaf to-ocean flex items-center justify-center shrink-0"
            >
              <span className="text-2xl sm:text-3xl font-bold text-white">{initials}</span>
            </motion.div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-heading)] text-earth">
                {(dbProfile?.display_name as string) || displayName}
              </h1>
              <p className="text-earth-500 text-sm flex items-center gap-1.5 mt-0.5">
                <Calendar size={13} />
                {user.email || 'Member'}
              </p>
              {dbProfile?.address && (
                <p className="text-earth-400 text-xs mt-1">📍 {dbProfile.address as string}</p>
              )}
              {dbProfile?.phone_number && (
                <p className="text-earth-400 text-xs mt-0.5">📞 {dbProfile.phone_number as string}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-6 sm:gap-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', bounce: 0.3 }}
              className="flex items-center gap-2"
            >
              <ShieldCheck size={18} className="text-leaf-dark" />
              <div>
                <p className="text-xl font-bold text-leaf-dark">92.5</p>
                <p className="text-[11px] text-earth-400">Trust Score · Excellent</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', bounce: 0.3 }}
              className="flex items-center gap-2"
            >
              <Award size={18} className="text-amber" />
              <div>
                <p className="text-xl font-bold text-amber">2,450</p>
                <p className="text-[11px] text-earth-400">Reward Points</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', bounce: 0.3 }}
              className="flex items-center gap-2"
            >
              <Leaf size={18} className="text-ocean-dark" />
              <div>
                <p className="text-xl font-bold text-ocean-dark">78.4 kg</p>
                <p className="text-[11px] text-earth-400">CO₂ Saved</p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Tabs & History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-earth-200/60 shadow-sm overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex border-b border-earth-100">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 px-6 py-3.5 text-sm font-semibold transition-colors ${
                  activeTab === tab ? 'text-leaf-dark' : 'text-earth-400 hover:text-earth-600'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="profile-tab"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-leaf rounded-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* History List */}
          <div className="divide-y divide-earth-100 max-h-[480px] overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.25 }}
              >
                {REWARD_HISTORY.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-earth-50/50 transition-colors group cursor-pointer"
                  >
                    <span className="text-xl shrink-0">{tx.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-earth truncate">{tx.title}</p>
                      <p className="text-xs text-earth-400 mt-0.5">{tx.date}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          tx.status === 'active'
                            ? 'bg-leaf/10 text-leaf-dark'
                            : 'text-earth-400'
                        }`}
                      >
                        {tx.status}
                      </span>
                      <span className="text-xs text-leaf-dark font-medium flex items-center gap-0.5">
                        <Leaf size={10} />
                        {tx.co2} kg
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right — Sidebar */}
        <div className="space-y-6">
          {/* Redeem Points */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-earth-200/60 shadow-sm p-5"
          >
            <h3 className="font-bold text-earth mb-1">Redeem Points</h3>
            <p className="text-xs text-earth-400 mb-4">
              You have 2,450 points. Redeem for discounts on your next borrow or purchase.
            </p>
            <div className="space-y-2">
              {REDEEM_TIERS.map((tier, i) => (
                <motion.div
                  key={tier.points}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  whileHover={{ x: 3 }}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-earth-50 border border-earth-200/40 cursor-pointer hover:border-leaf/20 transition-all"
                >
                  <span className="text-sm font-semibold text-earth">{tier.points} pts</span>
                  <span className="text-sm font-bold text-leaf-dark">{tier.credit}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl border border-earth-200/60 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-earth-100">
              <h3 className="text-xs font-bold text-earth-400 uppercase tracking-wider">Quick Actions</h3>
            </div>
            {[
              { icon: Bell, label: 'Notifications', href: '#' },
              { icon: Settings, label: 'Settings', href: '#' },
            ].map((action, i) => (
              <motion.div
                key={action.label}
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Link
                  href={action.href}
                  className="flex items-center gap-3 px-5 py-3.5 text-sm text-earth-600 hover:bg-earth-50 transition-colors group"
                >
                  <action.icon size={16} className="text-earth-400" />
                  <span className="flex-1">{action.label}</span>
                  <ChevronRight size={14} className="text-earth-300 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-5 py-3.5 text-sm text-coral hover:bg-coral/5 transition-colors w-full border-t border-earth-100 group"
            >
              <LogOut size={16} />
              <span className="flex-1 text-left">Sign Out</span>
              <ChevronRight size={14} className="text-coral/40 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
