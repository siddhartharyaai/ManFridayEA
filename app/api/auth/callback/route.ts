
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const userId = url.searchParams.get('state'); // We passed userId as state

  if (!code || !userId) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${APP_URL}/api/auth/callback`,
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
        throw new Error(tokens.error_description);
    }

    const expiryDate = Date.now() + (tokens.expires_in * 1000);

    // Store in Supabase
    // Check if user has tokens already
    const { data: existing } = await supabase.from('oauth_tokens').select('id').eq('user_id', userId).single();

    if (existing) {
        await supabase.from('oauth_tokens').update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token, // Note: Google only returns refresh_token on first auth or if prompt=consent
            expiry_date: expiryDate,
            scope: tokens.scope
        }).eq('id', existing.id);
    } else {
        await supabase.from('oauth_tokens').insert({
            user_id: userId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: expiryDate,
            scope: tokens.scope
        });
    }

    return new NextResponse("<h1>Auth Successful!</h1><p>You can go back to WhatsApp now.</p>", { headers: { 'Content-Type': 'text/html' } });

  } catch (error) {
    console.error('Auth Error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
