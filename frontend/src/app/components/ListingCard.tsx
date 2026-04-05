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

const S3_BASE = 'https://sustainableaccessplatform-listingimagesbucket35876-phncghrg4bto.s3.us-east-1.amazonaws.com/items';

// Curated S3 images per category (shown when item has no image)
const CATEGORY_IMAGES: Record<string, string> = {
  electronics: `${S3_BASE}/headphones.png`,
  furniture: `${S3_BASE}/bookshelf.png`,
  tools: `${S3_BASE}/drill.png`,
  sports: `${S3_BASE}/bike.png`,
  outdoor: `${S3_BASE}/tent.png`,
  wellness: `${S3_BASE}/yogamat.png`,
  kitchen: `${S3_BASE}/mixer.png`,
  clothing: `${S3_BASE}/jacket.png`,
  books: `${S3_BASE}/textbooks.png`,
};

// Specific product image overrides (title → S3 URL)
const TITLE_IMAGE_MAP: Record<string, string> = {
  // Original 8 items
  'Makita Power Drill 18V': `${S3_BASE}/drill.png`,
  'Vintage Fuji Film Camera': `${S3_BASE}/camera.png`,
  'Coleman Camping Tent 4-Person': `${S3_BASE}/tent.png`,
  'KitchenAid Stand Mixer': `${S3_BASE}/mixer.png`,
  'Yoga Mat Premium': `${S3_BASE}/yogamat.png`,
  'Mountain Bike - Trek': `${S3_BASE}/bike.png`,
  'Standing Desk Converter': `${S3_BASE}/standingdesk.png`,
  'DJI Mini 3 Drone': `${S3_BASE}/drone.png`,
  // New items
  'Hiking Backpack 65L': `${S3_BASE}/backpack.png`,
  '5-Shelf Bookcase': `${S3_BASE}/bookshelf.png`,
  'Cast Iron Skillet Set': `${S3_BASE}/castiron.png`,
  'Coffee Table Books Bundle': `${S3_BASE}/coffeebooks.png`,
  "De'Longhi Espresso Machine": `${S3_BASE}/espresso.png`,
  'Portable BBQ Grill': `${S3_BASE}/grill.png`,
  'Sony WH-1000XM5 Headphones': `${S3_BASE}/headphones.png`,
  'North Face Fleece Jacket': `${S3_BASE}/jacket.png`,
  'Sit-on-Top Kayak': `${S3_BASE}/kayak.png`,
  'College Textbook Bundle': `${S3_BASE}/textbooks.png`,
  'Herman Miller Aeron Chair': `${S3_BASE}/aeron-chair.jpeg`,
  'DeWalt Circular Saw 7.25"': `${S3_BASE}/dewalt-circular-saw.jpeg`,
  'iPad Pro + Apple Pencil': `${S3_BASE}/ipadpro-applepencil.jpeg`,
  'Meditation Cushion + Singing Bowl Set': `${S3_BASE}/meditation-cusion-singing-bowlset.jpeg`,
  'North Face Winter Parka': `${S3_BASE}/northface-winter-parka.jpeg`,
  'Bluetooth Portable Projector': `${S3_BASE}/portable-bluetooth-projector.jpeg`,
  'Pressure Washer 3000 PSI': `${S3_BASE}/pressure-washer-3000psi.jpeg`,
  'Theragun Pro Massage Gun': `${S3_BASE}/theragun-pro-massage-gun.jpeg`,
  'Wilson Tennis Racket Set': `${S3_BASE}/wilson-racket-set.jpeg`,
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
        whileHover={{ y: -8, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.13)' }}
        className="group bg-white dark:bg-[#0f1c33] rounded-2xl overflow-hidden border border-earth-200/60 dark:border-white/6 cursor-pointer transition-all hover:border-leaf/30 dark:hover:border-leaf/25 hover:shadow-leaf/5"
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
          {/* Condition badge — top right only */}
          <div className="absolute top-3 right-3">
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="text-[10px] font-semibold uppercase tracking-wider bg-white/95 dark:bg-[#0f1c33]/95 backdrop-blur-sm text-earth-600 dark:text-earth-300 px-2.5 py-1 rounded-full shadow-sm border border-earth-200/40 dark:border-white/10"
            >
              {listing.condition.replace('_', ' ')}
            </motion.span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Category + AI Badge row */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-leaf-dark">
              {listing.category}
            </p>
            <RecommendationBadge type={listing.recommendation} co2Saved={listing.co2Saved} compact />
          </div>
          <h3 className="text-base font-bold text-earth dark:text-earth-200 leading-snug mb-4 font-[family-name:var(--font-heading)] group-hover:text-leaf-dark dark:group-hover:text-leaf transition-colors duration-300">
            {listing.title}
          </h3>

          <div className="flex items-end justify-between pt-3.5 border-t border-earth-100 dark:border-white/6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-earth-400 mb-0.5">Borrow</p>
              <p className="text-xl font-bold text-leaf-dark">
                ${listing.borrowPrice}
                <span className="text-xs font-normal text-earth-400">/day</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-earth-400 mb-0.5">Buy Resale</p>
              <p className="text-xl font-bold text-ocean-dark">${listing.resalePrice}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
