'use client';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, MicOff, Loader2 } from 'lucide-react';

// Extend window for Web Speech API
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

export default function SearchBar({ onSearch }: { onSearch?: (query: string) => void }) {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing'>('idle');
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch && query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleSearchClick = () => {
    if (onSearch && query.trim()) {
      onSearch(query.trim());
    }
  };

  // Create speech recognition instance
  function createRecognition() {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new (SpeechRecognition as new () => {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      start: () => void;
      stop: () => void;
      onresult: ((e: SpeechRecognitionEvent) => void) | null;
      onend: (() => void) | null;
      onerror: ((e: { error: string }) => void) | null;
    })();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    return recognition;
  }

  const startVoiceInput = useCallback(() => {
    const recognition = createRecognition();
    if (!recognition) {
      alert('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    recognitionRef.current = recognition;
    setIsListening(true);
    setVoiceStatus('listening');

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setVoiceStatus('processing');

      // Auto-search after voice input
      setTimeout(() => {
        if (onSearch && transcript.trim()) {
          onSearch(transcript.trim());
        }
        setVoiceStatus('idle');
        setIsListening(false);
      }, 500);
    };

    recognition.onend = () => {
      if (voiceStatus === 'listening') {
        setVoiceStatus('idle');
        setIsListening(false);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      console.error('Speech recognition error:', event.error);
      setVoiceStatus('idle');
      setIsListening(false);
    };

    recognition.start();
  }, [onSearch, voiceStatus]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setVoiceStatus('idle');
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <motion.div
        animate={{
          boxShadow: isFocused
            ? '0 20px 60px -15px rgba(34, 197, 94, 0.2)'
            : '0 4px 20px -4px rgba(0, 0, 0, 0.08)',
        }}
        className={`
          flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white w-full
          border transition-all duration-300
          ${isFocused ? 'border-leaf/40 ring-4 ring-leaf/10' : 'border-earth-200'}
        `}
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSearchClick}
          className="text-earth-400 hover:text-leaf-dark transition-colors shrink-0"
        >
          <Search size={20} />
        </motion.button>

        <input
          type="text"
          placeholder={isListening ? 'Listening...' : 'Search items sustainably — or tap the mic 🎙️'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-earth text-base placeholder:text-earth-400"
        />

        {/* Mic button with voice status animation */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleMicClick}
          className={`
            relative flex items-center justify-center w-10 h-10 rounded-full transition-all shrink-0
            ${isListening
              ? 'bg-gradient-to-br from-leaf to-ocean text-white shadow-lg shadow-leaf/30'
              : 'bg-earth-100 text-earth-500 hover:bg-leaf/10 hover:text-leaf-dark'
            }
          `}
        >
          {/* Pulsing ring while listening */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="absolute inset-0 rounded-full bg-leaf/30"
              />
            )}
          </AnimatePresence>

          {voiceStatus === 'processing' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isListening ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            >
              <MicOff size={18} />
            </motion.div>
          ) : (
            <Mic size={18} />
          )}
        </motion.button>
      </motion.div>

      {/* Voice status label */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs font-medium text-leaf-dark"
          >
            {voiceStatus === 'listening' ? '🎙️ Speak now...' : '⏳ Processing...'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
