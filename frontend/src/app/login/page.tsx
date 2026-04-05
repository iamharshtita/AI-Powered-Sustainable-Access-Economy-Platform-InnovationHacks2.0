'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { LogIn, UserPlus, Leaf, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import FallingLeaves from '../components/FallingLeaves';

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-earth-50">
      <FallingLeaves count={20} />

      {/* Background gradient orbs */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-leaf/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-32 w-80 h-80 bg-ocean/8 rounded-full blur-[100px] pointer-events-none" />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[920px] mx-4"
      >
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-earth/10 border border-white/60 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
          {/* Left — Auth */}
          <div className="p-8 sm:p-10">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', bounce: 0.3 }}
              className="flex items-center gap-3 mb-8"
            >
              <Image
                src="/logo.jpeg"
                alt="ReEarth"
                width={48}
                height={48}
                className="rounded-full"
                priority
              />
              <span className="text-2xl font-extrabold font-[family-name:var(--font-heading)] gradient-text">
                ReEarth
              </span>
            </motion.div>

            {/* Title */}
            <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-earth mb-1">
              Welcome back
            </h1>
            <p className="text-sm text-earth-400 mb-8">
              Sign in to continue your sustainable journey
            </p>

            {/* Auth buttons */}
            <div className="space-y-3">
              <motion.a
                href="/auth/login"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-leaf to-leaf-dark text-white text-sm font-bold shadow-lg shadow-leaf/25 hover:shadow-xl hover:shadow-leaf/30 transition-all"
              >
                <LogIn size={16} />
                Sign In
                <ArrowRight size={16} />
              </motion.a>

              <motion.a
                href="/auth/login?screen_hint=signup"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-leaf/20 text-leaf-dark text-sm font-semibold hover:bg-leaf/5 transition-colors"
              >
                <UserPlus size={16} />
                Create Account
              </motion.a>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-earth-200" />
              <span className="text-xs text-earth-400">secure authentication</span>
              <div className="flex-1 h-px bg-earth-200" />
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-earth-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-leaf" />
                Auth0 Secured
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber" />
                Google Sign-In
              </span>
              <span className="flex items-center gap-1.5">
                <Leaf size={14} className="text-ocean" />
                MFA Enabled
              </span>
            </div>
          </div>

          {/* Right — Marketing Panel */}
          <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-leaf via-leaf-dark to-ocean p-10 text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-lg" />
            <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full blur-lg" />

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-xs font-semibold mb-8">
                <Leaf size={12} />
                AI-Powered Sustainability
              </div>

              <h2 className="text-4xl font-extrabold font-[family-name:var(--font-heading)] leading-tight mb-4">
                Own Less.
                <br />
                <span className="text-leaf-light">Live More.</span>
              </h2>

              <p className="text-white/70 text-sm leading-relaxed mb-8 max-w-xs">
                Join thousands of conscious consumers making smarter choices.
                Borrow, buy resale, and earn rewards for every sustainable decision.
              </p>

              {/* Feature tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {['AI Recommendations', 'Borrow & Share', 'Earn Rewards', 'Track CO₂ Impact'].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium"
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 pt-6 border-t border-white/15">
              <div>
                <p className="text-2xl font-bold">12K+</p>
                <p className="text-xs text-white/60">Users</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <p className="text-2xl font-bold">45 tons</p>
                <p className="text-xs text-white/60">CO₂ Saved</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <p className="text-2xl font-bold">$890K</p>
                <p className="text-xs text-white/60">Saved</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
