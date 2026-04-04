'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle, Sparkles, Leaf, ArrowRight } from 'lucide-react';
import FallingLeaves from '../components/FallingLeaves';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'create'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise((r) => setTimeout(r, 800));

    if (username === 'user-test' && password === 'password-test') {
      // Set auth cookie
      document.cookie = 'reearth_auth=true; path=/; max-age=86400';
      router.push('/');
      router.refresh();
    } else {
      setError('Invalid credentials. Try user-test / password-test');
      setIsLoading(false);
    }
  };

  const fillTestCredentials = () => {
    setUsername('user-test');
    setPassword('password-test');
  };

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
          {/* Left — Form */}
          <div className="p-8 sm:p-10">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', bounce: 0.3 }}
              className="flex items-center gap-3 mb-8"
            >
              <Image
                src="/logo.png"
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

            {/* Tabs */}
            <div className="flex bg-earth-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => setActiveTab('signin')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'signin'
                    ? 'bg-white text-earth shadow-sm'
                    : 'text-earth-400 hover:text-earth-600'
                }`}
              >
                <LogIn size={15} />
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'create'
                    ? 'bg-white text-earth shadow-sm'
                    : 'text-earth-400 hover:text-earth-600'
                }`}
              >
                <UserPlus size={15} />
                Create Account
              </button>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-earth mb-1">
              Welcome back
            </h1>
            <p className="text-sm text-earth-400 mb-6">
              Sign in to continue your sustainable journey
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-earth-600 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400">
                    <UserPlus size={16} />
                  </span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-earth-50 border border-earth-200 text-earth placeholder:text-earth-400 text-sm outline-none focus:border-leaf/50 focus:ring-4 focus:ring-leaf/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-earth-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400">
                    <LogIn size={16} />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-earth-50 border border-earth-200 text-earth placeholder:text-earth-400 text-sm outline-none focus:border-leaf/50 focus:ring-4 focus:ring-leaf/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 text-coral text-sm bg-coral/5 border border-coral/20 rounded-xl px-4 py-2.5"
                  >
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-leaf to-leaf-dark text-white text-sm font-bold shadow-lg shadow-leaf/25 hover:shadow-xl hover:shadow-leaf/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    Sign In <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-earth-200" />
              <span className="text-xs text-earth-400">or</span>
              <div className="flex-1 h-px bg-earth-200" />
            </div>

            {/* Quick fill */}
            <button
              onClick={fillTestCredentials}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-leaf/20 text-leaf-dark text-sm font-semibold hover:bg-leaf/5 transition-colors"
            >
              <Sparkles size={15} />
              Use test credentials
            </button>
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
