"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PendingPage() {
  const router = useRouter();
  useEffect(() => {
    // Poll for approval every 10 seconds
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("members").select("status, goal").eq("email", session.user.email).single();
      if (data?.status === "approved") {
        clearInterval(interval);
        router.replace("/explore");
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div style={{ padding: 32, textAlign: "center", maxWidth: 400, margin: "0 auto", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <h2>Application under review</h2>
      <p style={{ color: "#666", lineHeight: 1.6, marginTop: 8 }}>
        We're verifying your LinkedIn profile.<br />
        We'll approve you within 24 hours.<br /><br />
        You'll start with <strong>2 credits</strong> on approval.<br />
        This page will automatically redirect once approved.
      </p>
    </div>
  );
}
