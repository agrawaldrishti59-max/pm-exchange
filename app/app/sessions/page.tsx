"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Session = { id: string; status: string; meet_link: string | null; note: string | null; created_at: string; slot_id: string | null; booker: any; host: any; };

function formatSlot(dt: string) {
  return new Date(dt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [myId, setMyId] = useState<string | null>(null);
  const [myCredits, setMyCredits] = useState(0);
  const [tab, setTab] = useState<"upcoming" | "give">("upcoming");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [banner, setBanner] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/join"); return; }
      const { data: me } = await supabase.from("members").select("id, credits").eq("email", session.user.email).maybeSingle();
      if (!me) return;
      setMyId(me.id); setMyCredits(me.credits);

      const { data } = await supabase.from("sessions")
        .select(`id, status, meet_link, note, created_at, slot_id, booker:booker_id(id,name,company,role,email,whatsapp), host:host_id(id,name,company,role,email,whatsapp)`)
        .or(`booker_id.eq.${me.id},host_id.eq.${me.id}`)
        .order("created_at", { ascending: false });
      setSessions((data as any) || []);

      const slotIds = ((data as any) || []).filter((s: any) => s.slot_id).map((s: any) => s.slot_id);
      if (slotIds.length > 0) {
        const { data: slotData } = await supabase.from("slots").select("id, datetime").in("id", slotIds);
        const map: Record<string, string> = {};
        (slotData || []).forEach((s: any) => { map[s.id] = s.datetime; });
        setSlots(map);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function acceptSession(s: Session) {
    setActing(s.id); setBanner("");
    // Deduct 1 credit from the booker now (only on acceptance)
    const { data: booker } = await supabase.from("members").select("credits").eq("id", s.booker.id).single();
    if (!booker || booker.credits < 1) {
      // Booker has no credits anymore; cancel instead
      await supabase.from("sessions").update({ status: "cancelled" }).eq("id", s.id);
      if (s.slot_id) await supabase.from("slots").update({ is_booked: false }).eq("id", s.slot_id);
      await supabase.from("notifications").insert([{
        member_id: s.booker.id, title: "Session could not be confirmed",
        body: `You no longer have enough credits for the session with ${s.host.name}.`
      }]);
      setSessions(prev => prev.map(x => x.id === s.id ? { ...x, status: "cancelled" } : x));
      setActing(null);
      return;
    }
    await supabase.from("members").update({ credits: booker.credits - 1 }).eq("id", s.booker.id);
    await supabase.from("sessions").update({ status: "accepted" }).eq("id", s.id);
    await fetch("/api/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: s.id, hostId: s.host.id, bookerId: s.booker.id }) });
    await supabase.from("notifications").insert([{
      member_id: s.booker.id,
      title: "Session accepted",
      body: `${s.host.name} accepted your request. Check your email for the Google Meet link. 1 credit was used.`
    }]);
    setSessions(prev => prev.map(x => x.id === s.id ? { ...x, status: "accepted" } : x));
    setActing(null);
  }

  async function declineSession(s: Session) {
    setActing(s.id);
    // No credit was deducted at request time, so nothing to refund.
    if (s.slot_id) await supabase.from("slots").update({ is_booked: false }).eq("id", s.slot_id);
    await supabase.from("sessions").update({ status: "cancelled" }).eq("id", s.id);
    await supabase.from("notifications").insert([{
      member_id: s.booker.id,
      title: "Session declined",
      body: `${s.host.name} could not accept this time. No credit was used.`
    }]);
    setSessions(prev => prev.map(x => x.id === s.id ? { ...x, status: "cancelled" } : x));
    setActing(null);
  }

  async function markComplete(s: Session) {
    setActing(s.id);
    const { data: host } = await supabase.from("members").select("credits").eq("id", s.host.id).single();
    if (host) await supabase.from("members").update({ credits: host.credits + 1 }).eq("id", s.host.id);
    await supabase.from("sessions").update({ status: "completed" }).eq("id", s.id);
    await supabase.from("notifications").insert([{
      member_id: s.host.id,
      title: "+1 credit earned",
      body: `Session with ${s.booker.name} marked complete. You earned 1 credit.`
    }]);
    setSessions(prev => prev.map(x => x.id === s.id ? { ...x, status: "completed" } : x));
    if (s.host.id === myId) setMyCredits(c => c + 1);
    setActing(null);
  }

  const statusLabel: Record<string, { bg: string; color: string; text: string }> = {
    pending: { bg: "#FAEEDA", color: "#633806", text: "Pending" },
    accepted: { bg: "#E1F5EE", color: "#0F6E56", text: "Accepted" },
    completed: { bg: "#EAF3DE", color: "#3B6D11", text: "Done" },
    cancelled: { bg: "#f5f5f5", color: "#999", text: "Cancelled" },
  };

  function Card({ s }: { s: Session }) {
    const iAmHost = s.host?.id === myId;
    const other = iAmHost ? s.booker : s.host;
    const sl = statusLabel[s.status] || statusLabel.pending;
    const slotTime = s.slot_id && slots[s.slot_id] ? formatSlot(slots[s.slot_id]) : null;

    return (
      <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{other?.name}</p>
            <p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>{[other?.role, other?.company].filter(Boolean).join(" @ ")}</p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 8, background: sl.bg, color: sl.color, flexShrink: 0, marginLeft: 8 }}>{iAmHost ? (s.status === "completed" ? "Gave" : s.status === "accepted" ? "Accepted" : "Giving") : (s.status === "completed" ? "Got" : sl.text)}</span>
        </div>
        {slotTime && <p style={{ fontSize: 12, color: "#666", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 4 }}>📅 {slotTime}</p>}
        {s.note && <p style={{ fontSize: 12, color: "#888", background: "#f9f9f9", borderRadius: 6, padding: "6px 8px", marginBottom: 8 }}>"{s.note}"</p>}
        <div style={{ fontSize: 12, color: "#666", marginBottom: s.status !== "completed" ? 10 : 0 }}>
          {other?.email && <p style={{ margin: "2px 0" }}>✉️ {other.email}</p>}
          {other?.whatsapp && <p style={{ margin: "2px 0" }}>📱 {other.whatsapp}</p>}
          {s.meet_link && <p style={{ margin: "4px 0" }}><a href={s.meet_link} target="_blank" rel="noopener noreferrer" style={{ color: "#0F6E56", fontWeight: 500 }}>🎥 Join Google Meet</a></p>}
        </div>
        {s.status === "pending" && iAmHost && (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button style={{ flex: 1, padding: "9px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              onClick={() => acceptSession(s)} disabled={acting === s.id}>{acting === s.id ? "…" : "Accept"}</button>
            <button style={{ flex: 1, padding: "9px", background: "transparent", color: "#e53e3e", border: "1px solid #fed7d7", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
              onClick={() => declineSession(s)} disabled={acting === s.id}>Decline</button>
          </div>
        )}
        {s.status === "accepted" && iAmHost && (
          <button style={{ width: "100%", padding: "9px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4 }}
            onClick={() => markComplete(s)} disabled={acting === s.id}>{acting === s.id ? "…" : "Mark session done · earn +1 credit"}</button>
        )}
        {s.status === "completed" && iAmHost && <p style={{ fontSize: 12, color: "#3B6D11", textAlign: "center", fontWeight: 500, marginTop: 8 }}>+1 credit earned</p>}
      </div>
    );
  }

  const myBookings = sessions.filter(s => s.booker?.id === myId && s.status !== "completed" && s.status !== "cancelled");
  const giveRequests = sessions.filter(s => s.host?.id === myId && (s.status === "pending" || s.status === "accepted"));
  const pastSessions = sessions.filter(s => s.status === "completed" || s.status === "cancelled");

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
              {t === "upcoming" ? "My bookings" : `Give interview${giveRequests.filter(s => s.status === "pending").length ? ` (${giveRequests.filter(s => s.status === "pending").length})` : ""}`}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        {loading && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Loading…</div>}
        {!loading && tab === "upcoming" && (
          <>
            {myBookings.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#999" }}><p>No upcoming sessions.</p><p style={{ marginTop: 4, fontSize: 13 }}>Browse Explore to book one.</p></div>}
            {myBookings.map(s => <Card key={s.id} s={s} />)}
            {pastSessions.filter(s => s.booker?.id === myId).length > 0 && <>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", margin: "16px 0 8px" }}>Past</p>
              {pastSessions.filter(s => s.booker?.id === myId).map(s => <Card key={s.id} s={s} />)}
            </>}
          </>
        )}
        {!loading && tab === "give" && (
          <>
            {giveRequests.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#999" }}><p>No requests yet.</p><p style={{ marginTop: 4, fontSize: 13 }}>When someone books you, it will appear here.</p></div>}
            {giveRequests.map(s => <Card key={s.id} s={s} />)}
            {pastSessions.filter(s => s.host?.id === myId).length > 0 && <>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", margin: "16px 0 8px" }}>Past</p>
              {pastSessions.filter(s => s.host?.id === myId).map(s => <Card key={s.id} s={s} />)}
            </>}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
