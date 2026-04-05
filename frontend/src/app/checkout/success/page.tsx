'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { CheckCircle, Leaf, Award, ArrowRight, Sparkles, ShoppingBag } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const itemId = searchParams.get('item_id');
  const type = searchParams.get('type');
  const duration = searchParams.get('duration');

  const [result, setResult] = useState<{
    transaction_id?: string;
    reward_points_awarded?: number;
    co2_saved_kg?: number;
    message?: string;
  } | null>(null);
  const [recorded, setRecorded] = useState(false);

  useEffect(() => {
    if (!sessionId || recorded) return;

    // Record the transaction
    const recordTransaction = async () => {
      try {
        // Get user info
        const userRes = await fetch('/auth/profile', { credentials: 'same-origin' });
        const user = userRes.ok ? await userRes.json() : null;
        const userId = user?.sub || 'anonymous';

        // Get item info
        const itemRes = await fetch(`/api/listings?q=`);
        const itemData = itemRes.ok ? await itemRes.json() : { listings: [] };
        const item = itemData.listings?.find((l: { id: string }) => l.id === itemId) || {};

        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            item_id: itemId,
            type: type || 'borrow',
            title: item.title || '',
            category: item.category || '',
            amount: type === 'borrow'
              ? (item.borrowPrice || 0) * (Number(duration) || 1)
              : item.resalePrice || 0,
            duration_days: Number(duration) || 0,
            co2_saved_kg: item.co2Saved || 0,
            stripe_session_id: sessionId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setResult(data);
        }
      } catch (err) {
        console.error('Failed to record transaction:', err);
      }
      setRecorded(true);
    };

    recordTransaction();
  }, [sessionId, itemId, type, duration, recorded]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-lg w-full text-center"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
          className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-leaf to-ocean flex items-center justify-center mb-6"
        >
          <CheckCircle size={40} className="text-white" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold font-[family-name:var(--font-heading)] text-earth mb-3"
        >
          {type === 'borrow' ? 'Borrow Confirmed! 🎉' : 'Purchase Complete! 🎉'}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-earth-500 mb-8"
        >
          {result?.message || 'Your transaction has been processed successfully.'}
        </motion.p>

        {/* Stats cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 gap-4 mb-8"
        >
          <div className="bg-white rounded-2xl border border-earth-200/60 p-5">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              <Award size={24} className="text-amber mx-auto mb-2" />
            </motion.div>
            <p className="text-2xl font-bold text-amber">+{result?.reward_points_awarded || 50}</p>
            <p className="text-xs text-earth-400">Reward Points</p>
          </div>
          <div className="bg-white rounded-2xl border border-earth-200/60 p-5">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
            >
              <Leaf size={24} className="text-leaf-dark mx-auto mb-2" />
            </motion.div>
            <p className="text-2xl font-bold text-leaf-dark">{result?.co2_saved_kg || 0} kg</p>
            <p className="text-xs text-earth-400">CO₂ Saved</p>
          </div>
        </motion.div>

        {/* Sustainable impact message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-leaf/5 border border-leaf/10 mb-8"
        >
          <Sparkles size={18} className="text-leaf-dark shrink-0" />
          <p className="text-sm text-earth-600 text-left">
            By choosing to <strong className="text-leaf-dark">{type === 'borrow' ? 'borrow' : 'buy resale'}</strong>,
            you&apos;re helping keep items in circulation and reducing waste. Thank you for being part of the sustainable economy!
          </p>
        </motion.div>

        {/* Navigation buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Link href="/profile" className="flex-1">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-leaf to-leaf-dark text-white font-bold text-sm shadow-lg shadow-leaf/20"
            >
              <ShoppingBag size={16} />
              View My Transactions
              <ArrowRight size={14} />
            </motion.div>
          </Link>
          <Link href="/" className="flex-1">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white text-earth font-bold text-sm border border-earth-200 hover:border-earth-300 transition-colors"
            >
              Continue Exploring
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-8 h-8 border-3 border-leaf/20 border-t-leaf rounded-full"
          />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
