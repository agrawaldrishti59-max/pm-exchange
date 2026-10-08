"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const GOALS = [
  { id: "interview_prep", label: "Interview preparation", icon: "🎯", desc: "Practice mock PM interviews with peers" },
  { id: "career_growth", label: "Career growth", icon: "📈", desc: "Develop skills to become a stronger PM" },
  { id: "networking", label: "Networking & mentorship", icon: "🤝", desc: "Connect with and learn from fellow PMs" },
  { id: "case_studies", label: "Product cases & problem-solving", icon: "💡", desc: "Solve real-world product challenges together" },
  { id: "communication", label: "Communication & leadership", icon: "🗣️", desc: "Sharpen storytelling and stakeholder skills" },
  { id: "explore", label: "Just exploring", icon: "👀", desc: "Discover what the community has to offer" },
];
export default function OnboardingGoal() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (!session) router.replace("/join"); });
  }, [router]);
  async function handleSubmit() {
    if (!selected.length) return;
    setLoading(true); setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in again.");
      const response = await fetch("/api/auth/interests", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ interests: selected }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save interests");
      router.replace("/add-slots");
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }
  return (
    <div style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <div style={{ paddingTop: 32, paddingBottom: 24 }}>
        <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>What brings you to PM Exchange?</h1>
        <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Select all that interest you. We’ll help you find relevant people and activities.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {GOALS.map(g => {
          const active = selected.includes(g.id);
          return <button type="button" key={g.id} aria-pressed={active} onClick={() => setSelected(prev => active ? prev.filter(x => x !== g.id) : [...prev, g.id])}
            style={{ width: "100%", textAlign: "left", padding: "14px 16px", border: `1.5px solid ${active ? "#111" : "#e5e5e5"}`, borderRadius: 12, cursor: "pointer", background: active ? "#f9f9f9" : "#fff", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 24 }}>{g.icon}</span>
            <span style={{ flex: 1 }}><span style={{ display: "block", fontWeight: 500, fontSize: 14 }}>{g.label}</span><span style={{ display: "block", marginTop: 2, fontSize: 12, color: "#888" }}>{g.desc}</span></span>
            <span aria-hidden="true">{active ? "✓" : ""}</span>
          </button>;
        })}
      </div>
      {error && <p role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>{error}</p>}
      <button onClick={handleSubmit} disabled={!selected.length || loading} style={{ width: "100%", padding: 13, borderRadius: 8, border: "none", fontWeight: 600, background: selected.length ? "#111" : "#ccc", color: "#fff" }}>
        {loading ? "Saving…" : "Continue →"}
      </button>
    </div>
  );
}
