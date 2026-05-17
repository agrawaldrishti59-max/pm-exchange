import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// No forced PKCE. The implicit flow is what works in this setup, and the
// client-side /auth/callback page handles the SIGNED_IN event for both
// Google OAuth and magic links.
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
  if (error || !data.url) {
    return NextResponse.json({ error: "Failed to start Google sign in" }, { status: 500 });
  }
  return NextResponse.json({ url: data.url });
}
