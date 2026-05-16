"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const s = { width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", marginBottom: "12px", display: "block" as const, boxSizing: "border-box" as const, fontFamily: "inherit" };

export default function CompleteProfile() {
  const router = useRouter();
  const [form, setForm] = useState({ linkedin_url: "", company: "", role: "", whatsapp: "" });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getEmail() {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) setEmail(session.user.email);
      else router.replace("/join");
    }
    getEmail();
  }, [router]);

  async function handleSubmit() {
    if (!form.linkedin_url) { setError("LinkedIn URL is required."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace("/pending");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 400, margin: "0 auto" }}>
      <div style={{ paddingTop: 32, paddingBottom: 20 }}>
        <h1 style={{ fontSize: 22, margin: "0 0 6px" }}>One last step</h1>
        <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Add your details so we can verify you.</p>
      </div>
      {error && <p style={{ color: "red", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <input style={s} placeholder="LinkedIn URL * (linkedin.com/in/yourname)" value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} />
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...s, width: "50%" }} placeholder="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
        <input style={{ ...s, width: "50%" }} placeholder="Role e.g. PM" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
      </div>
      <input style={s} placeholder="WhatsApp number" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
      <button
        style={{ width: "100%", padding: "13px", borderRadius: "8px", fontSize: "15px", border: "none", background: "#111", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        onClick={handleSubmit} disabled={loading}>
        {loading ? "Saving…" : "Submit for approval →"}
      </button>
    </div>
  );
}
