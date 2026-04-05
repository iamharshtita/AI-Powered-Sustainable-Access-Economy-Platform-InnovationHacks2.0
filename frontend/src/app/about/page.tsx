'use client';
import { motion } from 'framer-motion';
import { Leaf, Recycle, TrendingUp, Globe, Sparkles } from 'lucide-react';
import Link from 'next/link';

const VALUES = [
  { icon: Leaf, title: 'Borrow First', desc: 'Access what you need without the burden of ownership. Save money and the planet simultaneously.', color: 'text-leaf-dark', bg: 'bg-leaf/10' },
  { icon: Recycle, title: 'Circular Economy', desc: 'Every item given a second, third, and fourth life — reducing waste and keeping resources in motion.', color: 'text-ocean-dark', bg: 'bg-ocean/10' },
  { icon: TrendingUp, title: 'AI-Driven Decisions', desc: 'Our AI tells you exactly when to borrow, buy resale, or skip — backed by real data.', color: 'text-amber', bg: 'bg-amber/10' },
  { icon: Globe, title: 'Community Impact', desc: 'Together, ReEarth users have saved thousands of kg of CO₂ by sharing instead of buying new.', color: 'text-coral', bg: 'bg-coral/10' },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-leaf/10 text-leaf-dark text-sm font-semibold mb-6 border border-leaf/20">
          <Sparkles size={14} className="animate-pulse" />
          <span>Our Mission</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold font-[family-name:var(--font-heading)] text-earth dark:text-earth-200 mb-6 leading-tight">
          Rethinking How We
          <span className="gradient-text"> Access Things</span>
        </h1>
        <p className="text-lg text-earth-500 dark:text-earth-400 leading-relaxed max-w-2xl mx-auto">
          ReEarth is an AI-powered sharing economy platform that helps you borrow before you buy,
          choose resale over new, and understand the true environmental impact of your consumption.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16"
      >
        {VALUES.map((v, i) => (
          <motion.div
            key={v.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-[#0f1c33] rounded-2xl border border-earth-200/60 dark:border-white/6 p-6"
          >
            <div className={`w-12 h-12 rounded-xl ${v.bg} flex items-center justify-center mb-4`}>
              <v.icon size={22} className={v.color} />
            </div>
            <h3 className="text-lg font-bold text-earth dark:text-earth-200 mb-2">{v.title}</h3>
            <p className="text-sm text-earth-500 dark:text-earth-400 leading-relaxed">{v.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center"
      >
        <p className="text-earth-500 dark:text-earth-400 mb-6">
          Ready to start your sustainable journey?
        </p>
        <Link href="/auth/login">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-leaf to-leaf-dark text-white font-bold text-base shadow-lg shadow-leaf/20"
          >
            <Leaf size={18} />
            Join ReEarth Today
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
