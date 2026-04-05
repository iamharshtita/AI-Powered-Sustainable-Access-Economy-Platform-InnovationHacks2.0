'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from './components/SearchBar';
import ListingCard, { ListingProps } from './components/ListingCard';
import NudgeAlert from './components/NudgeAlert';
import { Leaf, Recycle, TrendingUp, TriangleAlert, Search, Sparkles, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { label: 'All', emoji: '' },
  { label: 'Electronics', emoji: '🖥️' },
  { label: 'Furniture', emoji: '🪑' },
  { label: 'Tools', emoji: '🔧' },
  { label: 'Sports', emoji: '⚽' },
  { label: 'Outdoor', emoji: '🏕️' },
  { label: 'Wellness', emoji: '🧘' },
  { label: 'Kitchen', emoji: '🍳' },
  { label: 'Clothing', emoji: '👕' },
  { label: 'Books', emoji: '📚' },
];

const STATS = [
  { icon: TriangleAlert, value: '2,400+', label: 'Items Available', color: 'text-earth-600', iconColor: 'text-earth-400' },
  { icon: Recycle, value: '12,800', label: 'Items Circulated', color: 'text-leaf-dark', iconColor: 'text-leaf' },
  { icon: Leaf, value: '45.2 tons', label: 'CO₂ Saved', color: 'text-ocean-dark', iconColor: 'text-ocean' },
  { icon: TrendingUp, value: '$890K', label: 'Money Saved', color: 'text-amber', iconColor: 'text-amber' },
];

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
  show: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [listings, setListings] = useState<ListingProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchListings = useCallback(async (category: string, query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category && category !== 'All') {
        params.set('category', category.toLowerCase());
      }
      if (query) {
        params.set('q', query);
      }
      const url = `/api/listings${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
      }
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings(activeCategory, searchQuery);
  }, [activeCategory, searchQuery, fetchListings]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setActiveCategory('All'); // Reset category when searching
  };

  const handleCategoryClick = (label: string) => {
    setActiveCategory(label);
    setSearchQuery(''); // Clear search when switching categories
  };

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-leaf/10 rounded-full blur-3xl animate-morph" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-ocean/8 rounded-full blur-3xl animate-morph" style={{ animationDelay: '-3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.03] animate-rotate-slow">
            <div className="w-full h-full border-[2px] border-leaf rounded-full" />
            <div className="absolute inset-8 border-[1px] border-ocean rounded-full counter-spin" />
          </div>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-8 sm:pb-12 text-center"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-leaf/10 text-leaf-dark text-sm font-semibold mb-6 animate-border-glow border border-leaf/20">
            <Sparkles size={14} className="animate-pulse-soft" />
            <span>AI-Powered Sustainable Living</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold font-[family-name:var(--font-heading)] text-earth tracking-tight leading-[1.05] mb-5"
          >
            Own Less.{' '}
            <span className="gradient-text inline-block">Live More.</span>
            <br />
            <motion.span
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              Save the Planet.
            </motion.span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg text-earth-500 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            AI tells you when to borrow, buy resale, or skip — so every choice helps the Earth.
            Earn rewards for sustainable decisions.
          </motion.p>

          <motion.div variants={fadeUp}>
            <SearchBar onSearch={handleSearch} />
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Strip */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-10"
      >
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 py-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, type: 'spring', bounce: 0.3 }}
              whileHover={{ scale: 1.08, y: -2 }}
              className="flex items-center gap-2.5 cursor-default"
            >
              <motion.div
                whileHover={{ rotate: 15 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <stat.icon size={18} className={stat.iconColor} />
              </motion.div>
              <div>
                <p className={`text-lg font-bold ${stat.color} leading-tight`}>{stat.value}</p>
                <p className="text-[11px] text-earth-400">{stat.label}</p>
              </div>
              {i < STATS.length - 1 && (
                <div className="hidden sm:block w-px h-8 bg-earth-200 ml-6" />
              )}
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Category Filter */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {CATEGORIES.map((cat, i) => (
            <motion.button
              key={cat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.04, type: 'spring', bounce: 0.3 }}
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleCategoryClick(cat.label)}
              className={`
                relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all overflow-hidden
                ${activeCategory === cat.label
                  ? 'bg-leaf text-white shadow-md shadow-leaf/20'
                  : 'bg-white text-earth-600 border border-earth-200 hover:border-leaf/30 hover:bg-leaf/5'
                }
              `}
            >
              {activeCategory === cat.label && (
                <motion.div
                  layoutId="category-highlight"
                  className="absolute inset-0 bg-leaf rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {cat.emoji && <span>{cat.emoji}</span>}
                {cat.label}
              </span>
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* Search indicator */}
      {searchQuery && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6"
        >
          <div className="flex items-center gap-2 text-sm text-earth-500">
            <Search size={14} />
            <span>
              Results for &quot;<strong className="text-earth">{searchQuery}</strong>&quot;
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="ml-2 text-xs text-leaf-dark hover:underline"
            >
              Clear
            </button>
          </div>
        </motion.div>
      )}

      {/* Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-heading)] text-earth">
            Explore Listings
          </h2>
          <motion.span
            key={listings.length}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-sm text-earth-400"
          >
            {loading ? '...' : `${listings.length} items`}
          </motion.span>
        </motion.div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader2 size={32} className="text-leaf animate-spin mb-4" />
              <p className="text-earth-400 text-sm">Loading listings from database...</p>
            </motion.div>
          ) : (
            <motion.div
              key={`${activeCategory}-${searchQuery}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              {listings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Search size={40} className="mx-auto text-earth-300 mb-4" />
                  </motion.div>
                  <p className="text-earth-400 text-lg">
                    {searchQuery
                      ? `No items matching "${searchQuery}"`
                      : 'No items in this category yet'}
                  </p>
                  <p className="text-earth-300 text-sm mt-1">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Try selecting "All" to see everything'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <NudgeAlert />
    </div>
  );
}
