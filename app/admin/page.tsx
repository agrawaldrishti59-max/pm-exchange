"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Member = { id: string; name: string; email: string; company: string; role: string; linkedin_url: string; credits: number; status: string; bio: string; years_experience: number; };

export default function AdminPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) { router.replace("/join"); return; }
      const { data } = await supabase.from("members").select("*").order("created_at", { ascending: false });
      setMembers(data || []); setLoading(false);
    }
    load();
  }, [router]);

  async function approve(m: Member) {
    setActing(m.id);
    await supabase.from("members").update({ status: "approved", credits: 2 }).eq("id", m.id);
    // Notify member
    await supabase.from("notifications").insert([{
      member_id: m.id,
      title: "You're approved! 🎉",
      body: "Welcome to PM Exchange! You've been given 2 credits to get started."
    }]);
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, status: "approved", credits: 2 } : x));
    setActing(null);
  }

  async function reject(id: string) {
    setActing(id);
    await supabase.from("members").update({ status: "rejected" }).eq("id", id);
    setMembers(prev => prev.map(x => x.id === id ? { ...x, status: "rejected" } : x));
    setActing(null);
  }

  async function adjustCredits(id: string, delta: number) {
    setActing(id);
    const member = members.find(m => m.id === id);
    if (!member) return;
    const newCredits = Math.max(0, member.credits + delta);
    await supabase.from("members").update({ credits: newCredits }).eq("id", id);
    setMembers(prev => prev.map(x => x.id === id ? { ...x, credits: newCredits } : x));
    setActing(null);
  }

  const filtered = members.filter(m => m.status === tab);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "48px 16px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Admin</h1>
          <span style={{ fontSize: 12, background: "#f0f0f0", color: "#666", padding: "4px 10px", borderRadius: 8 }}>{members.filter(m => m.status === "approved").length} approved</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["pending", "approved"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: tab === t ? "#111" : "#f0f0f0", color: tab === t ? "#fff" : "#666" }}>
              {t === "pending" ? `Pending (${members.filter(m => m.status === "pending").length})` : `Approved (${members.filter(m => m.status === "approved").length})`}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        {loading && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Loading…</div>}
        {!loading && filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Nothing here</div>}
        {filtered.map(m => (
          <div key={m.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{m.name}</p>
                <p style={{ fontSize: 12, color: "#888", margin: "2px 0" }}>{[m.role, m.company].filter(Boolean).join(" @ ")}{m.years_experience ? ` · ${m.years_experience}y` : ""}</p>
                <p style={{ fontSize: 12, color: "#aaa", margin: 0 }}>{m.email}</p>
                {m.bio && <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0", fontStyle: "italic" }}>"{m.bio}"</p>}
              </div>
              <span style={{ background: "#FAEEDA", color: "#633806", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>🪙 {m.credits}</span>
            </div>
            <a href={m.linkedin_url?.startsWith("http") ? m.linkedin_url : `https://${m.linkedin_url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#185FA5", wordBreak: "break-all", display: "block", marginBottom: 10 }}>{m.linkedin_url}</a>
            {tab === "pending" && (
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, padding: "9px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  onClick={() => approve(m)} disabled={acting === m.id}>{acting === m.id ? "…" : "✓ Approve"}</button>
                <button style={{ flex: 1, padding: "9px", background: "transparent", color: "#e53e3e", border: "1px solid #fed7d7", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                  onClick={() => reject(m.id)} disabled={acting === m.id}>Reject</button>
              </div>
            )}
            {tab === "approved" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#999" }}>Credits:</span>
                <button onClick={() => adjustCredits(m.id, -1)} disabled={acting === m.id || m.credits === 0} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", fontSize: 16, cursor: "pointer" }}>−</button>
                <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: "center" }}>{m.credits}</span>
                <button onClick={() => adjustCredits(m.id, 1)} disabled={acting === m.id} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", fontSize: 16, cursor: "pointer" }}>+</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
