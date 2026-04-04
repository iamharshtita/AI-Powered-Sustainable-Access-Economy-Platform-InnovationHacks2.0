'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Volume2 } from 'lucide-react';

export default function VoicePlayer({
  text = "Hi, I'm a pre-loved vintage camera looking for my next adventure.",
}: {
  text?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [waves, setWaves] = useState<number[]>(Array(20).fill(4));
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setWaves(Array(20).fill(4));
    setIsPlaying(false);
    setProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setWaves(
          Array(20)
            .fill(0)
            .map(() => Math.floor(Math.random() * 28) + 4)
        );
      }, 100);

      const estimatedDuration = text.length * 65; // ~65ms per character
      const startTime = Date.now();
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setProgress(Math.min((elapsed / estimatedDuration) * 100, 95));
      }, 50);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isPlaying, text.length]);

  const handleToggle = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      cleanup();
      return;
    }

    // Use Web Speech API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // clear queue first
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      // Try to get a nice voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.name.includes('Samantha') ||
          v.name.includes('Google') ||
          v.name.includes('Natural') ||
          v.lang.startsWith('en')
      );
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        setProgress(100);
        setTimeout(cleanup, 300);
      };
      utterance.onerror = () => cleanup();

      utteranceRef.current = utterance;
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative flex items-center gap-4 p-4 rounded-2xl bg-white border transition-all duration-500
        ${isPlaying
          ? 'border-leaf/30 shadow-lg shadow-leaf/10 animate-glow-pulse'
          : 'border-earth-200 hover:border-earth-300'
        }
      `}
    >
      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-leaf to-ocean rounded-full"
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />

      {/* Play Button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: isPlaying ? 0 : 15 }}
        whileTap={{ scale: 0.88 }}
        onClick={handleToggle}
        className={`
          flex items-center justify-center w-12 h-12 rounded-full shrink-0 transition-all duration-300
          ${isPlaying
            ? 'bg-gradient-to-br from-leaf to-ocean text-white shadow-lg shadow-leaf/30'
            : 'bg-earth-100 text-earth-600 hover:bg-leaf/10 hover:text-leaf-dark'
          }
        `}
      >
        <AnimatePresence mode="wait">
          {isPlaying ? (
            <motion.div
              key="stop"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ type: 'spring', bounce: 0.4 }}
            >
              <Square size={16} fill="currentColor" />
            </motion.div>
          ) : (
            <motion.div
              key="play"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ type: 'spring', bounce: 0.4 }}
            >
              <Play size={18} fill="currentColor" className="ml-0.5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Waveform & Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <motion.div
            animate={isPlaying ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Volume2
              size={14}
              className={`transition-colors duration-300 ${isPlaying ? 'text-leaf' : 'text-earth-400'}`}
            />
          </motion.div>
          <span className="text-xs font-medium text-earth-400 italic">
            &quot;Sentient&quot; AI Narration
          </span>
        </div>

        <div className="flex items-center gap-[2px] h-7">
          {waves.map((h, i) => (
            <motion.div
              key={i}
              animate={{ height: `${h}px` }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className={`w-[3px] rounded-full transition-colors duration-200 ${
                isPlaying ? 'bg-gradient-to-t from-leaf to-ocean' : 'bg-earth-200'
              }`}
              style={{
                background: isPlaying
                  ? `linear-gradient(to top, #22c55e, ${i % 2 ? '#06b6d4' : '#16a34a'})`
                  : undefined,
              }}
            />
          ))}
          <p className="ml-3 text-sm text-earth-600 truncate">{text}</p>
        </div>
      </div>
    </motion.div>
  );
}
