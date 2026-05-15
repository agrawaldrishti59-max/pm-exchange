"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type Member = { id: string; name: string; company: string; role: string; linkedin_url: string; credits: number; email: string; whatsapp: string; };

export default function MemberPage() {
  const params = useParams();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [me, setMe] = useState<Member | null>(null);
  const [note, setNote] = useState("");
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/join"); return; }
      const [{ data: m }, { data: myData }] = await Promise.all([
        supabase.from("members").select("*").eq("id", params.id).single(),
        supabase.from("members").select("*").eq("email", session.user.email).single(),
      ]);
      setMember(m); setMe(myData); setLoading(false);
    }
    load();
  }, [params.id, router]);

  async function handleBook() {
    if (!me || !member) return;
    if (me.credits < 1) { setError("Not enough credits. Give an interview to earn more."); return; }
    setBooking(true); setError("");
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      await supabase.from("members").update({ credits: me.credits - 1 }).eq("id", me.id);
      await supabase.from("sessions").insert([{ booker_id: me.id, host_id: member.id, note: note || null, status: "pending" }]);
      await fetch("/api/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookerId: me.id, hostId: member.id, note }) });
      setBooked(true);
    } catch (e: any) { setError(e.message); }
    finally { setBooking(false); }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>Loading…</div>;
  if (!member) return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>Member not found</div>;

  if (booked) return (
    <div style={{ padding: 32, textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h2>Session requested!</h2>
      <p style={{ color: "#666", lineHeight: 1.6 }}>Both you and <strong>{member.name}</strong> have been emailed with each other's contact details and a Google Meet link. Coordinate a time over WhatsApp.</p>
      <p style={{ color: "#BA7517", fontWeight: 600, marginTop: 12 }}>🪙 1 credit used</p>
      <button onClick={() => router.push("/community")} style={{ width: "100%", marginTop: 16, padding: 13, background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Back to community</button>
      <button onClick={() => router.push("/sessions")} style={{ width: "100%", marginTop: 8, padding: 11, background: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>View sessions</button>
    </div>
  );

  const isMe = me?.id === member.id;
  const initials = member.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "48px 16px 16px" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#888", fontSize: 14, marginBottom: 12, cursor: "pointer", padding: 0 }}>← Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E6F1FB", color: "#185FA5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600 }}>{initials}</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{member.name}</h1>
            <p style={{ fontSize: 13, color: "#888", margin: "2px 0 0" }}>{[member.role, member.company].filter(Boolean).join(" @ ")}</p>
            <span style={{ background: "#FAEEDA", color: "#633806", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, display: "inline-block", marginTop: 4 }}>🪙 {member.credits} credits</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>LinkedIn</p>
          <a href={member.linkedin_url?.startsWith("http") ? member.linkedin_url : `https://${member.linkedin_url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#185FA5", wordBreak: "break-all" }}>{member.linkedin_url}</a>
        </div>

        {!isMe && (
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Book a session</p>
            <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 12 }}>Costs <strong>1 credit</strong>. Both of you get emailed with a Google Meet link and each other's contact to agree on a time.</p>
            {me && <p style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>You have <span style={{ color: "#BA7517", fontWeight: 600 }}>{me.credits} credits</span>.</p>}
            <textarea style={{ width: "100%", padding: 12, border: "1px solid #ddd", borderRadius: 8, fontSize: 13, resize: "none", marginBottom: 12, boxSizing: "border-box" as const, fontFamily: "inherit" }} rows={3}
              placeholder={`Message to ${member.name?.split(" ")[0]} (optional)`} value={note} onChange={e => setNote(e.target.value)} />
            {error && <p style={{ color: "red", fontSize: 13, marginBottom: 8 }}>{error}</p>}
            <button style={{ width: "100%", padding: 13, background: (me?.credits ?? 0) < 1 ? "#ccc" : "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: (me?.credits ?? 0) < 1 ? "not-allowed" : "pointer" }}
              onClick={handleBook} disabled={booking || (me?.credits ?? 0) < 1}>
              {booking ? "Booking…" : "Book session · 1 credit"}
            </button>
            {(me?.credits ?? 0) < 1 && <p style={{ fontSize: 12, color: "#999", textAlign: "center", marginTop: 8 }}>No credits? Accept an interview request in Sessions to earn one.</p>}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
