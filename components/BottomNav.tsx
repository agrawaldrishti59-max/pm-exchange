"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/community", label: "Community", icon: "👥" },
  { href: "/sessions", label: "Sessions", icon: "📅" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #eee", display: "flex" }}>
      {links.map(l => (
        <Link key={l.href} href={l.href} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          gap: 3, padding: "10px 0 6px", fontSize: 11, fontWeight: 500,
          textDecoration: "none",
          color: path.startsWith(l.href) ? "#111" : "#999",
        }}>
          <span style={{ fontSize: 20 }}>{l.icon}</span>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
