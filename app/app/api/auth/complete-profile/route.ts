import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.email) {
    return NextResponse.json({ error: "Email missing from session" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Update the existing pending row created at sign-in. Do not reset
  // status or credits here; the admin controls those on approval.
  const { error } = await supabase
    .from("members")
    .update({
      linkedin_url: body.linkedin_url,
      company: body.company || null,
      role: body.role || null,
      whatsapp: body.whatsapp || null,
      bio: body.bio || null,
      years_experience: body.years_experience ?? null,
    })
    .eq("email", body.email);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
