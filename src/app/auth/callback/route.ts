import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Supabase auth callback — handles PKCE code exchange server-side.
 *
 * Supabase redirects here after email verification / password reset with
 * ?code=<pkce_code>&next=<destination>.
 * We exchange the code for a session (writes auth cookies), then redirect
 * the user to their destination. This avoids the client-side double-invoke
 * problem in React Strict Mode and keeps the code verifier server-accessible.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Exchange failed — send back to forgot-password with a flag
  return NextResponse.redirect(new URL('/forgot-password?error=expired', origin))
}
