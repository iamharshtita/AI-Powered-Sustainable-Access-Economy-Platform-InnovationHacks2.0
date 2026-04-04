'use client';
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, SlidersHorizontal, Leaf, Navigation2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { MapItem } from '../components/MapView';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

// Tempe, AZ
const USER_LOCATION = { lat: 33.4255, lng: -111.9400 };

// Arizona-based items around Tempe / Phoenix / Scottsdale / Mesa
const MAP_ITEMS: MapItem[] = [
  {
    id: '1',
    title: 'Makita Power Drill 18V',
    category: 'Tools',
    borrowPrice: 12,
    resalePrice: 85,
    co2Saved: 15.4,
    lat: 33.4340,
    lng: -111.9280,
    recommendation: 'borrow',
  },
  {
    id: '2',
    title: 'Vintage Fuji Film Camera',
    category: 'Electronics',
    borrowPrice: 20,
    resalePrice: 250,
    co2Saved: 32.1,
    lat: 33.4150,
    lng: -111.9530,
    recommendation: 'buy_resale',
  },
  {
    id: '3',
    title: 'Coleman Camping Tent',
    category: 'Outdoor',
    borrowPrice: 15,
    resalePrice: 60,
    co2Saved: 48.0,
    lat: 33.4450,
    lng: -111.9100,
    recommendation: 'borrow',
  },
  {
    id: '4',
    title: 'KitchenAid Stand Mixer',
    category: 'Kitchen',
    borrowPrice: 18,
    resalePrice: 180,
    co2Saved: 25.2,
    lat: 33.4380,
    lng: -111.9600,
    recommendation: 'borrow',
  },
  {
    id: '5',
    title: 'Yoga Mat Premium',
    category: 'Wellness',
    borrowPrice: 5,
    resalePrice: 30,
    co2Saved: 8.7,
    lat: 33.4180,
    lng: -111.9350,
    recommendation: 'buy_resale',
  },
  {
    id: '6',
    title: 'Mountain Bike - Trek',
    category: 'Sports',
    borrowPrice: 25,
    resalePrice: 450,
    co2Saved: 62.5,
    lat: 33.4510,
    lng: -111.9450,
    recommendation: 'borrow',
  },
  {
    id: '7',
    title: 'Standing Desk Converter',
    category: 'Furniture',
    borrowPrice: 10,
    resalePrice: 120,
    co2Saved: 18.9,
    lat: 33.4100,
    lng: -111.9200,
    recommendation: 'buy_resale',
  },
  {
    id: '8',
    title: 'DJI Mini 3 Drone',
    category: 'Electronics',
    borrowPrice: 35,
    resalePrice: 400,
    co2Saved: 44.2,
    lat: 33.4420,
    lng: -111.9700,
    recommendation: 'borrow',
  },
];

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const RADIUS_OPTIONS = [2, 5, 10, 20];

const listItemVariants = {
  hidden: { opacity: 0, x: 20 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' as const },
  }),
};

