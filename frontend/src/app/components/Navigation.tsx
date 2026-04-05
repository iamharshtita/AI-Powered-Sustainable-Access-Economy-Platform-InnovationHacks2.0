'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Search, BarChart3, User as UserIcon, Menu, X, LogOut, LogIn, MapPin, Moon, Sun, Phone, Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// Links shown when NOT logged in
const PUBLIC_NAV_LINKS = [
  { href: '/', label: 'Explore', icon: Search },
  { href: '/map', label: 'Map', icon: MapPin },
  { href: '/about', label: 'About Us', icon: Info },
  { href: '/contact', label: 'Contact Us', icon: Phone },
];

// Links shown when logged in
const AUTH_NAV_LINKS = [
  { href: '/', label: 'Explore', icon: Search },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/profile', label: 'Profile', icon: UserIcon },
  { href: '/map', label: 'Map', icon: MapPin },
];

interface Auth0User {
  name?: string;
  email?: string;
  nickname?: string;
  sub?: string;
}

async function playWelcomeVoice(name: string) {
  try {
    const res = await fetch('/api/voice/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `Hey welcome, ${name}` }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const audioBlob = new Blob(
      [Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0))],
      { type: 'audio/mpeg' }
    );
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    await audio.play();
  } catch {
    // Silently fail if voice not available
  }
}

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<Auth0User | null | undefined>(undefined);
  const [isDark, setIsDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const prevUserRef = useRef<Auth0User | null>(null);

  // Detect scroll for nav shrink
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Init dark mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('reearth-theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('reearth-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('reearth-theme', 'light');
    }
  };

  useEffect(() => {
    fetch('/auth/profile', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        const userData = data ?? null;

        if (userData?.sub) {
          // Fetch display name from DynamoDB
          try {
            const dbRes = await fetch(`/api/profile?user_id=${encodeURIComponent(userData.sub)}`);
            if (dbRes.ok) {
              const dbData = await dbRes.json();
              if (dbData?.display_name) {
                userData.name = dbData.display_name;
              }
            }
          } catch {}
        }

        setUser(userData);

        // Play welcome greeting when user first logs in (was null, now has value)
        if (prevUserRef.current === null && userData !== null) {
          const displayName = userData?.name || userData?.nickname || userData?.email?.split('@')[0] || 'there';
          // Small delay so audio context is available (was 1200ms, reduced now TTS uses env fallback)
          setTimeout(() => playWelcomeVoice(displayName), 200);
        }
        prevUserRef.current = userData;
      })
      .catch(() => setUser(null));
  }, []);

  if (pathname === '/login') return null;

  const handleLogout = () => {
    document.cookie = 'reearth_onboarded=; path=/; max-age=0';
    window.location.href = '/auth/logout';
  };

  const displayName = user?.name || user?.nickname || user?.email?.split('@')[0] || '';
  const isLoggedIn = !!user;
  const NAV_LINKS = isLoggedIn ? AUTH_NAV_LINKS : PUBLIC_NAV_LINKS;

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/92 dark:bg-[#060d1f]/96 backdrop-blur-3xl shadow-[0_4px_40px_rgba(34,197,94,0.10)] dark:shadow-[0_4px_40px_rgba(34,197,94,0.06)] border-b border-leaf/10 dark:border-white/8'
          : 'bg-white/75 dark:bg-[#060d1f]/85 backdrop-blur-2xl border-b border-earth-100/60 dark:border-white/6'
      }`}
    >
      {/* Animated rainbow-to-brand gradient top border */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-leaf via-ocean to-leaf"
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        style={{ backgroundSize: '200% 200%' }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={{ height: scrolled ? 60 : 76 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex items-center justify-between overflow-hidden"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="relative"
            >
              {/* breathing glow ring */}
              <motion.div
                className="absolute -inset-2 bg-gradient-to-br from-leaf/50 via-ocean/30 to-leaf/40 rounded-full blur-lg"
                animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Circular crop — works with any logo aspect ratio */}
              <div className="relative w-[50px] h-[50px] rounded-full overflow-hidden ring-2 ring-leaf/40 group-hover:ring-leaf/80 transition-all duration-300 shadow-xl">
                <Image
                  src="/logo.jpeg"
                  alt="ReEarth"
                  fill
                  sizes="50px"
                  className="object-cover object-center"
                  priority
                />
              </div>
            </motion.div>
            <div className="flex flex-col leading-none gap-0.5">
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                className="text-[23px] font-extrabold tracking-tight leading-none"
              >
                {/* Re — green matching logo */}
                <span style={{ color: '#4CAF50' }}>Re</span>
                {/* Earth — teal matching logo */}
                <span style={{ background: 'linear-gradient(135deg, #2ea078 0%, #1a7a8a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Earth</span>
              </motion.div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-[9px] text-earth-400 dark:text-earth-500 font-bold tracking-[0.18em] uppercase"
              >
                Sustainable Access
              </motion.span>
            </div>
          </Link>

          {/* Center Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link, i) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Link
                    href={link.href}
                    className={`
                      relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group/link
                      ${isActive
                        ? 'text-[#4CAF50] bg-leaf/8 dark:bg-leaf/12'
                        : 'text-earth-500 dark:text-earth-400 hover:text-[#2ea078] dark:hover:text-leaf hover:bg-leaf/6 dark:hover:bg-white/6'
                      }
                    `}
                  >
                    <motion.span
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <Icon size={15} className={isActive ? 'text-[#4CAF50]' : 'group-hover/link:text-[#2ea078] transition-colors'} />
                    </motion.span>
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-[13px] left-2 right-2 h-[3px] rounded-full"
                        style={{ background: 'linear-gradient(90deg, #4CAF50, #1a8a8a, #4CAF50)' }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Right section */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Dark mode toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleDark}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-earth-400 hover:bg-earth-100 dark:hover:bg-white/10 hover:text-earth-600 dark:hover:text-earth-200 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.div key="sun" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }}>
                    <Sun size={17} />
                  </motion.div>
                ) : (
                  <motion.div key="moon" initial={{ scale: 0, rotate: 90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: -90 }}>
                    <Moon size={17} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {user ? (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', bounce: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber/10 text-amber text-xs font-bold border border-amber/15 cursor-default"
                >
                  <Leaf size={13} />
                  <span>2,450</span>
                </motion.div>

                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="text-sm font-medium text-earth-600 dark:text-earth-400 max-w-[120px] truncate"
                >
                  {displayName}
                </motion.span>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLogout}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-earth-400 hover:bg-earth-100 dark:hover:bg-white/10 hover:text-earth-600 dark:hover:text-earth-200 transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </motion.button>
              </>
            ) : (
              <motion.a
                href="/auth/login"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-leaf/25 hover:shadow-leaf/50 hover:shadow-xl transition-all duration-200 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #2ea078 50%, #1a7a8a 100%)' }}
              >
                {/* shimmer sweep on Sign In */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
                />
                <LogIn size={14} className="relative z-10" />
                <span className="relative z-10">Sign In</span>
              </motion.a>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleDark}
              className="flex items-center justify-center w-9 h-9 rounded-xl text-earth-400 dark:text-earth-300 transition-colors"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-earth-100 dark:hover:bg-white/10 text-earth-500 dark:text-earth-400 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                    <X size={20} />
                  </motion.div>
                ) : (
                  <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                    <Menu size={20} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden border-t border-earth-200/40 dark:border-white/6 bg-white/95 dark:bg-[#060d1f]/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((link, i) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                        ${isActive
                          ? 'text-leaf-dark dark:text-leaf bg-leaf/8'
                          : 'text-earth-600 dark:text-earth-400 hover:bg-earth-100 dark:hover:bg-white/5'
                        }
                      `}
                    >
                      <Icon size={16} />
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}

              <div className="border-t border-earth-100 dark:border-white/6 pt-3 mt-2">
                {user ? (
                  <>
                    {displayName && (
                      <div className="px-4 py-2 text-sm text-earth-500 dark:text-earth-400">
                        Signed in as <strong className="text-earth dark:text-earth-200">{displayName}</strong>
                      </div>
                    )}
                    <button
                      onClick={() => { setMobileOpen(false); handleLogout(); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-coral hover:bg-coral/5 transition-colors w-full"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <a
                    href="/auth/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-leaf-dark hover:bg-leaf/5 transition-colors w-full"
                  >
                    <LogIn size={16} />
                    Sign In
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
