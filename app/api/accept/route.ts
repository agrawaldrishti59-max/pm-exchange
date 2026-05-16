import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { sessionId, hostId, bookerId } = await req.json();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const [{ data: host }, { data: booker }] = await Promise.all([
    supabase.from("members").select("*").eq("id", hostId).single(),
    supabase.from("members").select("*").eq("id", bookerId).single(),
  ]);

  if (!host || !booker) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Generate meet link via Google Apps Script
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  let meetLink = null;

  if (scriptUrl && scriptUrl !== "https://placeholder.com") {
    try {
      const res = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "accept",
          bookerName: booker.name, bookerEmail: booker.email, bookerWhatsapp: booker.whatsapp || "",
          hostName: host.name, hostEmail: host.email, hostWhatsapp: host.whatsapp || "",
        }),
      });
      const data = await res.json();
      meetLink = data.meetLink || null;
    } catch (e) { console.error("Script error:", e); }
  }

  // Save meet link to session
  if (meetLink) {
    await supabase.from("sessions").update({ meet_link: meetLink }).eq("id", sessionId);
  }

  return NextResponse.json({ ok: true, meetLink });
}
