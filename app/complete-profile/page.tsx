"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const inp = { width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", marginBottom: "12px", display: "block" as const, boxSizing: "border-box" as const, fontFamily: "inherit" };

const TITLES = [
  "Product Manager",
  "Associate Product Manager",
  "Senior Product Manager",
  "Group Product Manager",
  "Principal Product Manager",
  "Director of Product",
  "VP Product",
  "Chief Product Officer",
  "Product Owner",
  "Technical Product Manager",
  "Growth Product Manager",
  "Platform Product Manager",
  "Data Product Manager",
  "AI/ML Product Manager",
  "Product Analyst",
  "Product Marketing Manager",
  "Product Designer",
  "Product Operations",
  "Program Manager",
  "Technical Program Manager",
  "Project Manager",
  "Senior Project Manager",
  "Project Coordinator",
  "Scrum Master",
  "Agile Coach",
  "Delivery Manager",
  "Business Analyst",
  "Other (specify)",
];

export default function CompleteProfile() {
  const router = useRouter();
  const [form, setForm] = useState({ linkedin_username: "", company: "", role: "", whatsapp: "", bio: "", years_experience: "" });
  const [titleChoice, setTitleChoice] = useState("");
  const [otherTitle, setOtherTitle] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getSession() {
      let attempts = 0;
      while (attempts < 10) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) { setEmail(session.user.email); return; }
        await new Promise(r => setTimeout(r, 500));
        attempts++;
      }
      router.replace("/join");
    }
    getSession();
  }, [router]);

  async function handleSubmit() {
    if (!form.linkedin_username.trim()) { setError("LinkedIn username is required."); return; }
    const resolvedRole = titleChoice === "Other (specify)" ? otherTitle.trim() : titleChoice;
    if (!resolvedRole) { setError("Please select your title."); return; }
    setLoading(true); setError("");
    try {
      const cleaned = form.linkedin_username.trim().replace(/^.*linkedin\.com\/in\//, "").replace(/\/$/, "");
      const linkedin_url = `https://www.linkedin.com/in/${cleaned}`;
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, linkedin_url, company: form.company, role: resolvedRole,
          whatsapp: form.whatsapp, bio: form.bio,
          years_experience: form.years_experience ? parseInt(form.years_experience) : null,
        }),
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

      <label style={{ fontSize: 12, color: "#888", marginBottom: 4, display: "block" }}>LinkedIn *</label>
      <div style={{ display: "flex", alignItems: "stretch", border: "1px solid #ddd", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
        <span style={{ padding: "12px 4px 12px 12px", fontSize: 14, color: "#999", background: "#f7f7f7", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>linkedin.com/in/</span>
        <input style={{ flex: 1, padding: "12px", border: "none", fontSize: 14, outline: "none", fontFamily: "inherit" }}
          placeholder="drishti-agrawal" value={form.linkedin_username}
          onChange={e => setForm(f => ({ ...f, linkedin_username: e.target.value }))} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: "#888", marginBottom: 4, display: "block" }}>Company</label>
          <input style={inp} placeholder="Google" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: "#888", marginBottom: 4, display: "block" }}>Title</label>
          <select style={{ ...inp, appearance: "none" as const, background: "#fff" }} value={titleChoice}
            onChange={e => setTitleChoice(e.target.value)}>
            <option value="">Select your title…</option>
            {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {titleChoice === "Other (specify)" && (
            <input style={inp} placeholder="Your title" value={otherTitle}
              onChange={e => setOtherTitle(e.target.value)} />
          )}
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
      <textarea style={{ ...inp, resize: "none" as const }} rows={2} placeholder="e.g. PM at Razorpay, love 0 to 1 products" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} maxLength={120} />
      <p style={{ fontSize: 11, color: "#bbb", marginTop: -8, marginBottom: 12 }}>{form.bio.length}/120</p>
      <button style={{ width: "100%", padding: "13px", borderRadius: "8px", fontSize: "15px", border: "none", background: "#111", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        onClick={handleSubmit} disabled={loading}>
        {loading ? "Saving…" : "Continue →"}
      </button>
    </div>
  );
}
