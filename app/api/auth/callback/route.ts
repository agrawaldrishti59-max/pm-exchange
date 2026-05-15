import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (!code) return NextResponse.redirect(`${appUrl}/join`);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("Exchange error:", error);
    return NextResponse.redirect(`${appUrl}/join`);
  }

  const email = data.session.user.email!;
  const name = data.session.user.user_metadata?.full_name || "";

  const { data: member } = await supabase
    .from("members").select("status, linkedin_url").eq("email", email).single();

  if (!member) {
    await supabase.from("members").insert([{ email, name, status: "pending", credits: 0 }]);
    return NextResponse.redirect(`${appUrl}/complete-profile`);
  }
  if (!member.linkedin_url) return NextResponse.redirect(`${appUrl}/complete-profile`);
  if (member.status === "approved") return NextResponse.redirect(`${appUrl}/community`);
  return NextResponse.redirect(`${appUrl}/pending`);
}
