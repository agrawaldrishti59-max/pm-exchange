import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user }, error: authError } = await anon.auth.getUser(token);
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (authError || !user?.email || !adminEmail || user.email.toLowerCase() !== adminEmail.toLowerCase())
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { memberId, action } = await req.json();
  if (!/^[0-9a-f-]{36}$/i.test(String(memberId)) || !["approve", "reject"].includes(action))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: target } = await admin.from("members").select("status, credits, onboarding_completed_at, linkedin_url").eq("id", memberId).maybeSingle();
  if (!target || target.status !== "pending") return NextResponse.json({ error: "Member is not pending" }, { status: 400 });
  if (action === "approve" && (!target.onboarding_completed_at || !target.linkedin_url))
    return NextResponse.json({ error: "Member must complete onboarding and provide LinkedIn before approval" }, { status: 400 });
  const status = action === "approve" ? "approved" : "rejected";
  const credits = action === "approve" ? 2 : target.credits;
  const { error } = await admin.from("members").update({ status, credits }).eq("id", memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (action === "approve") await admin.from("notifications").insert({
    member_id: memberId, title: "You're approved! 🎉",
    body: "Welcome to PM Exchange! You've been given 2 credits to get started.",
  });
  return NextResponse.json({ ok: true, status, credits });
}
