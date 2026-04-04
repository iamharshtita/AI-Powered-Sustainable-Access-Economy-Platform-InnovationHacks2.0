'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Search, BarChart3, User as UserIcon, Menu, X, LogOut, MapPin } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Explore', icon: Search },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/profile', label: 'Profile', icon: UserIcon },
  { href: '/map', label: 'Map', icon: MapPin },
];

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') return null;

  const handleLogout = () => {
    document.cookie = 'reearth_auth=; path=/; max-age=0';
    router.push('/login');
    router.refresh();
  };

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-earth-200/40 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 8 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="absolute -inset-1.5 bg-gradient-to-br from-leaf/25 to-ocean/15 rounded-full blur-md group-hover:opacity-100 opacity-60 transition-opacity duration-300 animate-glow-pulse" />
              <Image
                src="/logo.png"
                alt="ReEarth"
                width={36}
                height={36}
                className="relative rounded-full ring-2 ring-leaf/30 group-hover:ring-leaf/50 transition-all duration-300"
                priority
              />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-extrabold font-[family-name:var(--font-heading)] tracking-tight gradient-text"
            >
              ReEarth
            </motion.span>
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
                        ? 'text-leaf-dark'
                        : 'text-earth-500 hover:text-earth hover:bg-earth-100/50'
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

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-earth-400 hover:bg-earth-100 hover:text-earth-600 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl hover:bg-earth-100 text-earth-500 transition-colors"
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

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden border-t border-earth-200/40 bg-white/95 backdrop-blur-xl overflow-hidden"
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
                          ? 'text-leaf-dark bg-leaf/8'
                          : 'text-earth-600 hover:bg-earth-100'
                        }
                      `}
                    >
                      <Icon size={16} />
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}

              <div className="border-t border-earth-100 pt-3 mt-2">
                <button
                  onClick={() => { setMobileOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-coral hover:bg-coral/5 transition-colors w-full"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
