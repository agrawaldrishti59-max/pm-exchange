"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Session = { id: string; status: string; meet_link: string | null; note: string | null; created_at: string; slot_id: string | null; booker: any; host: any; };

const BRAND = "#4F46E5";

function formatSlot(dt: string) {
  return new Date(dt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function waLink(num: string) {
  const clean = (num || "").replace(/[^0-9]/g, "");
  return clean ? `https://wa.me/${clean}` : null;
}

function SessionsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [myId, setMyId] = useState<string | null>(null);
  const [myCredits, setMyCredits] = useState(0);
  const [tab, setTab] = useState<"upcoming" | "give">(params.get("tab") === "give" ? "give" : "upcoming");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<Session | null>(null);
  const [fbRating, setFbRating] = useState(0);
  const [fbComment, setFbComment] = useState("");

  async function reload(meId: string) {
    const { data } = await supabase.from("sessions")
      .select(`id, status, meet_link, note, created_at, slot_id, booker:booker_id(id,name,company,role,email,whatsapp,linkedin_url), host:host_id(id,name,company,role,email,whatsapp,linkedin_url)`)
      .or(`booker_id.eq.${meId},host_id.eq.${meId}`)
      .order("created_at", { ascending: false });
    setSessions((data as any) || []);
    const slotIds = ((data as any) || []).filter((s: any) => s.slot_id).map((s: any) => s.slot_id);
    if (slotIds.length > 0) {
      const { data: slotData } = await supabase.from("slots").select("id, datetime").in("id", slotIds);
      const map: Record<string, string> = {};
      (slotData || []).forEach((s: any) => { map[s.id] = s.datetime; });
      setSlots(map);
    }
  }

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/join"); return; }
      const { data: me } = await supabase.from("members").select("id, credits").eq("email", session.user.email).maybeSingle();
      if (!me) return;
      setMyId(me.id); setMyCredits(me.credits);
      await reload(me.id);
      setLoading(false);
    }
    load();
  }, [router]);

  async function acceptSession(s: Session) {
    setActing(s.id);
    const { data: booker } = await supabase.from("members").select("credits").eq("id", s.booker.id).single();
    if (!booker || booker.credits < 1) {
      await supabase.from("sessions").update({ status: "cancelled" }).eq("id", s.id);
      if (s.slot_id) await supabase.from("slots").update({ is_booked: false }).eq("id", s.slot_id);
      await supabase.from("notifications").insert([{
        member_id: s.booker.id, title: "Session could not be confirmed",
        body: `You no longer have enough credits for the session with ${s.host.name}.`
      }]);
      if (myId) await reload(myId);
      setActing(null);
      return;
    }
    await supabase.from("members").update({ credits: booker.credits - 1 }).eq("id", s.booker.id);
    await supabase.from("sessions").update({ status: "accepted" }).eq("id", s.id);
    await fetch("/api/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: s.id, hostId: s.host.id, bookerId: s.booker.id }) });
    await supabase.from("notifications").insert([{
      member_id: s.booker.id,
      title: "Session accepted",
      body: `${s.host.name} accepted your request. The Google Meet link is in your email and on the session. 1 credit was used.`
    }]);
    if (myId) await reload(myId);
    setActing(null);
  }

  async function declineSession(s: Session) {
    setActing(s.id);
    if (s.slot_id) await supabase.from("slots").update({ is_booked: false }).eq("id", s.slot_id);
    await supabase.from("sessions").update({ status: "cancelled" }).eq("id", s.id);
    await supabase.from("notifications").insert([{
      member_id: s.booker.id, title: "Session declined",
      body: `${s.host.name} could not accept this time. No credit was used.`
    }]);
    if (myId) await reload(myId);
    setActing(null);
  }

  async function retractRequest(s: Session) {
    setActing(s.id);
    if (s.slot_id) await supabase.from("slots").update({ is_booked: false }).eq("id", s.slot_id);
    await supabase.from("sessions").update({ status: "cancelled" }).eq("id", s.id);
    await supabase.from("notifications").insert([{
      member_id: s.host.id, title: "Request withdrawn",
      body: `${s.booker.name} withdrew their interview request.`
    }]);
    if (myId) await reload(myId);
    setActing(null);
  }

  async function cancelAccepted(s: Session) {
    setActing(s.id);
    const { data: booker } = await supabase.from("members").select("credits").eq("id", s.booker.id).single();
    if (booker) await supabase.from("members").update({ credits: booker.credits + 1 }).eq("id", s.booker.id);
    if (s.slot_id) await supabase.from("slots").update({ is_booked: false }).eq("id", s.slot_id);
    await supabase.from("sessions").update({ status: "cancelled" }).eq("id", s.id);
    const iAmHost = s.host?.id === myId;
    const notifyId = iAmHost ? s.booker.id : s.host.id;
    const otherName = iAmHost ? s.host.name : s.booker.name;
    await supabase.from("notifications").insert([{
      member_id: notifyId, title: "Session cancelled",
      body: `${otherName} cancelled the session. The credit has been refunded. You can rebook anytime.`
    }]);
    if (myId === s.booker.id) setMyCredits(c => c + 1);
    if (myId) await reload(myId);
    setActing(null);
  }

  async function markComplete(s: Session) {
    setActing(s.id);
    const { data: host } = await supabase.from("members").select("credits").eq("id", s.host.id).single();
    if (host) await supabase.from("members").update({ credits: host.credits + 1 }).eq("id", s.host.id);
    await supabase.from("sessions").update({ status: "completed" }).eq("id", s.id);
    await supabase.from("notifications").insert([{
      member_id: s.booker.id, title: "Session completed",
      body: `${s.host.name} marked your session complete.`
    }]);
    if (s.host.id === myId) setMyCredits(c => c + 1);
    if (myId) await reload(myId);
    setActing(null);
    setFeedbackFor(s);
    setFbRating(0);
    setFbComment("");
  }

  async function submitFeedback() {
    if (!feedbackFor || fbRating < 1) return;
    setActing(feedbackFor.id);
    await supabase.from("feedback").insert([{
      session_id: feedbackFor.id,
      giver_id: feedbackFor.host.id,
      receiver_id: feedbackFor.booker.id,
      rating: fbRating,
      comment: fbComment || null,
    }]);
    setActing(null);
    setFeedbackFor(null);
  }

  const statusLabel: Record<string, { bg: string; color: string; text: string }> = {
    pending: { bg: "#FAEEDA", color: "#633806", text: "Pending" },
    accepted: { bg: "#E1F5EE", color: "#0F6E56", text: "Accepted" },
    completed: { bg: "#EAF3DE", color: "#3B6D11", text: "Done" },
    cancelled: { bg: "#f5f5f5", color: "#999", text: "Cancelled" },
  };

  function slotPassed(s: Session) {
    if (!s.slot_id || !slots[s.slot_id]) return false;
    return new Date(slots[s.slot_id]).getTime() < Date.now();
  }

  function Card({ s }: { s: Session }) {
    const iAmHost = s.host?.id === myId;
    const other = iAmHost ? s.booker : s.host;
    const sl = statusLabel[s.status] || statusLabel.pending;
    const slotTime = s.slot_id && slots[s.slot_id] ? formatSlot(slots[s.slot_id]) : null;
    const wa = waLink(other?.whatsapp);
    const linkedin = other?.linkedin_url ? (other.linkedin_url.startsWith("http") ? other.linkedin_url : `https://${other.linkedin_url}`) : null;
    const canMarkDone = slotPassed(s);

    const badge = iAmHost
      ? (s.status === "completed" ? "Taken" : s.status === "accepted" ? "Taking" : s.status === "cancelled" ? "Cancelled" : "Take interview")
      : (s.status === "completed" ? "Got" : sl.text);

    return (
      <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{other?.name}</p>
            <p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>{[other?.role, other?.company].filter(Boolean).join(" @ ")}</p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 8, background: sl.bg, color: sl.color, flexShrink: 0, marginLeft: 8 }}>{badge}</span>
        </div>
        {slotTime && <p style={{ fontSize: 12, color: "#666", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 4 }}>📅 {slotTime}</p>}
        {s.note && <p style={{ fontSize: 12, color: "#888", background: "#f9f9f9", borderRadius: 6, padding: "6px 8px", marginBottom: 8 }}>"{s.note}"</p>}

        <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
          {other?.email && <p style={{ margin: "2px 0" }}>✉️ {other.email}</p>}
        </div>

        {(s.status === "accepted") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {s.meet_link && (
              <a href={s.meet_link} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", textAlign: "center", padding: "10px", background: "#0F6E56", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                Join Google Meet
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", textAlign: "center", padding: "10px", background: "#25D366", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                Message on WhatsApp
              </a>
            )}
          </div>
        )}

        {linkedin && (
          <a href={linkedin} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", textAlign: "center", padding: "8px", background: "#0A66C2", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none", marginBottom: 10 }}>
            View LinkedIn
          </a>
        )}

        {s.status === "pending" && iAmHost && (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button style={{ flex: 1, padding: "9px", background: BRAND, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              onClick={() => acceptSession(s)} disabled={acting === s.id}>{acting === s.id ? "…" : "Accept"}</button>
            <button style={{ flex: 1, padding: "9px", background: "transparent", color: "#e53e3e", border: "1px solid #fed7d7", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
              onClick={() => declineSession(s)} disabled={acting === s.id}>Decline</button>
          </div>
        )}

        {s.status === "pending" && !iAmHost && (
          <button style={{ width: "100%", padding: "9px", background: "transparent", color: "#e53e3e", border: "1px solid #fed7d7", borderRadius: 8, fontSize: 13, cursor: "pointer", marginTop: 4 }}
            onClick={() => retractRequest(s)} disabled={acting === s.id}>{acting === s.id ? "…" : "Withdraw request"}</button>
        )}

        {s.status === "accepted" && (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {iAmHost && (
              <button
                style={{ flex: 1, padding: "9px", background: canMarkDone ? BRAND : "#ccc", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: canMarkDone ? "pointer" : "not-allowed" }}
                onClick={() => canMarkDone && markComplete(s)} disabled={acting === s.id || !canMarkDone}>
                {acting === s.id ? "…" : canMarkDone ? "Mark done · +1 credit" : "Mark done after slot"}
              </button>
            )}
            <button style={{ flex: iAmHost ? 1 : undefined, width: iAmHost ? undefined : "100%", padding: "9px", background: "transparent", color: "#e53e3e", border: "1px solid #fed7d7", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
              onClick={() => cancelAccepted(s)} disabled={acting === s.id}>Cancel session</button>
          </div>
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
            <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: tab === t ? BRAND : "#f0f0f0", color: tab === t ? "#fff" : "#666" }}>
              {t === "upcoming" ? "My bookings" : `Take interview${giveRequests.filter(s => s.status === "pending").length ? ` (${giveRequests.filter(s => s.status === "pending").length})` : ""}`}
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

      {feedbackFor && (
        <div onClick={() => setFeedbackFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 380, width: "100%" }}>
            <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>How was the session?</h2>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px" }}>Your feedback on {feedbackFor.booker?.name} stays private.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "center" }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setFbRating(n)}
                  style={{ fontSize: 28, background: "none", border: "none", cursor: "pointer", filter: n <= fbRating ? "none" : "grayscale(1) opacity(0.4)" }}>⭐</button>
              ))}
            </div>
            <textarea value={fbComment} onChange={e => setFbComment(e.target.value)} rows={3}
              placeholder="Any comments? (optional)"
              style={{ width: "100%", padding: 12, border: "1px solid #ddd", borderRadius: 8, fontSize: 13, resize: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setFeedbackFor(null)}
                style={{ flex: 1, padding: 12, background: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Skip</button>
              <button onClick={submitFeedback} disabled={fbRating < 1 || acting === feedbackFor.id}
                style={{ flex: 1, padding: 12, background: fbRating < 1 ? "#ccc" : BRAND, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: fbRating < 1 ? "not-allowed" : "pointer" }}>
                {acting === feedbackFor.id ? "Saving…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default function SessionsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading…</div>}>
      <SessionsInner />
    </Suspense>
  );
}
