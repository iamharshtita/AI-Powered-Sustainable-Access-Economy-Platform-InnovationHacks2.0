'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Mic } from 'lucide-react';

export default function SearchBar({ onSearch }: { onSearch?: (query: string) => void }) {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(query);
    }
  };

  return (
    <motion.div
      animate={{
        boxShadow: isFocused
          ? '0 20px 60px -15px rgba(34, 197, 94, 0.2)'
          : '0 4px 20px -4px rgba(0, 0, 0, 0.08)',
      }}
      className={`
        flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white w-full max-w-2xl mx-auto
        border transition-all duration-300
        ${isFocused ? 'border-leaf/40 ring-4 ring-leaf/10' : 'border-earth-200'}
      `}
    >
      <Search size={20} className="text-earth-400 shrink-0" />

      <input
        type="text"
        placeholder="Find tools, tech, or furniture sustainably..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent outline-none text-earth text-base placeholder:text-earth-400"
      />

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsListening(!isListening)}
        className={`
          flex items-center justify-center w-10 h-10 rounded-full transition-all shrink-0
          ${isListening
            ? 'bg-leaf text-white shadow-lg shadow-leaf/30'
            : 'bg-earth-100 text-earth-500 hover:bg-earth-200'
          }
        `}
      >
        {isListening ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <Mic size={18} />
          </motion.div>
        ) : (
          <Mic size={18} />
        )}
      </motion.button>
    </motion.div>
  );
}
