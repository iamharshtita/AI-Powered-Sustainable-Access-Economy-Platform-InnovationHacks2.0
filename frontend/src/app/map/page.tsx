'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, SlidersHorizontal, Leaf, Navigation2, ChevronRight, Loader2, Maximize2, X } from 'lucide-react';
import Link from 'next/link';
import type { MapItem } from '../components/MapView';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

const USER_LOCATION = { lat: 33.4255, lng: -111.9400 };

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Radius options in miles
const RADIUS_OPTIONS = [1, 3, 6, 12];

const listItemVariants = {
  hidden: { opacity: 0, x: 20 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' as const },
  }),
};

interface ListingItem {
  id: string;
  title: string;
  category: string;
  borrowPrice: number;
  resalePrice: number;
  co2Saved: number;
  recommendation: string;
  latitude: number | null;
  longitude: number | null;
}

export default function MapPage() {
  const [radiusMiles, setRadiusMiles] = useState(6);
  const [filterCategory, setFilterCategory] = useState('All');
  const [mapItems, setMapItems] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch items from API
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch('/api/listings');
        if (res.ok) {
          const data = await res.json();
          const items: MapItem[] = (data.listings || [])
            .filter((item: ListingItem) => item.latitude && item.longitude)
            .map((item: ListingItem) => ({
              id: item.id,
              title: item.title,
              category: item.category,
              borrowPrice: item.borrowPrice,
              resalePrice: item.resalePrice,
              co2Saved: item.co2Saved,
              lat: item.latitude!,
              lng: item.longitude!,
              recommendation: item.recommendation as 'borrow' | 'buy_resale',
            }));
          setMapItems(items);
        }
      } catch (err) {
        console.error('Failed to fetch items for map:', err);
      }
      setLoading(false);
    };
    fetchItems();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(mapItems.map((i) => i.category));
    return ['All', ...Array.from(cats)];
  }, [mapItems]);

  const filteredItems = useMemo(() => {
    // Convert radius from miles to km for the distance calculation comparison
    const radiusKm = radiusMiles * 1.60934;
    return mapItems
      .map((item) => ({
        ...item,
        distance: getDistance(USER_LOCATION.lat, USER_LOCATION.lng, item.lat, item.lng),
      }))
      .filter((item) => item.distance <= radiusMiles)
      .filter((item) => filterCategory === 'All' || item.category === filterCategory)
      .sort((a, b) => a.distance - b.distance);
  }, [radiusMiles, filterCategory, mapItems]);

  const totalCo2 = filteredItems.reduce((s, i) => s + i.co2Saved, 0);
  // Convert radius to km for the map circle display
  const radiusKmForMap = radiusMiles * 1.60934;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="text-leaf animate-spin" />
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-earth dark:text-earth-200">
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
          <span className="text-sm text-earth-500 dark:text-earth-400">Radius:</span>
          <div className="flex bg-earth-100 dark:bg-white/8 rounded-lg p-0.5">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadiusMiles(r)}
                className={`relative px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  radiusMiles === r
                    ? 'text-leaf-dark dark:text-leaf'
                    : 'text-earth-400 hover:text-earth-600 dark:hover:text-earth-200'
                }`}
              >
                {radiusMiles === r && (
                  <motion.div
                    layoutId="radius-pill"
                    className="absolute inset-0 bg-white dark:bg-white/15 shadow-sm rounded-md"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{r}mi</span>
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
                : 'bg-white dark:bg-white/8 text-earth-500 dark:text-earth-400 border border-earth-200 dark:border-white/10 hover:border-leaf/30'
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
          {/* Map container with fullscreen button */}
          <div className="relative">
            <MapView
              items={filteredItems}
              userLocation={USER_LOCATION}
              radiusKm={radiusKmForMap}
              className="h-[450px] sm:h-[550px]"
            />
            {/* Fullscreen Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFullscreen(true)}
              className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/90 dark:bg-[#0f1c33]/90 backdrop-blur-sm border border-earth-200/60 dark:border-white/10 text-xs font-semibold text-earth-600 dark:text-earth-300 shadow-md hover:shadow-lg transition-all"
            >
              <Maximize2 size={14} />
              Fullscreen
            </motion.button>
          </div>

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
            <p className="text-sm text-earth-600 dark:text-earth-400">
              <strong className="text-leaf-dark">{filteredItems.length} items</strong> within {radiusMiles} miles could save up to{' '}
              <strong className="text-leaf-dark">{totalCo2.toFixed(1)} kg CO₂</strong> — closer items mean less travel emissions!
            </p>
          </motion.div>
        </motion.div>

        {/* Sidebar list */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-white dark:bg-[#0f1c33] rounded-2xl border border-earth-200/60 dark:border-white/6 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-earth-100 dark:border-white/6">
            <h2 className="text-base font-bold text-earth dark:text-earth-200">
              Items Within {radiusMiles}mi
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

          <div className="divide-y divide-earth-100 dark:divide-white/5 max-h-[450px] overflow-y-auto">
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
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-earth-50 dark:hover:bg-white/5 transition-all group"
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
                          <p className="text-sm font-semibold text-earth dark:text-earth-200 truncate">{item.title}</p>
                          <div className="flex items-center gap-2 text-xs text-earth-400">
                            <span>{item.category}</span>
                            <span>·</span>
                            <span>{item.distance!.toFixed(1)}mi</span>
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

      {/* Fullscreen Map Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setIsFullscreen(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              className="relative w-full h-full max-w-7xl max-h-[90vh] rounded-2xl overflow-hidden"
            >
              <MapView
                items={filteredItems}
                userLocation={USER_LOCATION}
                radiusKm={radiusKmForMap}
                className="h-full w-full"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-4 z-[1001] flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/90 dark:bg-[#0f1c33]/90 backdrop-blur-sm border border-earth-200/60 text-sm font-semibold text-earth-600 shadow-lg"
              >
                <X size={16} />
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
