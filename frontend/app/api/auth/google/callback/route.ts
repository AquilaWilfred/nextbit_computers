import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CATALOGUE_URL = process.env.CATALOGUE_URL || 'http://localhost:8001';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/auth?error=google_cancelled`);
  }

  try {
    // 1. Exchange code for tokens with Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      throw new Error('Failed to exchange code with Google');
    }

    const tokens = await tokenRes.json();

    // 2. Get user profile from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      throw new Error('Failed to fetch Google profile');
    }

    const profile = await profileRes.json();

    // 3. Upsert user in catalogue
    const upsertRes = await fetch(`${CATALOGUE_URL}/api/auth/oauth/upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': 'nextbit_internal_secret_2026',
      },
      body: JSON.stringify({
        email: profile.email,
        name: profile.name,
        google_id: profile.id,
        avatar: profile.picture,
      }),
    });

    if (!upsertRes.ok) {
      throw new Error('Failed to create/find user account');
    }

    const { access_token } = await upsertRes.json();

    // 4. Set auth cookies and redirect to dashboard
    const response = NextResponse.redirect(`${APP_URL}/dashboard`);

    const cookieOpts = {
      httpOnly: false,
      secure: APP_URL.startsWith('https'),
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24,
      path: '/',
    };

    response.cookies.set('nextbit_token', access_token, { ...cookieOpts, httpOnly: true });
    response.cookies.set('nextbit_ws_token', access_token, cookieOpts);

    return response;
  } catch (err: any) {
    console.error('[Google OAuth]', err.message);
    return NextResponse.redirect(`${APP_URL}/auth?error=google_failed`);
  }
}
