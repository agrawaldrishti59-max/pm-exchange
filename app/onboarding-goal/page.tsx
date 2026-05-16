"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const GOALS = [
  { id: "interview_prep", label: "Interview prep", icon: "🎯", desc: "Practice PM interviews with peers" },
  { id: "networking", label: "Networking", icon: "🤝", desc: "Connect with PMs across companies" },
  { id: "ideation", label: "Ideation / KT sessions", icon: "💡", desc: "Brainstorm and share knowledge" },
  { id: "communication", label: "Communication improvement", icon: "🗣️", desc: "Sharpen your verbal & written skills" },
  { id: "looking_around", label: "Just looking around", icon: "👀", desc: "Explore the community" },
];

export default function OnboardingGoal() {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
  async function getSession() {
    // Wait for session to be available
    let attempts = 0;
    while (attempts < 10) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setEmail(session.user.email);
        return;
      }
      await new Promise(r => setTimeout(r, 500));
      attempts++;
    }
    router.replace("/join");
  }
  getSession();
}, [router]);

  async function handleSubmit() {
    if (!selected) return;
    setLoading(true);
    await supabase.from("members").update({ goal: selected }).eq("email", email);
    router.replace("/add-slots");
  }

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <div style={{ paddingTop: 32, paddingBottom: 24 }}>
        <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>What brings you here?</h1>
        <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Help us personalise your experience.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {GOALS.map(g => (
          <div key={g.id} onClick={() => setSelected(g.id)}
            style={{ padding: "14px 16px", border: `1.5px solid ${selected === g.id ? "#111" : "#e5e5e5"}`, borderRadius: 12, cursor: "pointer", background: selected === g.id ? "#f9f9f9" : "#fff", display: "flex", alignItems: "center", gap: 14, transition: "all 0.15s" }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{g.icon}</span>
            <div>
              <p style={{ margin: 0, fontWeight: 500, fontSize: 14, color: "#111" }}>{g.label}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{g.desc}</p>
            </div>
            {selected === g.id && <span style={{ marginLeft: "auto", fontSize: 16 }}>✓</span>}
          </div>
        ))}
      </div>
      <button style={{ width: "100%", padding: "13px", borderRadius: "8px", fontSize: "15px", border: "none", background: selected ? "#111" : "#ccc", color: "#fff", fontWeight: 600, cursor: selected ? "pointer" : "not-allowed" }}
        onClick={handleSubmit} disabled={!selected || loading}>
        {loading ? "Saving…" : "Continue →"}
      </button>
    </div>
  );
}
