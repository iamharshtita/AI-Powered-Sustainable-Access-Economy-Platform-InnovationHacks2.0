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

    // If cookie already set, user has been through onboarding
    if (document.cookie.includes('reearth_onboarded=true')) return;

    // Check if user is logged in via Auth0
    fetch('/auth/profile', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((authUser) => {
        if (!authUser?.sub) return; // Not logged in — nothing to guard

        // Check if user already has a profile in DynamoDB
        fetch(`/api/profile?user_id=${encodeURIComponent(authUser.sub)}`)
          .then((res) => {
            if (res.ok) {
              // Existing user — set cookie and stay on current page
              document.cookie = 'reearth_onboarded=true; path=/; max-age=2592000';
            } else if (res.status === 404) {
              // New user — redirect to onboarding
              router.replace('/onboarding');
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, [pathname, router]);

  return null;
}
