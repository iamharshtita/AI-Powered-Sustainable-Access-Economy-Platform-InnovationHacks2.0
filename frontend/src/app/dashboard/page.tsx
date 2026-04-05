'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Leaf, DollarSign, PackageOpen, ShoppingBag, TrendingUp,
  TreePine, Car, Trophy, X, Lightbulb, Sparkles, Loader2
} from 'lucide-react';

const CATEGORY_COLORS = ['#22c55e', '#06b6d4', '#f59e0b', '#8b5cf6', '#f43f5e', '#ec4899', '#14b8a6', '#6366f1'];

interface DashboardStats {
  borrow_count: number;
  buy_count: number;
  co2_saved_kg: number;
  money_saved: number;
  eco_score: number;
  trees_equivalent: number;
  car_miles_avoided: number;
}

interface CategoryStat {
  name: string;
  count: number;
  co2: number;
  pct: number;
}

function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {prefix}{value}{suffix}
    </motion.span>
  );
}

export default function DashboardPage() {
  const [dismissedInsights, setDismissedInsights] = useState<number[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Try to get user ID
        let userId = '';
        try {
          const authRes = await fetch('/auth/profile', { credentials: 'same-origin' });
          if (authRes.ok) {
            const user = await authRes.json();
            userId = user?.sub || '';
          }
        } catch {}

        const params = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
        const res = await fetch(`/api/dashboard${params}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setCategories(data.category_breakdown || []);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard:', err);
      }
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="text-leaf animate-spin" />
      </div>
    );
  }

  const s = stats || {
    borrow_count: 0, buy_count: 0, co2_saved_kg: 0,
    money_saved: 0, eco_score: 50, trees_equivalent: 0, car_miles_avoided: 0,
  };

  const STATS_DISPLAY = [
    { label: 'Items Borrowed', value: s.borrow_count, suffix: '', icon: PackageOpen, color: 'text-leaf-dark', bg: 'from-leaf/10 to-leaf/5', borderColor: 'border-leaf/15' },
    { label: 'Items Purchased', value: s.buy_count, suffix: '', icon: ShoppingBag, color: 'text-ocean-dark', bg: 'from-ocean/10 to-ocean/5', borderColor: 'border-ocean/15' },
    { label: 'CO₂ Saved', value: s.co2_saved_kg, suffix: ' kg', icon: Leaf, color: 'text-leaf-dark', bg: 'from-leaf/10 to-leaf/5', borderColor: 'border-leaf/15' },
    { label: 'Money Saved', value: s.money_saved, suffix: '', prefix: '$', icon: DollarSign, color: 'text-amber', bg: 'from-amber/10 to-amber/5', borderColor: 'border-amber/15' },
  ];

  const INSIGHTS = [
    {
      icon: Lightbulb,
      color: 'text-amber',
      bg: 'bg-amber/10',
      borderColor: 'border-amber/15',
      text: `You've borrowed ${s.borrow_count} items so far. Before buying, why not borrow first to make sure it fits your routine?`,
      cta: 'See borrowing options →',
    },
    {
      icon: Leaf,
      color: 'text-leaf-dark',
      bg: 'bg-leaf/10',
      borderColor: 'border-leaf/15',
      text: `Great job! You saved ${s.co2_saved_kg} kg of CO₂ by choosing sustainability. That's like planting ${s.trees_equivalent} trees! 🌿`,
      cta: '',
    },
  ];

  const IMPACT = [
    { icon: TreePine, value: String(s.trees_equivalent), label: 'Trees Equivalent', desc: `Your CO₂ savings equal planting ${s.trees_equivalent} mature trees`, color: 'text-leaf-dark', bg: 'bg-leaf/5' },
    { icon: Car, value: String(s.car_miles_avoided), label: 'Car Miles Avoided', desc: `Equivalent to not driving ${s.car_miles_avoided} miles`, color: 'text-ocean-dark', bg: 'bg-ocean/5' },
    { icon: Trophy, value: 'Top 12%', label: 'Community Rank', desc: "You're in the top 12% of sustainable users", color: 'text-amber', bg: 'bg-amber/5' },
  ];

  const SUGGESTIONS = [
    {
      badge: `Borrowed ${s.borrow_count > 5 ? s.borrow_count + 'x' : '5x'} in electronics`,
      badgeColor: 'bg-leaf/10 text-leaf-dark',
      text: `You've borrowed electronics frequently. Buying a pair of headphones could save you $195 over the next year based on your usage pattern.`,
      keepLabel: 'Keep Borrowing', keepValue: '$375/yr', buyLabel: 'Buy Now', buyValue: '$180',
    },
    {
      badge: `Borrowed ${Math.min(s.borrow_count, 3)}x in sports`,
      badgeColor: 'bg-coral/10 text-coral',
      text: `You've borrowed sports gear ${Math.min(s.borrow_count, 3)} times. At your current rate, borrowing still makes sense for another 6 months.`,
      keepLabel: 'Keep Borrowing', keepValue: '$540/yr', buyLabel: 'Buy Now', buyValue: '$950',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-heading)] text-earth">
            Consumption Mirror
          </h1>
          <p className="text-earth-500 text-sm mt-1">Your sustainability journey at a glance</p>
        </div>

        {/* Eco Score Ring */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', bounce: 0.4, delay: 0.3 }}
          className="relative w-20 h-20 shrink-0 self-start sm:self-auto"
        >
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <motion.circle
              cx="50" cy="50" r="42" fill="none" stroke="#22c55e" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - s.eco_score / 100) }}
              transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-earth">{s.eco_score}</span>
            <span className="text-[9px] text-earth-400 font-medium">Eco Score</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STATS_DISPLAY.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, boxShadow: '0 20px 40px -15px rgba(0,0,0,0.1)' }}
            className={`bg-gradient-to-br ${stat.bg} rounded-2xl border ${stat.borderColor} p-5 transition-all`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-earth-500">{stat.label}</p>
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center"
              >
                <stat.icon size={18} className={stat.color} />
              </motion.div>
            </div>
            <div className="flex items-end gap-2">
              <p className={`text-3xl font-bold ${stat.color}`}>
                <AnimatedCounter value={stat.value} prefix={stat.prefix || ''} suffix={stat.suffix} />
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Smart Insights */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mb-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-earth mb-4">
          <Sparkles size={18} className="text-leaf-dark" />
          Smart Insights
        </h2>
        <div className="space-y-3">
          <AnimatePresence>
            {INSIGHTS.map((insight, i) =>
              !dismissedInsights.includes(i) ? (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className={`flex items-start gap-3 p-4 rounded-xl border ${insight.borderColor} bg-white`}
                >
                  <div className={`w-9 h-9 rounded-full ${insight.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <insight.icon size={16} className={insight.color} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-earth-600 leading-relaxed">{insight.text}</p>
                    {insight.cta && (
                      <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-dark mt-2 hover:underline">
                        {insight.cta}
                      </Link>
                    )}
                  </div>
                  <button
                    onClick={() => setDismissedInsights((prev) => [...prev, i])}
                    className="text-earth-300 hover:text-earth-500 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ) : null
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* CO₂ Saved by Category — from DB */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-earth-200/60 p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold text-earth mb-1">CO₂ Saved by Category</h2>
          <p className="text-sm text-earth-400 mb-6">Top impact categories from your transactions</p>

          <div className="space-y-4">
            {categories.length > 0 ? (
              categories.slice(0, 6).map((cat, i) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                >
                  <div className="flex justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span className="font-medium text-earth">{cat.name}</span>
                    </div>
                    <span className="text-earth-400">{cat.co2} kg ({cat.pct}%)</span>
                  </div>
                  <div className="w-full bg-earth-100 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${cat.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                    />
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-earth-400 text-center py-8">No category data yet</p>
            )}
          </div>
        </motion.div>

        {/* Transaction Summary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-earth-200/60 p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold text-earth mb-1">Impact Breakdown</h2>
          <p className="text-sm text-earth-400 mb-6">Your sustainability contribution</p>

          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-leaf/5 border border-leaf/10">
              <div className="w-12 h-12 rounded-full bg-leaf/10 flex items-center justify-center">
                <PackageOpen size={20} className="text-leaf-dark" />
              </div>
              <div>
                <p className="text-2xl font-bold text-leaf-dark">{s.borrow_count}</p>
                <p className="text-xs text-earth-400">Items kept in circulation</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-ocean/5 border border-ocean/10">
              <div className="w-12 h-12 rounded-full bg-ocean/10 flex items-center justify-center">
                <Leaf size={20} className="text-ocean-dark" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ocean-dark">{s.co2_saved_kg} kg</p>
                <p className="text-xs text-earth-400">CO₂ emissions prevented</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber/5 border border-amber/10">
              <div className="w-12 h-12 rounded-full bg-amber/10 flex items-center justify-center">
                <DollarSign size={20} className="text-amber" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber">${s.money_saved.toLocaleString()}</p>
                <p className="text-xs text-earth-400">Money saved through sharing economy</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Environmental Impact */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-earth mb-4">
          <Leaf size={18} className="text-leaf-dark" />
          Your Environmental Impact
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {IMPACT.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.1, type: 'spring', bounce: 0.3 }}
              whileHover={{ y: -4 }}
              className={`${item.bg} rounded-2xl border border-earth-200/40 p-6 text-center transition-all`}
            >
              <motion.div whileHover={{ rotate: 15, scale: 1.2 }} transition={{ type: 'spring' }} className="mx-auto mb-3">
                <item.icon size={28} className={item.color} />
              </motion.div>
              <p className={`text-3xl font-bold ${item.color} mb-1`}>{item.value}</p>
              <p className="text-sm font-semibold text-earth mb-1">{item.label}</p>
              <p className="text-xs text-earth-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Smart Buy Suggestions */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <h2 className="flex items-center gap-2 text-lg font-bold text-earth mb-4">
          <PackageOpen size={18} className="text-leaf-dark" />
          Smart Buy Suggestions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SUGGESTIONS.map((sug, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              whileHover={{ y: -3, boxShadow: '0 15px 30px -10px rgba(0,0,0,0.08)' }}
              className="bg-white rounded-2xl border border-earth-200/60 p-5 shadow-sm transition-all"
            >
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${sug.badgeColor} mb-3`}>
                {sug.badge}
              </span>
              <p className="text-sm text-earth-600 leading-relaxed mb-4">{sug.text}</p>
              <div className="flex items-center gap-4 p-3 rounded-xl bg-earth-50/80">
                <div className="flex-1 text-center">
                  <p className="text-xs text-earth-400 mb-0.5">{sug.keepLabel}</p>
                  <p className="text-lg font-bold text-earth">{sug.keepValue}</p>
                </div>
                <span className="text-xs text-earth-300 font-medium">vs</span>
                <div className="flex-1 text-center">
                  <p className="text-xs text-earth-400 mb-0.5">{sug.buyLabel}</p>
                  <p className="text-lg font-bold text-leaf-dark">{sug.buyValue}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
