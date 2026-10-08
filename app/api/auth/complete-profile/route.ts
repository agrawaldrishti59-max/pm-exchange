import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authError } = await anon.auth.getUser(token);
    if (authError || !user?.email) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const body = await req.json();
    if (req.nextUrl.pathname.endsWith("/complete-profile")) {
      if (typeof body.name !== "string" || !body.name.trim() || typeof body.linkedin_url !== "string" || !/^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/.test(body.linkedin_url) || !body.role?.trim())
        return NextResponse.json({ error: "Name, valid LinkedIn profile and title are required" }, { status: 400 });
      const { error } = await admin.from("members").update({
        name: body.name.trim().slice(0, 120), linkedin_url: body.linkedin_url,
        company: String(body.company || "").slice(0, 120) || null,
        role: String(body.role).slice(0, 120), whatsapp: String(body.whatsapp || "").slice(0, 50) || null,
        bio: String(body.bio || "").slice(0, 120) || null,
        years_experience: body.years_experience == null ? null : Number(body.years_experience),
      }).eq("email", user.email);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      const allowed = ["interview_prep", "career_growth", "networking", "case_studies", "communication", "explore"];
      const interests = body.interests;
      if (!Array.isArray(interests) || interests.length === 0 || !interests.every((x: unknown) => typeof x === "string" && allowed.includes(x)))
        return NextResponse.json({ error: "Select at least one valid interest" }, { status: 400 });
      const { data: member } = await admin.from("members").select("name, linkedin_url, role").eq("email", user.email).maybeSingle();
      if (!member?.name || !member.linkedin_url || !member.role)
        return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
      const { error } = await admin.from("members").update({
       interests: Array.from(new Set(interests)), goal: interests[0], onboarding_completed_at: new Date().toISOString(),
      }).eq("email", user.email);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not save onboarding information" }, { status: 500 });
  }
}
