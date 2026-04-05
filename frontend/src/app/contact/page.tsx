'use client';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Leaf, Sparkles } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-leaf/10 text-leaf-dark text-sm font-semibold mb-6 border border-leaf/20">
          <Sparkles size={14} className="animate-pulse" />
          <span>Get In Touch</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold font-[family-name:var(--font-heading)] text-earth dark:text-earth-200 mb-4 leading-tight">
          Contact Us
        </h1>
        <p className="text-earth-500 dark:text-earth-400 leading-relaxed">
          Have questions, feedback, or want to partner with us? We&apos;d love to hear from you.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-[#0f1c33] rounded-2xl border border-earth-200/60 dark:border-white/6 p-8 shadow-sm"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-earth dark:text-earth-200 mb-2">Your Name</label>
            <input
              type="text"
              placeholder="Jane Doe"
              className="w-full px-4 py-3 rounded-xl border border-earth-200 dark:border-white/10 bg-earth-50 dark:bg-white/5 text-earth dark:text-earth-200 placeholder:text-earth-400 focus:outline-none focus:border-leaf/50 focus:ring-2 focus:ring-leaf/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-earth dark:text-earth-200 mb-2">Email Address</label>
            <input
              type="email"
              placeholder="jane@example.com"
              className="w-full px-4 py-3 rounded-xl border border-earth-200 dark:border-white/10 bg-earth-50 dark:bg-white/5 text-earth dark:text-earth-200 placeholder:text-earth-400 focus:outline-none focus:border-leaf/50 focus:ring-2 focus:ring-leaf/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-earth dark:text-earth-200 mb-2">Message</label>
            <textarea
              rows={5}
              placeholder="Tell us what's on your mind..."
              className="w-full px-4 py-3 rounded-xl border border-earth-200 dark:border-white/10 bg-earth-50 dark:bg-white/5 text-earth dark:text-earth-200 placeholder:text-earth-400 focus:outline-none focus:border-leaf/50 focus:ring-2 focus:ring-leaf/10 transition-all resize-none"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-leaf to-leaf-dark text-white font-bold text-base shadow-lg shadow-leaf/20 flex items-center justify-center gap-2"
          >
            <MessageSquare size={18} />
            Send Message
          </motion.button>
        </div>

        <div className="mt-8 pt-6 border-t border-earth-100 dark:border-white/6 flex items-center gap-3 text-sm text-earth-500 dark:text-earth-400">
          <Mail size={16} className="text-leaf-dark shrink-0" />
          <span>Or reach us directly at <strong className="text-leaf-dark">hello@reearth.io</strong></span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-2 mt-6 text-xs text-earth-400 justify-center"
      >
        <Leaf size={12} className="text-leaf" />
        <span>ReEarth — AI-Powered Sustainable Access Economy</span>
      </motion.div>
    </div>
  );
}