export default function MapPage() {
  const [radiusKm, setRadiusKm] = useState(10);
  const [filterCategory, setFilterCategory] = useState('All');

  const categories = useMemo(() => {
    const cats = new Set(MAP_ITEMS.map((i) => i.category));
    return ['All', ...Array.from(cats)];
  }, []);

  const filteredItems = useMemo(() => {
    return MAP_ITEMS.map((item) => ({
      ...item,
      distance: getDistance(USER_LOCATION.lat, USER_LOCATION.lng, item.lat, item.lng),
    }))
      .filter((item) => item.distance <= radiusKm)
      .filter((item) => filterCategory === 'All' || item.category === filterCategory)
      .sort((a, b) => a.distance - b.distance);
  }, [radiusKm, filterCategory]);

  const totalCo2 = filteredItems.reduce((s, i) => s + i.co2Saved, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-leaf to-ocean flex items-center justify-center"
          >
            <MapPin size={20} className="text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-earth">
              Nearby Items
            </h1>
            <p className="text-sm text-earth-400 flex items-center gap-1">
              <Navigation2 size={12} />
              Tempe, AZ
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2"
        >
          <SlidersHorizontal size={14} className="text-earth-400" />
          <span className="text-sm text-earth-500">Radius:</span>
          <div className="flex bg-earth-100 rounded-lg p-0.5">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`relative px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  radiusKm === r
                    ? 'text-leaf-dark'
                    : 'text-earth-400 hover:text-earth-600'
                }`}
              >
                {radiusKm === r && (
                  <motion.div
                    layoutId="radius-pill"
                    className="absolute inset-0 bg-white shadow-sm rounded-md"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{r}km</span>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Category filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap gap-2 mb-6"
      >
        {categories.map((cat) => (
          <motion.button
            key={cat}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterCategory === cat
                ? 'bg-leaf text-white shadow-sm shadow-leaf/20'
                : 'bg-white text-earth-500 border border-earth-200 hover:border-leaf/30'
            }`}
          >
            {cat}
          </motion.button>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="lg:col-span-2"
        >
          <MapView
            items={filteredItems}
            userLocation={USER_LOCATION}
            radiusKm={radiusKm}
            className="h-[450px] sm:h-[550px]"
          />

          {/* CO2 callout */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-3 mt-4 p-4 rounded-xl bg-leaf/5 border border-leaf/10 animate-border-glow"
          >
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
              <Leaf size={18} className="text-leaf-dark shrink-0" />
            </motion.div>
            <p className="text-sm text-earth-600">
              <strong className="text-leaf-dark">{filteredItems.length} items</strong> within {radiusKm}km could save up to{' '}
              <strong className="text-leaf-dark">{totalCo2.toFixed(1)} kg CO₂</strong> — closer items mean less travel emissions!
            </p>
          </motion.div>
        </motion.div>

        {/* Sidebar list */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-white rounded-2xl border border-earth-200/60 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-earth-100">
            <h2 className="text-base font-bold text-earth">
              Items Within {radiusKm}km
              <motion.span
                key={filteredItems.length}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-earth-400 font-normal ml-2 text-sm"
              >
                ({filteredItems.length})
              </motion.span>
            </h2>
          </div>

          <div className="divide-y divide-earth-100 max-h-[450px] overflow-y-auto">
            <AnimatePresence mode="wait">
              {filteredItems.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8 text-center"
                >
                  <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <MapPin size={32} className="mx-auto text-earth-300 mb-3" />
                  </motion.div>
                  <p className="text-sm text-earth-400">No items in this radius</p>
                  <p className="text-xs text-earth-300 mt-1">Try increasing the distance</p>
                </motion.div>
              ) : (
                <motion.div key="list" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }}>
                  {filteredItems.map((item, i) => (
                    <motion.div key={item.id} custom={i} variants={listItemVariants}>
                      <Link
                        href={`/listings/${item.id}`}
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-earth-50 transition-all group"
                      >
                        <motion.div
                          whileHover={{ scale: 1.15, rotate: 8 }}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            item.recommendation === 'borrow' ? 'bg-leaf/10' : 'bg-ocean/10'
                          }`}
                        >
                          <MapPin
                            size={16}
                            className={item.recommendation === 'borrow' ? 'text-leaf-dark' : 'text-ocean-dark'}
                          />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-earth truncate">{item.title}</p>
                          <div className="flex items-center gap-2 text-xs text-earth-400">
                            <span>{item.category}</span>
                            <span>·</span>
                            <span>{item.distance!.toFixed(1)}km</span>
                            <span>·</span>
                            <span className="text-leaf-dark font-medium">-{item.co2Saved}kg CO₂</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-leaf-dark">${item.borrowPrice}/d</p>
                        </div>
                        <ChevronRight size={14} className="text-earth-300 group-hover:translate-x-1 group-hover:text-earth-500 shrink-0 transition-all" />
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
