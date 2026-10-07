"use client";
import { useState } from "react";

const s = { width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", marginBottom: "12px", display: "block" as const, boxSizing: "border-box" as const, fontFamily: "inherit" };
const btn = { width: "100%", padding: "13px", borderRadius: "8px", fontSize: "15px", border: "none", marginBottom: "10px", fontWeight: 600 as const, cursor: "pointer" };

export default function JoinPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "check-email">("form");

  async function handleGoogle() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google");
      const { url, error: err } = await res.json();
      if (err) throw new Error(err);
      window.location.href = url;
    } catch (e: any) {
      setError(e.message || "Could not start Google sign in.");
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) { setError("Enter your email first."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("check-email");
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "check-email") return (
    <div style={{ padding: 32, textAlign: "center" as const, maxWidth: 400, margin: "0 auto" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
      <h2 style={{ marginBottom: 8 }}>Check your email</h2>
      <p style={{ color: "#666", lineHeight: 1.6 }}>We sent a magic link to <strong>{email}</strong>.<br />Tap it to sign in.</p>
      <p style={{ color: "#999", fontSize: 13, marginTop: 12 }}>Don't see it? Check spam.</p>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 400, margin: "0 auto" }}>
      <div style={{ paddingTop: 40, paddingBottom: 28 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⇄</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>PM Exchange</h1>
        <p style={{ color: "#666", margin: 0 }}>Interview practice, give-and-take</p>
      </div>

      <div style={{ marginBottom: 28 }}>
        {[
          ["🎯", "Practice with real PMs from top companies"],
          ["🪙", "Start with 2 free credits. Give interviews to earn more"],
          ["✅", "Verified community — LinkedIn required"],
        ].map(([icon, text]) => (
          <div key={text as string} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 14, color: "#444" }}>
            <span>{icon}</span><span>{text}</span>
          </div>
        ))}
      </div>

      {error && <p style={{ color: "red", fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <button
        style={{ ...btn, background: "#fff", color: "#333", border: "1px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
        onClick={handleGoogle}
        disabled={loading}>
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 16px" }}>
        <div style={{ flex: 1, height: 1, background: "#eee" }} />
        <span style={{ color: "#999", fontSize: 13 }}>or sign in with email</span>
        <div style={{ flex: 1, height: 1, background: "#eee" }} />
      </div>

      <input style={s} type="email" placeholder="your@email.com" value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleMagicLink()} />
      <button style={{ ...btn, background: "#111", color: "#fff" }} onClick={handleMagicLink} disabled={loading}>
        {loading ? "Sending…" : "Send magic link"}
      </button>
    </div>
  );
}
