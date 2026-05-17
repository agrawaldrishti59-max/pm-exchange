"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Notif = { id: string; title: string; body: string; is_read: boolean; created_at: string; };

function routeFor(title: string) {
  // All session-related notifications route to /sessions
  const t = title.toLowerCase();
  if (t.includes("request") || t.includes("accept") || t.includes("declin") || t.includes("credit") || t.includes("session") || t.includes("confirm")) return "/sessions";
  if (t.includes("approv")) return "/explore";
  return "/sessions";
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/join"); return; }
      const { data: me } = await supabase.from("members").select("id").eq("email", session.user.email).single();
      if (!me) return;
      const { data } = await supabase.from("notifications").select("*").eq("member_id", me.id).order("created_at", { ascending: false });
      setNotifs(data || []);
      await supabase.from("notifications").update({ is_read: true }).eq("member_id", me.id).eq("is_read", false);
      setLoading(false);
    }
    load();
  }, [router]);

  function timeAgo(dt: string) {
    const diff = Date.now() - new Date(dt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "48px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#888", fontSize: 14, cursor: "pointer", padding: 0 }}>←</button>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Notifications</h1>
        </div>
      </div>
      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        {loading && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Loading…</div>}
        {!loading && notifs.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>No notifications yet</div>}
        {notifs.map(n => (
          <div key={n.id} onClick={() => router.push(routeFor(n.title))}
            style={{ background: n.is_read ? "#fff" : "#F8F9FF", border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 8, borderLeft: n.is_read ? "1px solid #eee" : "3px solid #185FA5", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: "#111" }}>{n.title}</p>
              <span style={{ fontSize: 11, color: "#bbb", flexShrink: 0, marginLeft: 8 }}>{timeAgo(n.created_at)}</span>
            </div>
            <p style={{ fontSize: 13, color: "#666", margin: 0, lineHeight: 1.5 }}>{n.body}</p>
            <p style={{ fontSize: 12, color: "#185FA5", margin: "8px 0 0", fontWeight: 500 }}>View →</p>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
