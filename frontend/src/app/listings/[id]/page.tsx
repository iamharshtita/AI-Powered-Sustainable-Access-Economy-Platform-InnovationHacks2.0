'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import RecommendationBadge from '../../components/RecommendationBadge';
import VoicePlayer from '../../components/VoicePlayer';
import { ChevronLeft, MapPin, Clock, Shield, Leaf, Navigation2, Sparkles } from 'lucide-react';

const MapView = dynamic(() => import('../../components/MapView'), { ssr: false });

const ITEMS: Record<
  string,
  {
    title: string;
    category: string;
    condition: string;
    recommendation: 'borrow' | 'buy_resale';
    borrowPrice: number;
    resalePrice: number;
    co2: number;
    description: string;
    narration: string;
    image: string;
    location: string;
    lat: number;
    lng: number;
  }
> = {
  '1': {
    title: 'Makita Power Drill 18V',
    category: 'Tools',
    condition: 'Like New',
    recommendation: 'borrow',
    borrowPrice: 12,
    resalePrice: 85,
    co2: 15.4,
    description:
      'Professional-grade 18V cordless drill in excellent condition. Comes with 2 batteries, charger, and a full set of bits. Perfect for weekend DIY projects without the commitment of buying.',
    narration:
      "Hi, I'm a power drill! I only get used for about 13 minutes in my entire lifespan. Why not borrow me for your project and let someone else use me next?",
    image: '/items/drill.png',
    location: 'Tempe, AZ',
    lat: 33.4340,
    lng: -111.9280,
  },
  '2': {
    title: 'Vintage Fuji Film Camera',
    category: 'Electronics',
    condition: 'Good',
    recommendation: 'buy_resale',
    borrowPrice: 20,
    resalePrice: 250,
    co2: 32.1,
    description:
      'Classic Fujifilm X-T10 with 35mm f/1.4 lens. Beautiful brown leather half-case included. This camera has character and produces stunning images with that vintage film look.',
    narration:
      "I've captured a thousand memories, but I have millions more to give. Take me with you on your next journey!",
    image: '/items/camera.png',
    location: 'Scottsdale, AZ',
    lat: 33.4150,
    lng: -111.9530,
  },
  '3': {
    title: 'Coleman Camping Tent 4-Person',
    category: 'Outdoor',
    condition: 'Fair',
    recommendation: 'borrow',
    borrowPrice: 15,
    resalePrice: 60,
    co2: 48.0,
    description:
      'Reliable 4-person tent perfect for weekend camping trips. Easy setup, good waterproofing, and spacious interior. Minor wear on the rain fly but fully functional.',
    narration:
      "I'm meant to be under the stars, not stuck in a closet. Let's go camping — I promise I'll keep you dry!",
    image: '/items/tent.png',
    location: 'Mesa, AZ',
    lat: 33.4450,
    lng: -111.9100,
  },
};

const USER_LOC = { lat: 33.4255, lng: -111.9400 };

const fadeSlide = {
  hidden: { opacity: 0, y: 30, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export default function ListingDetail() {
  const params = useParams();
  const id = params?.id as string;

  const item = ITEMS[id] || ITEMS['1'];

  const mapItem = {
    id,
    title: item.title,
    category: item.category,
    borrowPrice: item.borrowPrice,
    resalePrice: item.resalePrice,
    co2Saved: item.co2,
    lat: item.lat,
    lng: item.lng,
    recommendation: item.recommendation,
  };

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
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-contain p-8 transition-transform duration-700 group-hover:scale-110"
          />
          {/* Hover shimmer overlay */}
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
            <RecommendationBadge
              type={item.recommendation}
              co2Saved={item.co2}
            />
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
              {item.condition}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={14} />
              {item.location}
            </span>
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

          {/* Description */}
          <motion.p variants={fadeSlide} className="text-earth-600 leading-relaxed mb-6">
            {item.description}
          </motion.p>

          {/* Voice Player */}
          <motion.div variants={fadeSlide} className="mb-6">
            <VoicePlayer text={item.narration} />
          </motion.div>

          {/* CO2 Impact */}
          <motion.div
            variants={fadeSlide}
            className="flex items-center gap-3 p-4 rounded-xl bg-leaf/5 border border-leaf/10 mb-6 animate-border-glow"
          >
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
              <Leaf size={18} className="text-leaf-dark shrink-0" />
            </motion.div>
            <p className="text-sm text-earth-600">
              Choosing to{' '}
              <strong className="text-leaf-dark">
                {item.recommendation === 'borrow' ? 'borrow' : 'buy resale'}
              </strong>{' '}
              this item saves <strong className="text-leaf-dark">{item.co2} kg</strong> of
              CO₂ emissions — equivalent to driving{' '}
              <strong>{Math.round(item.co2 * 3.9)} km</strong> less.
            </p>
          </motion.div>

          {/* Mini Map */}
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

          {/* Action Buttons */}
          <motion.div variants={fadeSlide} className="flex flex-col sm:flex-row gap-3 mt-auto">
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: '0 20px 40px -10px rgba(34, 197, 94, 0.3)' }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-leaf to-leaf-dark text-white font-bold text-sm sm:text-base shadow-lg shadow-leaf/20 flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              Request to Borrow
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-3.5 sm:py-4 rounded-2xl bg-white text-earth font-bold text-sm sm:text-base border border-earth-200 hover:border-earth-300 transition-colors"
            >
              Buy Resale
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
