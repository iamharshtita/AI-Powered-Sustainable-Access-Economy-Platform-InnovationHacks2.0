'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Leaf, DollarSign, PackageOpen, ShoppingBag, TrendingUp,
  TreePine, Car, Trophy, X, Lightbulb, Sparkles, ArrowRight
} from 'lucide-react';

// ---------- Data ----------
const STATS = [
  { label: 'Items Borrowed', value: 12, suffix: '', trend: '+18%', icon: PackageOpen, color: 'text-leaf-dark', bg: 'from-leaf/10 to-leaf/5', borderColor: 'border-leaf/15' },
  { label: 'Items Purchased', value: 3, suffix: '', trend: '', icon: ShoppingBag, color: 'text-ocean-dark', bg: 'from-ocean/10 to-ocean/5', borderColor: 'border-ocean/15' },
  { label: 'CO₂ Saved', value: 78.4, suffix: ' kg', trend: '+24%', icon: Leaf, color: 'text-leaf-dark', bg: 'from-leaf/10 to-leaf/5', borderColor: 'border-leaf/15' },
  { label: 'Money Saved', value: 1.3, suffix: 'k', prefix: '$', trend: '+15%', icon: DollarSign, color: 'text-amber', bg: 'from-amber/10 to-amber/5', borderColor: 'border-amber/15' },
];

const INSIGHTS = [
  {
    icon: Lightbulb,
    color: 'text-amber',
    bg: 'bg-amber/10',
    borderColor: 'border-amber/15',
    text: "You've been eyeing espresso machines a lot. Before buying, why not borrow one for a week to make sure it fits your routine?",
    cta: 'See borrowing options →',
  },
  {
    icon: Leaf,
    color: 'text-leaf-dark',
    bg: 'bg-leaf/10',
    borderColor: 'border-leaf/15',
    text: 'Great job this month! You saved 23.6 kg of CO₂ by choosing to borrow instead of buy. That\'s like planting 2 trees! 🌿',
    cta: '',
  },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
const ACTIVITY_DATA = [4, 8, 5, 12, 7, 24, 18];
const MAX_ACTIVITY = Math.max(...ACTIVITY_DATA);

const CATEGORY_CO2 = [
  { name: 'Electronics', pct: 35, color: '#22c55e' },
  { name: 'Sports', pct: 25, color: '#06b6d4' },
  { name: 'Wellness', pct: 18, color: '#f59e0b' },
  { name: 'Outdoor', pct: 14, color: '#8b5cf6' },
  { name: 'Kitchen', pct: 8, color: '#f43f5e' },
];

const IMPACT = [
  { icon: TreePine, value: '4', label: 'Trees Equivalent', desc: 'Your CO₂ savings equal planting 4 mature trees', color: 'text-leaf-dark', bg: 'bg-leaf/5' },
  { icon: Car, value: '196', label: 'Car Miles Avoided', desc: 'Equivalent to not driving 196 miles', color: 'text-ocean-dark', bg: 'bg-ocean/5' },
  { icon: Trophy, value: 'Top 12%', label: 'Community Rank', desc: "You're in the top 12% of sustainable users", color: 'text-amber', bg: 'bg-amber/5' },
];

const SUGGESTIONS = [
  {
    badge: 'Borrowed 5x in electronics',
    badgeColor: 'bg-leaf/10 text-leaf-dark',
    text: "You've borrowed electronics 5 times. Buying a pair of headphones could save you $195 over the next year based on your usage pattern.",
    keepLabel: 'Keep Borrowing',
    keepValue: '$375/yr',
    buyLabel: 'Buy Now',
    buyValue: '$180',
  },
  {
    badge: 'Borrowed 3x in sports',
    badgeColor: 'bg-coral/10 text-coral',
    text: "You've borrowed sports gear 3 times. At your current rate, consider buying — but borrowing still makes sense for another 6 months.",
    keepLabel: 'Keep Borrowing',
    keepValue: '$540/yr',
    buyLabel: 'Buy Now',
    buyValue: '$950',
  },
];

// ---------- Animated Counter ----------
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

// ---------- Component ----------
export default function DashboardPage() {
  const [dismissedInsights, setDismissedInsights] = useState<number[]>([]);
  const ecoScore = 87;

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
              animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - ecoScore / 100) }}
              transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-earth">{ecoScore}</span>
            <span className="text-[9px] text-earth-400 font-medium">Eco Score</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STATS.map((stat, i) => (
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
                className={`w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center`}
              >
                <stat.icon size={18} className={stat.color} />
              </motion.div>
            </div>
            <div className="flex items-end gap-2">
              <p className={`text-3xl font-bold ${stat.color}`}>
                <AnimatedCounter value={stat.value} prefix={stat.prefix || ''} suffix={stat.suffix} />
              </p>
              {stat.trend && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="text-xs font-semibold text-leaf-dark flex items-center gap-0.5 pb-1"
                >
                  <TrendingUp size={11} />
                  {stat.trend}
                </motion.span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Smart Insights */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mb-10"
      >
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
                      <Link href="/"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-dark mt-2 hover:underline"
                      >
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
        {/* Activity Over Time */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-earth-200/60 p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold text-earth mb-1">Activity Over Time</h2>
          <p className="text-sm text-earth-400 mb-6">Borrows & purchases per month</p>

          <div className="flex items-end justify-between gap-3" style={{ height: '200px' }}>
            {ACTIVITY_DATA.map((val, i) => {
              const barHeight = Math.round((val / MAX_ACTIVITY) * 160);
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full group">
                  <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                    className="text-xs font-semibold text-earth-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {val}
                  </motion.span>
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: barHeight }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.08, type: 'spring', bounce: 0.15 }}
                    whileHover={{ scaleX: 1.15 }}
                    className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-leaf to-ocean/80 cursor-pointer transition-transform origin-bottom"
                    style={{ minHeight: 4 }}
                  />
                  <span className="text-xs text-earth-400 shrink-0">{MONTHS[i]}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* CO₂ Saved by Category */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-earth-200/60 p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold text-earth mb-1">CO₂ Saved by Category</h2>
          <p className="text-sm text-earth-400 mb-6">Top impact categories</p>

          <div className="space-y-4">
            {CATEGORY_CO2.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.08 }}
              >
                <div className="flex justify-between text-sm mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium text-earth">{cat.name}</span>
                  </div>
                  <span className="text-earth-400">{cat.pct}%</span>
                </div>
                <div className="w-full bg-earth-100 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${cat.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Environmental Impact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-10"
      >
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
              <motion.div
                whileHover={{ rotate: 15, scale: 1.2 }}
                transition={{ type: 'spring' }}
                className="mx-auto mb-3"
              >
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
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

