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

export default function ListingCard({ listing }: { listing: ListingProps }) {
  const [imgError, setImgError] = useState(false);
  const emoji = CATEGORY_EMOJI[listing.category.toLowerCase()] || '📦';

  return (
    <Link href={`/listings/${listing.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -8, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.12)' }}
        className="group bg-white rounded-2xl overflow-hidden border border-earth-200/60 cursor-pointer transition-colors hover:border-leaf/20"
      >
        {/* Image or Gradient Fallback */}
        <div className="relative aspect-[4/3] bg-earth-100 overflow-hidden">
          {!imgError && listing.image ? (
            <img
              src={listing.image}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-leaf/10 via-ocean/5 to-earth-100">
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
              className="text-[10px] font-medium uppercase tracking-wider bg-white/90 backdrop-blur-sm text-earth-600 px-2 py-1 rounded-md"
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
          <h3 className="text-lg font-bold text-earth leading-snug mb-4 font-[family-name:var(--font-heading)] group-hover:text-leaf-dark transition-colors duration-300">
            {listing.title}
          </h3>

          <div className="flex items-end justify-between pt-4 border-t border-earth-100">
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
