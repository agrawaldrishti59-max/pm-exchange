"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const inp = { width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", marginBottom: "12px", display: "block" as const, boxSizing: "border-box" as const, fontFamily: "inherit" };

export default function CompleteProfile() {
  const router = useRouter();
  const [form, setForm] = useState({ linkedin_url: "", company: "", role: "", whatsapp: "", bio: "", years_experience: "" });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    if (!form.linkedin_url) { setError("LinkedIn URL is required."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...form, years_experience: form.years_experience ? parseInt(form.years_experience) : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace("/onboarding-goal");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <div style={{ paddingTop: 32, paddingBottom: 20 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>⇄</div>
        <h1 style={{ fontSize: 22, margin: "0 0 6px" }}>Complete your profile</h1>
        <p style={{ color: "#666", margin: 0, fontSize: 14 }}>This helps the community know who you are.</p>
      </div>
      {error && <p style={{ color: "red", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <label style={{ fontSize: 12, color: "#888", marginBottom: 4, display: "block" }}>LinkedIn URL *</label>
      <input style={inp} placeholder="linkedin.com/in/yourname" value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} />
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: "#888", marginBottom: 4, display: "block" }}>Company</label>
          <input style={inp} placeholder="Google" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: "#888", marginBottom: 4, display: "block" }}>Title</label>
          <input style={inp} placeholder="Sr. PM" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: "#888", marginBottom: 4, display: "block" }}>Years of experience</label>
          <input style={inp} type="number" placeholder="5" value={form.years_experience} onChange={e => setForm(f => ({ ...f, years_experience: e.target.value }))} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: "#888", marginBottom: 4, display: "block" }}>WhatsApp</label>
          <input style={inp} placeholder="+91 98765 43210" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
        </div>
      </div>
      <label style={{ fontSize: 12, color: "#888", marginBottom: 4, display: "block" }}>Short bio</label>
      <textarea style={{ ...inp, resize: "none" as const }} rows={2} placeholder="e.g. PM at Razorpay, love 0→1 products" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} maxLength={120} />
      <p style={{ fontSize: 11, color: "#bbb", marginTop: -8, marginBottom: 12 }}>{form.bio.length}/120</p>
      <button style={{ width: "100%", padding: "13px", borderRadius: "8px", fontSize: "15px", border: "none", background: "#111", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        onClick={handleSubmit} disabled={loading}>
        {loading ? "Saving…" : "Continue →"}
      </button>
    </div>
  );
}
