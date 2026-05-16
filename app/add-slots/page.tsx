"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AddSlots() {
  const router = useRouter();
  const [slots, setSlots] = useState<string[]>([]);
  const [newSlot, setNewSlot] = useState("");
  const [memberId, setMemberId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
  async function getSession() {
    let attempts = 0;
    while (attempts < 10) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const { data } = await supabase.from("members").select("id").eq("email", session.user.email).single();
        if (data) { setMemberId(data.id); return; }
      }
      await new Promise(r => setTimeout(r, 500));
      attempts++;
    }
    router.replace("/join");
  }
  getSession();
}, [router]);

  function addSlot() {
    if (!newSlot) return;
    const date = new Date(newSlot);
    if (isNaN(date.getTime())) return;
    if (!slots.includes(newSlot)) setSlots(s => [...s, newSlot].sort());
    setNewSlot("");
  }

  function removeSlot(slot: string) {
    setSlots(s => s.filter(x => x !== slot));
  }

  async function handleSave() {
    setSaving(true);
    if (slots.length > 0 && memberId) {
      const rows = slots.map(s => ({ member_id: memberId, datetime: new Date(s).toISOString(), is_booked: false }));
      await supabase.from("slots").insert(rows);
    }
    router.replace("/explore");
  }

  function formatSlot(s: string) {
    return new Date(s).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() - minDate.getTimezoneOffset());
  const minStr = minDate.toISOString().slice(0, 16);

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <div style={{ paddingTop: 32, paddingBottom: 20 }}>
        <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Add your free slots</h1>
        <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Others will be able to book these times with you.</p>
      </div>

      <div style={{ background: "#f9f9f9", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 8 }}>Pick a date & time</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="datetime-local" min={minStr} value={newSlot} onChange={e => setNewSlot(e.target.value)}
            style={{ flex: 1, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "inherit" }} />
          <button onClick={addSlot} style={{ padding: "10px 16px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add</button>
        </div>
      </div>

      {slots.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Your slots</p>
          {slots.map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#fff", border: "1px solid #eee", borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 14, color: "#111" }}>📅 {formatSlot(s)}</span>
              <button onClick={() => removeSlot(s)} style={{ background: "none", border: "none", color: "#ccc", fontSize: 18, cursor: "pointer", padding: "0 4px" }}>×</button>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        style={{ width: "100%", padding: "13px", borderRadius: "8px", fontSize: "15px", border: "none", background: "#111", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
        {saving ? "Saving…" : slots.length > 0 ? `Save ${slots.length} slot${slots.length > 1 ? "s" : ""} & explore →` : "Skip for now →"}
      </button>
    </div>
  );
}
