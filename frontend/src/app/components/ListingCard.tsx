'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import RecommendationBadge from './RecommendationBadge';

export interface ListingProps {
  id: string;
  title: string;
  category: string;
  condition: string;
  borrowPrice: number;
  resalePrice: number;
  recommendation: 'borrow' | 'buy_resale' | 'buy_new';
  co2Saved: number;
  image: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  electronics: '🖥️',
  furniture: '🪑',
  tools: '🔧',
  sports: '⚽',
  outdoor: '🏕️',
  wellness: '🧘',
  kitchen: '🍳',
  clothing: '👕',
  books: '📚',
};

// Curated Unsplash images per category (shown when item has no image)
const CATEGORY_IMAGES: Record<string, string> = {
  electronics: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80',
  furniture: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
  tools: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80',
  sports: 'https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee?w=400&q=80',
  outdoor: 'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?w=400&q=80',
  wellness: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
  kitchen: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80',
  clothing: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80',
  books: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80',
};

// Specific product image overrides (for items with empty/missing image in DB)
const TITLE_IMAGE_MAP: Record<string, string> = {
  'DJI Mini 3 Drone': '/items/drone.png',
  'Mountain Bike - Trek': '/items/bike.png',
  'Yoga Mat Premium': '/items/yogamat.png',
  'KitchenAid Stand Mixer': '/items/mixer.png',
  'Standing Desk Converter': '/items/standingdesk.png',
};

export default function ListingCard({ listing }: { listing: ListingProps }) {
  const [imgError, setImgError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);
  const emoji = CATEGORY_EMOJI[listing.category.toLowerCase()] || '📦';
  const categoryImage = CATEGORY_IMAGES[listing.category.toLowerCase()];
  const titleImage = TITLE_IMAGE_MAP[listing.title];

  // Priority: listing.image → title-specific image → category photo → emoji fallback
  const imageSrc = !imgError && listing.image
    ? listing.image
    : !fallbackError && titleImage
    ? titleImage
    : !fallbackError && categoryImage
    ? categoryImage
    : null;

  return (
    <Link href={`/listings/${listing.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -8, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.12)' }}
        className="group bg-white dark:bg-[#0f1c33] rounded-2xl overflow-hidden border border-earth-200/60 dark:border-white/6 cursor-pointer transition-colors hover:border-leaf/20 dark:hover:border-leaf/30"
      >
        {/* Image or Gradient Fallback */}
        <div className="relative aspect-[4/3] bg-earth-100 dark:bg-white/5 overflow-hidden">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={() => {
                if (!imgError) {
                  setImgError(true);
                } else {
                  setFallbackError(true);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-leaf/10 via-ocean/5 to-earth-100 dark:from-leaf/15 dark:via-ocean/8 dark:to-earth-800">
              <span className="text-5xl">{emoji}</span>
            </div>
          )}
          {/* Hover gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-3 left-3">
            <RecommendationBadge type={listing.recommendation} co2Saved={listing.co2Saved} />
          </div>
          <div className="absolute top-3 right-3">
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="text-[10px] font-medium uppercase tracking-wider bg-white/90 dark:bg-[#0f1c33]/90 backdrop-blur-sm text-earth-600 dark:text-earth-300 px-2 py-1 rounded-md"
            >
              {listing.condition.replace('_', ' ')}
            </motion.span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-leaf-dark mb-1.5">
            {listing.category}
          </p>
          <h3 className="text-lg font-bold text-earth dark:text-earth-200 leading-snug mb-4 font-[family-name:var(--font-heading)] group-hover:text-leaf-dark transition-colors duration-300">
            {listing.title}
          </h3>

          <div className="flex items-end justify-between pt-4 border-t border-earth-100 dark:border-white/6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-earth-400 mb-0.5">Borrow</p>
              <p className="text-xl font-bold text-leaf-dark">
                ${listing.borrowPrice}
                <span className="text-xs font-normal text-earth-400">/day</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-earth-400 mb-0.5">
                Buy Resale
              </p>
              <p className="text-xl font-bold text-ocean-dark">${listing.resalePrice}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
