"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type Member = { id: string; name: string; email: string; company: string; role: string; linkedin_url: string; whatsapp: string; credits: number; };

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Member | null>(null);
  const [stats, setStats] = useState({ gave: 0, received: 0 });

  useEffect(() => {
    async function load() {
     const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/join"); return; }
      const { data } = await supabase.from("members").select("*").eq("email", session.user.email).single();
      setMe(data);
      if (data) {
        const [{ count: gave }, { count: received }] = await Promise.all([
          supabase.from("sessions").select("*", { count: "exact", head: true }).eq("host_id", data.id).eq("status", "completed"),
          supabase.from("sessions").select("*", { count: "exact", head: true }).eq("booker_id", data.id).eq("status", "completed"),
        ]);
        setStats({ gave: gave || 0, received: received || 0 });
      }
    }
    load();
  }, [router]);

  async function signOut() {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    await supabase.auth.signOut();
    router.replace("/join");
  }

  if (!me) return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>Loading…</div>;
  const initials = me.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "48px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E6F1FB", color: "#185FA5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600 }}>{initials}</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{me.name}</h1>
            <p style={{ fontSize: 13, color: "#888", margin: "2px 0 0" }}>{[me.role, me.company].filter(Boolean).join(" @ ")}</p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          {[{ label: "Credits", value: me.credits, amber: true }, { label: "Gave", value: stats.gave }, { label: "Received", value: stats.received }].map(({ label, value, amber }) => (
            <div key={label} style={{ background: amber ? "#FAEEDA" : "#fff", border: `1px solid ${amber ? "#F5D79E" : "#eee"}`, borderRadius: 12, padding: 12, textAlign: "center" }}>
              <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: amber ? "#BA7517" : "#111" }}>{value}</p>
              <p style={{ fontSize: 11, color: "#999", margin: "2px 0 0" }}>{label}</p>
            </div>
          ))}
        </div>

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
          <p style={{ fontSize: 13, color: "#854F0B", margin: "4px 0" }}>🟡 Start with <strong>2 credits</strong></p>
          <p style={{ fontSize: 13, color: "#854F0B", margin: "4px 0" }}>📤 Use <strong>1 credit</strong> to book an interview</p>
          <p style={{ fontSize: 13, color: "#854F0B", margin: "4px 0" }}>📥 Earn <strong>+1 credit</strong> when you give an interview</p>
        </div>

        <button onClick={signOut} style={{ width: "100%", padding: 12, background: "transparent", color: "#e53e3e", border: "1px solid #fed7d7", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Sign out</button>
      </div>
      <BottomNav />
    </div>
  );
}
