'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { User, MapPin, Phone, ArrowRight, Leaf, Home, Building2, Map } from 'lucide-react';
import FallingLeaves from '../components/FallingLeaves';

interface Auth0User {
  sub?: string;
  name?: string;
  email?: string;
  nickname?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<Auth0User | null>(null);
  const [name, setName] = useState('');
  const [apt, setApt] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('United States');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (document.cookie.includes('reearth_onboarded=true')) {
      router.push('/');
      return;
    }
    fetch('/auth/profile', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) { router.push('/login'); return; }
        setUser(data);
        if (data.name) setName(data.name);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setError('');
    setIsLoading(true);

    const fullAddress = [apt, street, city, state, country]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(', ');

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.sub ?? '',
          email: user?.email ?? '',
          display_name: name.trim(),
          address: fullAddress,
          phone_number: phone.trim(),
        }),
      });

      if (res.ok) {
        document.cookie = 'reearth_onboarded=true; path=/; max-age=2592000';
        router.push('/');
      } else {
        setError('Failed to save profile. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const inputClass = "w-full pl-10 pr-4 py-3 rounded-xl bg-earth-50 border border-earth-200 text-earth placeholder:text-earth-400 text-sm outline-none focus:border-leaf/50 focus:ring-4 focus:ring-leaf/10 transition-all";
  const smallInputClass = "w-full px-4 py-3 rounded-xl bg-earth-50 border border-earth-200 text-earth placeholder:text-earth-400 text-sm outline-none focus:border-leaf/50 focus:ring-4 focus:ring-leaf/10 transition-all";

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-earth-50">
      <FallingLeaves count={15} />
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-leaf/8 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg mx-4 my-8"
      >
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-earth/10 border border-white/60 p-8 sm:p-10">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-3 mb-6">
            <Image src="/logo.png" alt="ReEarth" width={40} height={40} className="rounded-full" priority />
            <span className="text-xl font-extrabold font-[family-name:var(--font-heading)] gradient-text">ReEarth</span>
          </motion.div>

          <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-earth mb-1">Complete Your Profile</h1>
          <p className="text-sm text-earth-400 mb-6">Welcome, {user.email}! Tell us a bit about yourself.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-earth-600 mb-1.5">Full Name *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400"><User size={16} /></span>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name" required autoComplete="name" className={inputClass} />
              </div>
            </div>

            {/* Address section */}
            <fieldset>
              <legend className="block text-sm font-semibold text-earth-600 mb-1.5">Address</legend>
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <input type="text" value={apt} onChange={(e) => setApt(e.target.value)}
                    placeholder="Apt / Suite" autoComplete="address-line2" className={smallInputClass} />
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400"><Home size={14} /></span>
                    <input type="text" value={street} onChange={(e) => setStreet(e.target.value)}
                      placeholder="Street address" autoComplete="address-line1" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400"><Building2 size={14} /></span>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                      placeholder="City" autoComplete="address-level2" className={inputClass} />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400"><Map size={14} /></span>
                    <input type="text" value={state} onChange={(e) => setState(e.target.value)}
                      placeholder="State" autoComplete="address-level1" className={inputClass} />
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400"><MapPin size={14} /></span>
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                    placeholder="Country" autoComplete="country-name" className={inputClass} />
                </div>
              </div>
            </fieldset>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-earth-600 mb-1.5">Phone Number</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400"><Phone size={16} /></span>
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000" autoComplete="tel" className={inputClass} />
              </div>
            </div>

            {error && <p className="text-coral text-sm bg-coral/5 border border-coral/20 rounded-xl px-4 py-2.5">{error}</p>}

            <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-leaf to-leaf-dark text-white text-sm font-bold shadow-lg shadow-leaf/25 hover:shadow-xl hover:shadow-leaf/30 disabled:opacity-60 transition-all">
              {isLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <>Get Started <ArrowRight size={16} /></>
              )}
            </motion.button>
          </form>

          <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-earth-400">
            <Leaf size={12} className="text-leaf" />
            <span>Your data is stored securely</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
