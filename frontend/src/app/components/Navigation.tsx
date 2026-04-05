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
  const [user, setUser] = useState<Auth0User | null | undefined>(undefined); // undefined = loading
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const prevUserRef = useRef<Auth0User | null>(null);

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
          // Small delay so page settles
          setTimeout(() => playWelcomeVoice(displayName), 1200);
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
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 bg-white/85 dark:bg-[#060d1f]/90 backdrop-blur-2xl border-b border-earth-200/40 dark:border-white/6 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo — more prominent */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <motion.div
              whileHover={{ scale: 1.12, rotate: 10 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="absolute -inset-2 bg-gradient-to-br from-leaf/30 to-ocean/20 rounded-full blur-lg group-hover:opacity-100 opacity-70 transition-opacity duration-300 animate-glow-pulse" />
              <Image
                src="/logo.png"
                alt="ReEarth"
                width={48}
                height={48}
                className="relative rounded-full ring-2 ring-leaf/40 group-hover:ring-leaf/70 transition-all duration-300 shadow-lg"
                priority
              />
            </motion.div>
            <div className="flex flex-col leading-none">
              <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-extrabold font-[family-name:var(--font-heading)] tracking-tight gradient-text"
              >
                ReEarth
              </motion.span>
              <span className="text-[10px] text-earth-400 dark:text-earth-500 font-medium tracking-wide">Sustainable Access</span>
            </div>
          </Link>

          {/* Center Nav Links */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((link, i) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                >
                  <Link
                    href={link.href}
                    className={`
                      relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                      ${isActive
                        ? 'text-leaf-dark dark:text-leaf'
                        : 'text-earth-500 dark:text-earth-400 hover:text-earth dark:hover:text-earth-200 hover:bg-earth-100/50 dark:hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon size={15} />
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-[9px] left-3 right-3 h-0.5 bg-leaf rounded-full"
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-leaf text-white text-sm font-semibold hover:bg-leaf-dark transition-colors shadow-sm shadow-leaf/20"
              >
                <LogIn size={14} />
                Sign In
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
        </div>
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
