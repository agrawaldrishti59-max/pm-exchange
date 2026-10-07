import { NextRequest, NextResponse } from "next/server";

// The real sign-in handling happens client-side in app/auth/callback/page.tsx,
// where the Supabase session (and PKCE verifier, if any) lives in the browser.
// This route only forwards Google's OAuth redirect to that client page.
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const code = req.nextUrl.searchParams.get("code");
  const dest = code
    ? `${appUrl}/auth/callback?code=${encodeURIComponent(code)}`
    : `${appUrl}/auth/callback`;
  return NextResponse.redirect(dest);
}
