"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type Session = { id: string; status: string; meet_link: string | null; note: string | null; created_at: string; booker: any; host: any; };

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [myCredits, setMyCredits] = useState(0);
  const [tab, setTab] = useState<"upcoming" | "give">("upcoming");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
     const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/join"); return; }
      const { data: me } = await supabase.from("members").select("id, credits").eq("email", session.user.email).single();
      if (!me) return;
      setMyId(me.id); setMyCredits(me.credits);
      const { data } = await supabase.from("sessions")
        .select(`id, status, meet_link, note, created_at, booker:booker_id(id,name,company,role,email,whatsapp), host:host_id(id,name,company,role,email,whatsapp)`)
        .or(`booker_id.eq.${me.id},host_id.eq.${me.id}`)
        .order("created_at", { ascending: false });
      setSessions((data as any) || []); setLoading(false);
    }
    load();
  }, [router]);

  async function markComplete(s: Session) {
    setCompleting(s.id);
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: host } = await supabase.from("members").select("credits").eq("id", s.host.id).single();
    if (host) await supabase.from("members").update({ credits: host.credits + 1 }).eq("id", s.host.id);
    await supabase.from("sessions").update({ status: "completed" }).eq("id", s.id);
    setSessions(prev => prev.map(x => x.id === s.id ? { ...x, status: "completed" } : x));
    if (s.host.id === myId) setMyCredits(c => c + 1);
    setCompleting(null);
  }

  function Card({ s }: { s: Session }) {
    const iAmHost = s.host?.id === myId;
    const other = iAmHost ? s.booker : s.host;
    const statusBg: Record<string, string> = { pending: "#FAEEDA", completed: "#EAF3DE" };
    const statusColor: Record<string, string> = { pending: "#633806", completed: "#3B6D11" };
    return (
      <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{other?.name}</p>
            <p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>{[other?.role, other?.company].filter(Boolean).join(" @ ")}</p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 8, background: statusBg[s.status] || "#eee", color: statusColor[s.status] || "#666" }}>
            {iAmHost ? (s.status === "completed" ? "Gave ✓" : "Giving") : (s.status === "completed" ? "Got ✓" : "Receiving")}
          </span>
        </div>
        {s.note && <p style={{ fontSize: 12, color: "#888", background: "#f9f9f9", borderRadius: 6, padding: "6px 8px", marginBottom: 8 }}>"{s.note}"</p>}
        <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
          {other?.email && <p style={{ margin: "2px 0" }}>✉️ {other.email}</p>}
          {other?.whatsapp && <p style={{ margin: "2px 0" }}>📱 {other.whatsapp}</p>}
          {s.meet_link && <p style={{ margin: "2px 0" }}><a href={s.meet_link} target="_blank" rel="noopener noreferrer" style={{ color: "#0F6E56" }}>🎥 {s.meet_link}</a></p>}
        </div>
        {s.status === "pending" && iAmHost && (
          <button style={{ width: "100%", padding: "10px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            onClick={() => markComplete(s)} disabled={completing === s.id}>
            {completing === s.id ? "Saving…" : "Mark done · earn +1 credit"}
          </button>
        )}
        {s.status === "completed" && iAmHost && <p style={{ fontSize: 12, color: "#3B6D11", textAlign: "center", fontWeight: 500 }}>+1 credit earned 🎉</p>}
      </div>
    );
  }

  const myBookings = sessions.filter(s => s.booker?.id === myId && s.status !== "completed");
  const giveRequests = sessions.filter(s => s.host?.id === myId && s.status === "pending");
  const pastMine = sessions.filter(s => s.status === "completed" && s.booker?.id === myId);
  const pastGave = sessions.filter(s => s.status === "completed" && s.host?.id === myId);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "48px 16px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Sessions</h1>
          <span style={{ background: "#FAEEDA", color: "#633806", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20 }}>🪙 {myCredits}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["upcoming", "give"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: tab === t ? "#111" : "#f0f0f0", color: tab === t ? "#fff" : "#666" }}>
              {t === "upcoming" ? "My bookings" : `Give interview${giveRequests.length ? ` (${giveRequests.length})` : ""}`}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        {loading && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Loading…</div>}
        {!loading && tab === "upcoming" && (
          <>
            {myBookings.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#999" }}><p>No upcoming sessions.</p><p style={{ marginTop: 4 }}>Browse the community to book one.</p></div>}
            {myBookings.map(s => <Card key={s.id} s={s} />)}
            {pastMine.length > 0 && <><p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", margin: "16px 0 8px" }}>Past</p>{pastMine.map(s => <Card key={s.id} s={s} />)}</>}
          </>
        )}
        {!loading && tab === "give" && (
          <>
            {giveRequests.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#999" }}><p>No requests yet.</p><p style={{ marginTop: 4 }}>When someone books you, it'll appear here.</p></div>}
            {giveRequests.map(s => <Card key={s.id} s={s} />)}
            {pastGave.length > 0 && <><p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", margin: "16px 0 8px" }}>Past</p>{pastGave.map(s => <Card key={s.id} s={s} />)}</>}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
