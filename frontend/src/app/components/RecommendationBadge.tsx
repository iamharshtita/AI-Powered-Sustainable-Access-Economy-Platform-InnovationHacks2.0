'use client';
import { motion } from 'framer-motion';
import { PackageOpen, Recycle, ShoppingBag } from 'lucide-react';

type RecommendationType = 'borrow' | 'buy_resale' | 'buy_new';

const CONFIG = {
  borrow: {
    label: 'Borrow',
    classes: 'bg-leaf/12 text-leaf-dark border-leaf/20',
    icon: PackageOpen,
  },
  buy_resale: {
    label: 'Buy Resale',
    classes: 'bg-ocean/12 text-ocean-dark border-ocean/20',
    icon: Recycle,
  },
  buy_new: {
    label: 'Buy New',
    classes: 'bg-earth-100 text-earth-500 border-earth-200',
    icon: ShoppingBag,
  },
};

export default function RecommendationBadge({
  type,
  co2Saved,
  compact = false,
}: {
  type: RecommendationType;
  co2Saved?: number;
  compact?: boolean;
}) {
  const { label, classes, icon: Icon } = CONFIG[type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${classes}`}
    >
      <Icon size={11} />
      <span>AI: {label}</span>
      {!compact && co2Saved != null && co2Saved > 0 && (
        <>
          <span className="opacity-40">·</span>
          <span className="opacity-80">-{co2Saved}kg CO₂</span>
        </>
      )}
    </motion.div>
  );
}
