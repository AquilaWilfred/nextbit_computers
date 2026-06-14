import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CATALOGUE_URL = process.env.CATALOGUE_URL || 'http://localhost:8001';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/auth?error=facebook_cancelled`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: `${APP_URL}/api/auth/facebook/callback`,
        code,
      })
    );

    if (!tokenRes.ok) throw new Error('Failed to exchange code with Facebook');
    const { access_token } = await tokenRes.json();

    // 2. Get user profile from Facebook
    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${access_token}`
    );

    if (!profileRes.ok) throw new Error('Failed to fetch Facebook profile');
    const profile = await profileRes.json();

    if (!profile.email) {
      return NextResponse.redirect(`${APP_URL}/auth?error=facebook_no_email`);
    }

    // 3. Upsert user in catalogue (reuse same endpoint as Google)
    const upsertRes = await fetch(`${CATALOGUE_URL}/api/auth/oauth/upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': 'nextbit_internal_secret_2026',
      },
      body: JSON.stringify({
        email: profile.email,
        name: profile.name,
        google_id: `fb_${profile.id}`,
      }),
    });

    if (!upsertRes.ok) throw new Error('Failed to create/find user account');
    const { access_token: jwt } = await upsertRes.json();

    // 4. Set cookies and redirect
    const response = NextResponse.redirect(`${APP_URL}/dashboard`);
    const cookieOpts = {
      secure: APP_URL.startsWith('https'),
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24,
      path: '/',
    };

    response.cookies.set('nextbit_token', jwt, { ...cookieOpts, httpOnly: true });
    response.cookies.set('nextbit_ws_token', jwt, cookieOpts);

    return response;
  } catch (err: any) {
    console.error('[Facebook OAuth]', err.message);
    return NextResponse.redirect(`${APP_URL}/auth?error=facebook_failed`);
  }
}
