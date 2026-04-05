'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const SKIP_PATHS = ['/login', '/onboarding', '/auth'];

export default function OnboardingGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Skip on login, onboarding, and auth routes
    if (SKIP_PATHS.some((p) => pathname.startsWith(p))) return;

    // Check if user is logged in via Auth0
    fetch('/auth/profile', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((authUser) => {
        if (!authUser?.sub) return; // Not logged in, proxy will handle redirect

        // Check if user has completed onboarding (cookie set by onboarding page)
        const onboarded = document.cookie.includes('reearth_onboarded=true');
        if (!onboarded) {
          router.replace('/onboarding');
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  return null;
}
