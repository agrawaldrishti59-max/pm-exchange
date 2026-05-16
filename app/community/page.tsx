"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

type Member = { id: string; name: string; company: string; role: string; linkedin_url: string; credits: number; email: string; };

const COLORS = ["#E6F1FB", "#E1F5EE", "#FAECE7", "#EEEDFE", "#FBEAF0"];
const TEXT = ["#185FA5", "#0F6E56", "#993C1D", "#534AB7", "#993556"];

function avatar(id: string) {
  const n = (id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % COLORS.length;
  return { bg: COLORS[n], color: TEXT[n] };
}

export default function CommunityPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<Member | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
     const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/join"); return; }
      const { data } = await supabase.from("members").select("*").eq("status", "approved").order("name");
      setMembers(data || []);
      setMe((data || []).find((m: Member) => m.email === session.user.email) || null);
      setLoading(false);
    }
    load();
  }, [router]);

  const filtered = members.filter(m =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.company?.toLowerCase().includes(search.toLowerCase()) ||
    m.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "48px 16px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Community</h1>
          {me && <span style={{ background: "#FAEEDA", color: "#633806", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20 }}>🪙 {me.credits} credits</span>}
        </div>
        <input style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }}
          placeholder="Search by name, company, role…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>
        {loading && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Loading…</div>}
        {!loading && filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>No members found</div>}
        {filtered.map(m => {
          const av = avatar(m.id);
          const initials = m.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
          return (
            <Link key={m.id} href={`/members/${m.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p style={{ fontWeight: 500, fontSize: 14, margin: 0, color: "#111" }}>{m.name}</p>
                    {m.email === me?.email && <span style={{ fontSize: 10, background: "#eee", color: "#999", padding: "1px 6px", borderRadius: 8 }}>You</span>}
                  </div>
                  <p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>{[m.role, m.company].filter(Boolean).join(" @ ")}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: "#BA7517", fontWeight: 600 }}>🪙 {m.credits}</div>
                  {m.email !== me?.email && <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>Book →</div>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
