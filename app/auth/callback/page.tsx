"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    async function redirect(email: string, name: string, avatar_url: string) {
      setMsg("Checking your profile…");
      const { data: member } = await supabase
        .from("members").select("status, linkedin_url, goal").eq("email", email).single();
      if (!member) {
        await supabase.from("members").insert([{ email, name, avatar_url, status: "pending", credits: 0 }]);
        router.replace("/complete-profile");
        return;
      }
      if (!member.linkedin_url) { router.replace("/complete-profile"); return; }
      if (!member.goal) { router.replace("/onboarding-goal"); return; }
      router.replace("/explore");
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        await redirect(
          session.user.email!,
          session.user.user_metadata?.full_name || "",
          session.user.user_metadata?.avatar_url || ""
        );
      }
    });

    setTimeout(() => {
      setMsg("Taking too long — try again");
      setTimeout(() => router.replace("/join"), 2000);
    }, 10000);

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div style={{ padding: 40, textAlign: "center" as const, fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <p style={{ color: "#666" }}>{msg}</p>
    </div>
  );
}