"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Member = { id: string; name: string; email: string; company: string; role: string; linkedin_url: string; whatsapp: string; credits: number; bio: string; years_experience: number; avatar_url: string; status: string; };
type Slot = { id: string; datetime: string; is_booked: boolean; };

function formatSlot(dt: string) {
  return new Date(dt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Member | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [newSlot, setNewSlot] = useState("");
  const [addingSlot, setAddingSlot] = useState(false);
  const [stats, setStats] = useState({ gave: 0, received: 0 });

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/join"); return; }
      const { data } = await supabase.from("members").select("*").eq("email", session.user.email).single();
      setMe(data);
      if (data) {
        const now = new Date().toISOString();
        const { data: slotData } = await supabase.from("slots").select("*").eq("member_id", data.id).gte("datetime", now).order("datetime");
        setSlots(slotData || []);
        const [{ count: gave }, { count: received }] = await Promise.all([
          supabase.from("sessions").select("*", { count: "exact", head: true }).eq("host_id", data.id).eq("status", "completed"),
          supabase.from("sessions").select("*", { count: "exact", head: true }).eq("booker_id", data.id).eq("status", "completed"),
        ]);
        setStats({ gave: gave || 0, received: received || 0 });
      }
    }
    load();
  }, [router]);

  async function addSlot() {
    if (!newSlot || !me) return;
    setAddingSlot(true);
    const { data } = await supabase.from("slots").insert([{ member_id: me.id, datetime: new Date(newSlot).toISOString(), is_booked: false }]).select().single();
    if (data) setSlots(s => [...s, data].sort((a, b) => a.datetime.localeCompare(b.datetime)));
    setNewSlot("");
    setAddingSlot(false);
  }

  async function removeSlot(id: string) {
    await supabase.from("slots").delete().eq("id", id);
    setSlots(s => s.filter(x => x.id !== id));
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/join");
  }

  if (!me) return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>Loading…</div>;
  const inits = (me.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() - minDate.getTimezoneOffset());
  const minStr = minDate.toISOString().slice(0, 16);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {me.status === "pending" && (
        <div style={{ background: "#FAEEDA", borderBottom: "1px solid #F5D79E", padding: "10px 16px" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#854F0B" }}>⏳ <strong>Profile under review.</strong> You'll get 2 credits once approved.</p>
        </div>
      )}
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "48px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {me.avatar_url ? (
            <img src={me.avatar_url} alt={me.name} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E6F1FB", color: "#185FA5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600 }}>{inits}</div>
          )}
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{me.name}</h1>
            <p style={{ fontSize: 13, color: "#888", margin: "2px 0 0" }}>{[me.role, me.company].filter(Boolean).join(" @ ")}{me.years_experience ? ` · ${me.years_experience}y` : ""}</p>
            {me.bio && <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>{me.bio}</p>}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          {[{ label: "Credits", value: me.credits, amber: true }, { label: "Gave", value: stats.gave }, { label: "Received", value: stats.received }].map(({ label, value, amber }) => (
            <div key={label} style={{ background: amber ? "#FAEEDA" : "#fff", border: `1px solid ${amber ? "#F5D79E" : "#eee"}`, borderRadius: 12, padding: 12, textAlign: "center" }}>
              <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: amber ? "#BA7517" : "#111" }}>{value}</p>
              <p style={{ fontSize: 11, color: "#999", margin: "2px 0 0" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* My slots */}
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>My availability</p>
          {slots.length === 0 && <p style={{ fontSize: 13, color: "#ccc", marginBottom: 10 }}>No upcoming slots. Add some so others can book you!</p>}
          {slots.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
              <span style={{ fontSize: 13, color: s.is_booked ? "#bbb" : "#111" }}>
                📅 {formatSlot(s.datetime)} {s.is_booked && <span style={{ fontSize: 11, color: "#BA7517", marginLeft: 6 }}>Booked</span>}
              </span>
              {!s.is_booked && (
                <button onClick={() => removeSlot(s.id)} style={{ background: "none", border: "none", color: "#ddd", fontSize: 18, cursor: "pointer", padding: "0 4px" }}>×</button>
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input type="datetime-local" min={minStr} value={newSlot} onChange={e => setNewSlot(e.target.value)}
              style={{ flex: 1, padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }} />
            <button onClick={addSlot} disabled={addingSlot || !newSlot}
              style={{ padding: "9px 14px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {addingSlot ? "…" : "+ Add"}
            </button>
          </div>
        </div>

        {/* Details */}
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Details</p>
          {[{ label: "Email", value: me.email }, { label: "WhatsApp", value: me.whatsapp || "—" }, { label: "LinkedIn", value: me.linkedin_url, link: true }].map(({ label, value, link }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f5f5f5", fontSize: 14 }}>
              <span style={{ color: "#999" }}>{label}</span>
              {link ? <a href={value?.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" style={{ color: "#185FA5", wordBreak: "break-all", textAlign: "right" }}>{value}</a>
                : <span style={{ color: "#111", textAlign: "right" }}>{value}</span>}
            </div>
          ))}
        </div>

        <div style={{ background: "#FAEEDA", border: "1px solid #F5D79E", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#BA7517", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>How credits work</p>
          <p style={{ fontSize: 13, color: "#854F0B", margin: "4px 0" }}>🟡 Start with <strong>2 credits</strong> on approval</p>
          <p style={{ fontSize: 13, color: "#854F0B", margin: "4px 0" }}>📤 Use <strong>1 credit</strong> to book a session</p>
          <p style={{ fontSize: 13, color: "#854F0B", margin: "4px 0" }}>📥 Earn <strong>+1 credit</strong> when you give a session</p>
        </div>

        <button onClick={signOut} style={{ width: "100%", padding: 12, background: "transparent", color: "#e53e3e", border: "1px solid #fed7d7", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Sign out</button>
      </div>
      <BottomNav />
    </div>
  );
}
