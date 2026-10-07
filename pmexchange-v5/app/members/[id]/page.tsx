"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Member = { id: string; name: string; company: string; role: string; linkedin_url: string; credits: number; email: string; whatsapp: string; bio: string; years_experience: number; avatar_url: string; status: string; };
type Slot = { id: string; datetime: string; is_booked: boolean; };

function formatSlot(dt: string) {
  return new Date(dt).toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const COLORS = ["#E6F1FB","#E1F5EE","#FAECE7","#EEEDFE","#FBEAF0"];
const TEXT = ["#185FA5","#0F6E56","#993C1D","#534AB7","#993556"];
function avatarColor(id: string) {
  const n = (id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % COLORS.length;
  return { bg: COLORS[n], color: TEXT[n] };
}

export default function MemberPage() {
  const params = useParams();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [me, setMe] = useState<Member | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/join"); return; }

      const [{ data: m }, { data: myData }] = await Promise.all([
        supabase.from("members").select("*").eq("id", params.id).single(),
        supabase.from("members").select("*").eq("email", session.user.email).maybeSingle(),
      ]);
      setMember(m); setMe(myData);

      const now = new Date().toISOString();
      const { data: slotData } = await supabase.from("slots").select("*").eq("member_id", params.id).eq("is_booked", false).gte("datetime", now).order("datetime");
      setSlots(slotData || []);

      if (myData && m) {
        const { data: activeSessions } = await supabase.from("sessions")
          .select("id").eq("booker_id", myData.id).eq("host_id", m.id)
          .in("status", ["pending", "accepted"]);
        setHasActiveSession((activeSessions || []).length > 0);
      }
      setLoading(false);
    }
    load();
  }, [params.id, router]);

  async function handleBook() {
    if (!me || !member || !selectedSlot) return;
    if (me.status !== "approved") { setError("Your profile needs to be approved before booking."); return; }
    if (me.credits < 1) { setError("Not enough credits. Give an interview to earn more."); return; }
    if (hasActiveSession) { setError("You already have an active session with this person. Complete it first."); return; }

    setBooking(true); setError("");
    try {
      // NOTE: credit is NOT deducted here. It is deducted only when the host accepts.
      const { data: sess } = await supabase.from("sessions").insert([{
        booker_id: me.id, host_id: member.id, slot_id: selectedSlot, note: note || null, status: "pending"
      }]).select().single();
      await supabase.from("slots").update({ is_booked: true }).eq("id", selectedSlot);
      await supabase.from("notifications").insert([{
        member_id: member.id,
        title: "New interview request",
        body: `${me.name} wants to practice with you on ${formatSlot(slots.find(s => s.id === selectedSlot)?.datetime || "")}. LinkedIn: ${me.linkedin_url || "not provided"}`
      }]);
      await fetch("/api/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookerId: me.id, hostId: member.id, slotId: selectedSlot, sessionId: sess?.id, note }) });
      setBooked(true);
    } catch (e: any) { setError(e.message); }
    finally { setBooking(false); }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>Loading…</div>;
  if (!member) return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>Member not found</div>;

  const isMe = me?.id === member.id;
  const av = avatarColor(member.id);
  const inits = (member.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "48px 16px 16px" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#888", fontSize: 14, marginBottom: 16, cursor: "pointer", padding: 0 }}>← Back</button>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600, flexShrink: 0 }}>{inits}</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{member.name}</h1>
            <p style={{ fontSize: 13, color: "#888", margin: "3px 0" }}>{[member.role, member.company].filter(Boolean).join(" @ ")}{member.years_experience ? ` · ${member.years_experience}y exp` : ""}</p>
            {member.bio && <p style={{ fontSize: 13, color: "#555", margin: "4px 0 0", lineHeight: 1.5 }}>{member.bio}</p>}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        <a href={member.linkedin_url?.startsWith("http") ? member.linkedin_url : `https://${member.linkedin_url}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#0A66C2", color: "#fff", padding: "11px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none", marginBottom: 12 }}>
          <span style={{ fontWeight: 800 }}>in</span> View LinkedIn profile
        </a>

        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Available slots</p>
          {slots.length === 0 ? (
            <p style={{ fontSize: 13, color: "#ccc" }}>No slots available right now</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {slots.map(s => (
                <div key={s.id} onClick={() => !isMe && setSelectedSlot(s.id)}
                  style={{ padding: "10px 14px", border: `1.5px solid ${selectedSlot === s.id ? "#111" : "#eee"}`, borderRadius: 8, cursor: isMe ? "default" : "pointer", background: selectedSlot === s.id ? "#f9f9f9" : "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#111" }}>📅 {formatSlot(s.datetime)}</span>
                  {selectedSlot === s.id && <span style={{ fontSize: 14 }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {!isMe && (
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Request a session</p>

            {me?.status !== "approved" && (
              <div style={{ background: "#FAEEDA", borderRadius: 8, padding: 10, marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: "#854F0B", margin: 0 }}>⏳ Your profile is pending approval. You can browse but cannot book yet.</p>
              </div>
            )}

            {hasActiveSession && (
              <div style={{ background: "#E6F1FB", borderRadius: 8, padding: 10, marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: "#185FA5", margin: 0 }}>You already have an active session with {member.name?.split(" ")[0]}. Complete it first to book again.</p>
              </div>
            )}

            {!hasActiveSession && me?.status === "approved" && (
              <>
                <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 12 }}>Select a slot above, then send your request. <strong>1 credit</strong> will be used only once {member.name?.split(" ")[0]} accepts.</p>
                {me && <p style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>You have <span style={{ color: "#BA7517", fontWeight: 600 }}>{me.credits} credits</span>.</p>}
                <textarea style={{ width: "100%", padding: 12, border: "1px solid #ddd", borderRadius: 8, fontSize: 13, resize: "none" as const, marginBottom: 12, boxSizing: "border-box" as const, fontFamily: "inherit" }} rows={2}
                  placeholder={`Message to ${member.name?.split(" ")[0]} (optional)`} value={note} onChange={e => setNote(e.target.value)} />
                {error && <p style={{ color: "red", fontSize: 13, marginBottom: 8 }}>{error}</p>}
                <button style={{ width: "100%", padding: 13, background: !selectedSlot || (me?.credits ?? 0) < 1 ? "#ccc" : "#1F2937", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: !selectedSlot || (me?.credits ?? 0) < 1 ? "not-allowed" : "pointer" }}
                  onClick={handleBook} disabled={booking || !selectedSlot || (me?.credits ?? 0) < 1}>
                  {booking ? "Sending request…" : !selectedSlot ? "Select a slot first" : "Send request"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {booked && (
        <div onClick={() => router.push("/explore")}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 360, width: "100%", textAlign: "center", position: "relative" }}>
            <button onClick={() => setBooked(false)} aria-label="Close"
              style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", fontSize: 20, color: "#999", cursor: "pointer" }}>×</button>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>Request sent</h2>
            <p style={{ color: "#666", lineHeight: 1.6, fontSize: 14, margin: "0 0 20px" }}>
              <strong>{member.name}</strong> has been notified. Once they accept, <strong>1 credit</strong> is used and you both get a Google Meet link.
            </p>
            <button onClick={() => router.push("/explore")}
              style={{ width: "100%", padding: 12, background: "#1F2937", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              Back to explore
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
