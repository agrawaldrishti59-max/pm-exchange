"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Member = { id: string; name: string; company: string; role: string; linkedin_url: string; credits: number; email: string; bio: string; years_experience: number; avatar_url: string; status: string; };
type Slot = { id: string; member_id: string; datetime: string; };

const COLORS = ["#E6F1FB","#E1F5EE","#FAECE7","#EEEDFE","#FBEAF0"];
const TEXT = ["#185FA5","#0F6E56","#993C1D","#534AB7","#993556"];
function avatarColor(id: string) {
  const n = (id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % COLORS.length;
  return { bg: COLORS[n], color: TEXT[n] };
}
function initials(name: string) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function formatSlot(dt: string) {
  return new Date(dt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ExplorePage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<Member | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/join"); return; }

      const [{ data: allMembers }, { data: myData }] = await Promise.all([
        supabase.from("members").select("*").order("name"),
        supabase.from("members").select("*").eq("email", session.user.email).single(),
      ]);

      setMembers(allMembers || []);
      setMe(myData);

      // Load upcoming slots for all members
      const now = new Date().toISOString();
      const { data: slotData } = await supabase.from("slots").select("*").eq("is_booked", false).gte("datetime", now).order("datetime");
      setSlots(slotData || []);

      // Unread notifications
      if (myData) {
        const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("member_id", myData.id).eq("is_read", false);
        setNotifCount(count || 0);
      }

      setLoading(false);
    }
    load();

    // Realtime: listen for new notifications
    const channel = supabase.channel("notifs").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
      setNotifCount(c => c + 1);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router]);

  const filtered = members.filter(m =>
    m.id !== me?.id && (!search ||
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.company?.toLowerCase().includes(search.toLowerCase()) ||
    m.role?.toLowerCase().includes(search.toLowerCase()))
  );

  function getMemberSlots(memberId: string) {
    return slots.filter(s => s.member_id === memberId).slice(0, 2);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Pending banner */}
      {me?.status === "pending" && (
        <div style={{ background: "#FAEEDA", borderBottom: "1px solid #F5D79E", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>⏳</span>
          <p style={{ margin: 0, fontSize: 13, color: "#854F0B", lineHeight: 1.4 }}>
            <strong>Profile under review.</strong> You'll get 2 credits once approved.
          </p>
        </div>
      )}

      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "16px 16px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Explore</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {me?.status === "approved" && <span style={{ background: "#FAEEDA", color: "#633806", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20 }}>🪙 {me?.credits}</span>}
            <Link href="/notifications" style={{ position: "relative", textDecoration: "none", fontSize: 20 }}>
              🔔
              {notifCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#e53e3e", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{notifCount}</span>}
            </Link>
          </div>
        </div>
        <input style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const, fontFamily: "inherit" }}
          placeholder="Search by name, company, role…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>
        {loading && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Loading…</div>}
        {!loading && filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>No members found</div>}
        {filtered.map(m => {
          const av = avatarColor(m.id);
          const memberSlots = getMemberSlots(m.id);
          return (
            <Link key={m.id} href={`/members/${m.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{initials(m.name || "")}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: "#111" }}>{m.name}</p>
                    <p style={{ fontSize: 12, color: "#888", margin: "2px 0" }}>{[m.role, m.company].filter(Boolean).join(" @ ")}{m.years_experience ? ` · ${m.years_experience}y exp` : ""}</p>
                    {m.bio && <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0", lineHeight: 1.4 }}>{m.bio}</p>}
                  </div>
                </div>

                {memberSlots.length > 0 ? (
                  <div style={{ borderTop: "1px solid #f5f5f5", paddingTop: 10 }}>
                    <p style={{ fontSize: 11, color: "#999", margin: "0 0 6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Available slots</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                      {memberSlots.map(s => (
                        <span key={s.id} style={{ fontSize: 11, padding: "4px 10px", background: "#E1F5EE", color: "#0F6E56", borderRadius: 20, fontWeight: 500 }}>
                          📅 {formatSlot(s.datetime)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ borderTop: "1px solid #f5f5f5", paddingTop: 8 }}>
                    <p style={{ fontSize: 12, color: "#ccc", margin: 0 }}>No slots added yet</p>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
