'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import RecommendationBadge from '../../components/RecommendationBadge';
import VoicePlayer from '../../components/VoicePlayer';
import {
  ChevronLeft, MapPin, Clock, Shield, Leaf, Navigation2, Sparkles,
  ShoppingBag, Minus, Plus, Loader2, LogIn, CreditCard,
} from 'lucide-react';

const MapView = dynamic(() => import('../../components/MapView'), { ssr: false });

const USER_LOC = { lat: 33.4255, lng: -111.9400 };

const CATEGORY_EMOJI: Record<string, string> = {
  electronics: '🖥️', furniture: '🪑', tools: '🔧', sports: '⚽',
  outdoor: '🏕️', wellness: '🧘', kitchen: '🍳', clothing: '👕', books: '📚',
};

const fadeSlide = {
  hidden: { opacity: 0, y: 30, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: 'easeOut' as const } },
};

interface ItemData {
  id: string;
  title: string;
  category: string;
  condition: string;
  recommendation: 'borrow' | 'buy_resale' | 'buy_new';
  borrowPrice: number;
  resalePrice: number;
  co2Saved: number;
  description: string;
  narration: string;
  image: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
}

export default function ListingDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [item, setItem] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [borrowDays, setBorrowDays] = useState(3);
  const [checkoutLoading, setCheckoutLoading] = useState<'borrow' | 'buy' | null>(null);
  const [user, setUser] = useState<{ sub?: string } | null>(null);
  const [imgError, setImgError] = useState(false);

  // Fetch item data
  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await fetch('/api/listings');
        if (res.ok) {
          const data = await res.json();
          const found = data.listings?.find((l: ItemData) => l.id === id);
          if (found) {
            setItem(found);
          }
        }
      } catch (err) {
        console.error('Failed to fetch item:', err);
      }
      setLoading(false);
    };
    fetchItem();
  }, [id]);

  // Check auth
  useEffect(() => {
    fetch('/auth/profile', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch(() => {});
  }, []);

  const handleCheckout = async (type: 'borrow' | 'buy_resale') => {
    if (!user?.sub) {
      router.push('/auth/login');
      return;
    }

    setCheckoutLoading(type === 'borrow' ? 'borrow' : 'buy');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: id,
          type,
          duration_days: type === 'borrow' ? borrowDays : undefined,
          user_id: user.sub,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create checkout');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Something went wrong. Please try again.');
    }

    setCheckoutLoading(null);
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

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-earth-400 text-lg">Item not found</p>
        <Link href="/" className="text-leaf-dark hover:underline text-sm">
          ← Back to explore
        </Link>
      </div>
    );
  }

  const emoji = CATEGORY_EMOJI[item.category.toLowerCase()] || '📦';
  const hasMap = item.latitude && item.longitude;

  const mapItem = hasMap ? {
    id,
    title: item.title,
    category: item.category,
    borrowPrice: item.borrowPrice,
    resalePrice: item.resalePrice,
    co2Saved: item.co2Saved,
    lat: item.latitude!,
    lng: item.longitude!,
    recommendation: (item.recommendation === 'borrow' ? 'borrow' : 'buy_resale') as 'borrow' | 'buy_resale',
  } : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-earth-500 hover:text-leaf-dark transition-colors mb-8 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to explore
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, rotateY: -5 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative aspect-square bg-white rounded-3xl border border-earth-200/60 overflow-hidden shadow-sm group"
        >
          {!imgError && item.image ? (
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-contain p-8 transition-transform duration-700 group-hover:scale-110"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-leaf/10 via-ocean/5 to-earth-100">
              <span className="text-8xl">{emoji}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </motion.div>

        {/* Details */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
          className="flex flex-col"
        >
          <motion.div variants={fadeSlide}>
            <RecommendationBadge type={item.recommendation} co2Saved={item.co2Saved} />
          </motion.div>

          <motion.h1
            variants={fadeSlide}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold font-[family-name:var(--font-heading)] text-earth mt-4 mb-2 leading-tight"
          >
            {item.title}
          </motion.h1>

          <motion.div
            variants={fadeSlide}
            className="flex flex-wrap items-center gap-3 text-sm text-earth-500 mb-6"
          >
            <span className="px-2.5 py-0.5 rounded-md bg-earth-100 font-medium text-earth-600">
              {item.category}
            </span>
            <span className="flex items-center gap-1">
              <Shield size={14} />
              {item.condition.replace('_', ' ')}
            </span>
            {item.location && (
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {item.location}
              </span>
            )}
          </motion.div>

          {/* Pricing */}
          <motion.div
            variants={fadeSlide}
            whileHover={{ scale: 1.01 }}
            className="flex gap-6 p-5 rounded-2xl bg-earth-50 border border-earth-200/60 mb-6 transition-all"
          >
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-xs text-earth-400 uppercase tracking-wider mb-1">
                <Clock size={12} />
                Borrow Rate
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-leaf-dark">
                ${item.borrowPrice}
                <span className="text-sm sm:text-base font-normal text-earth-400">/day</span>
              </p>
            </div>
            <div className="w-px bg-earth-200" />
            <div className="flex-1">
              <div className="text-xs text-earth-400 uppercase tracking-wider mb-1">
                Resale Price
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-ocean-dark">
                ${item.resalePrice}
              </p>
            </div>
          </motion.div>

          {/* Duration selector for borrow */}
          <motion.div
            variants={fadeSlide}
            className="flex items-center gap-4 p-4 rounded-xl bg-white border border-earth-200/60 mb-6"
          >
            <span className="text-sm font-medium text-earth-600">Borrow Duration:</span>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setBorrowDays(Math.max(1, borrowDays - 1))}
                className="w-8 h-8 rounded-lg bg-earth-100 flex items-center justify-center text-earth-600 hover:bg-earth-200 transition-colors"
              >
                <Minus size={14} />
              </motion.button>
              <span className="w-12 text-center text-lg font-bold text-earth">{borrowDays}</span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setBorrowDays(Math.min(30, borrowDays + 1))}
                className="w-8 h-8 rounded-lg bg-earth-100 flex items-center justify-center text-earth-600 hover:bg-earth-200 transition-colors"
              >
                <Plus size={14} />
              </motion.button>
              <span className="text-sm text-earth-400">days</span>
            </div>
            <div className="ml-auto text-right">
              <p className="text-lg font-bold text-leaf-dark">${item.borrowPrice * borrowDays}</p>
              <p className="text-xs text-earth-400">total</p>
            </div>
          </motion.div>

          {/* Description */}
          {item.description && (
            <motion.p variants={fadeSlide} className="text-earth-600 leading-relaxed mb-6">
              {item.description}
            </motion.p>
          )}

          {/* Voice Player */}
          {item.narration && (
            <motion.div variants={fadeSlide} className="mb-6">
              <VoicePlayer text={item.narration} />
            </motion.div>
          )}

          {/* CO2 Impact */}
          <motion.div
            variants={fadeSlide}
            className="flex items-center gap-3 p-4 rounded-xl bg-leaf/5 border border-leaf/10 mb-6 animate-border-glow"
          >
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
              <Leaf size={18} className="text-leaf-dark shrink-0" />
            </motion.div>
            <p className="text-sm text-earth-600 dark:text-earth-400">
              Choosing to{' '}
              <strong className="text-leaf-dark">
                {item.recommendation === 'borrow' ? 'borrow' : 'buy resale'}
              </strong>{' '}
              this item saves <strong className="text-leaf-dark">{item.co2Saved} kg</strong> of
              CO₂ emissions — equivalent to not driving{' '}
              <strong>{Math.round(item.co2Saved * 2.42)} miles</strong>.
            </p>
          </motion.div>

          {/* Mini Map */}
          {hasMap && mapItem && (
            <motion.div variants={fadeSlide} className="mb-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-earth mb-3">
                <Navigation2 size={15} className="text-leaf-dark" />
                Item Location
              </div>
              <MapView
                items={[mapItem]}
                userLocation={USER_LOC}
                radiusKm={10}
                className="h-[200px]"
              />
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div variants={fadeSlide} className="flex flex-col sm:flex-row gap-3 mt-auto">
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: '0 20px 40px -10px rgba(34, 197, 94, 0.3)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleCheckout('borrow')}
              disabled={checkoutLoading !== null}
              className="flex-1 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-leaf to-leaf-dark text-white font-bold text-sm sm:text-base shadow-lg shadow-leaf/20 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {checkoutLoading === 'borrow' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : user ? (
                <CreditCard size={16} />
              ) : (
                <LogIn size={16} />
              )}
              {checkoutLoading === 'borrow'
                ? 'Redirecting to Stripe...'
                : `Borrow ${borrowDays}d · $${item.borrowPrice * borrowDays}`}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleCheckout('buy_resale')}
              disabled={checkoutLoading !== null}
              className="flex-1 py-3.5 sm:py-4 rounded-2xl bg-white text-earth font-bold text-sm sm:text-base border border-earth-200 hover:border-ocean/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {checkoutLoading === 'buy' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShoppingBag size={16} />
              )}
              {checkoutLoading === 'buy'
                ? 'Redirecting to Stripe...'
                : `Buy Resale · $${item.resalePrice}`}
            </motion.button>
          </motion.div>

          {!user && (
            <motion.p
              variants={fadeSlide}
              className="text-xs text-earth-400 text-center mt-3"
            >
              You&apos;ll need to sign in before checking out
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
