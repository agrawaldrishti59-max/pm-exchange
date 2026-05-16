"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
   async function handle() {
  const { supabase } = await import("@/lib/supabase");

      // onAuthStateChange catches the token from the URL hash automatically
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === "SIGNED_IN" && session) {
            subscription.unsubscribe();
            const email = session.user.email!;
            const name = session.user.user_metadata?.full_name || "";
            setMsg("Checking your profile…");

            const { data: member } = await supabase
              .from("members").select("status, linkedin_url").eq("email", email).single();

            if (!member) {
              await supabase.from("members").insert([{ email, name, status: "pending", credits: 0 }]);
              router.replace("/complete-profile");
              return;
            }
            if (!member.linkedin_url) { router.replace("/complete-profile"); return; }
            if (member.status === "approved") { router.replace("/community"); return; }
            router.replace("/pending");
          }
        }
      );

      // Timeout fallback
      setTimeout(() => {
        setMsg("Taking too long — try again");
        setTimeout(() => router.replace("/join"), 2000);
      }, 10000);
    }
    handle();
  }, [router]);

  return (
    <div style={{ padding: 40, textAlign: "center" as const, fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <p style={{ color: "#666" }}>{msg}</p>
    </div>
  );
}
