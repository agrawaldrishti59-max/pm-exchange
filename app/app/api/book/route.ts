import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { bookerId, hostId, note } = await req.json();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const [{ data: booker }, { data: host }] = await Promise.all([
    supabase.from("members").select("*").eq("id", bookerId).single(),
    supabase.from("members").select("*").eq("id", hostId).single(),
  ]);

  if (!booker || !host) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Send notification email via Google Apps Script
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (scriptUrl && scriptUrl !== "https://placeholder.com") {
    try {
      await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "request",
          bookerName: booker.name, bookerEmail: booker.email, bookerWhatsapp: booker.whatsapp || "",
          hostName: host.name, hostEmail: host.email, hostWhatsapp: host.whatsapp || "",
          note: note || "",
        }),
      });
    } catch (e) { console.error("Script error:", e); }
  }

  return NextResponse.json({ ok: true });
}
