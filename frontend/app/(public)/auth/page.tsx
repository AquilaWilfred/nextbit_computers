// app/auth/page.tsx  —  Server Component (no "use client")
//
// This wrapper exists for one reason: Next.js does not allow `export const metadata`
// from a Client Component. The actual UI lives in AuthClient which is "use client".
// Metadata is defined here and Next.js will inject it into <head> automatically.
//
// The <Suspense> boundary around AuthClient is REQUIRED because AuthClient calls
// useSearchParams() internally. Without Suspense, Next.js opts the entire route
// out of static rendering and shows a build-time warning (Next.js 14+).

import { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthClient from './AuthClient';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign In | NextBit Computer',
  description:
    'Sign in to your NextBit Computer account to track orders, manage your devices, and access exclusive offers on refurbished laptops in Kenya.',
  openGraph: {
    title: 'Sign In | NextBit Computer',
    description: 'Access your NextBit Computer account.',
    type: 'website',
    // Update with your actual domain before go-live
    url: 'https://nextbitcomputer.com/auth',
    siteName: 'NextBit Computer',
  },
  twitter: {
    card: 'summary',
    title: 'Sign In | NextBit Computer',
    description: 'Access your NextBit Computer account.',
  },
  robots: {
    // Auth pages must not be indexed
    index: false,
    follow: false,
  },
};

// Minimal full-screen fallback shown while the JS bundle loads
function AuthSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <AuthClient />
    </Suspense>
  );
}