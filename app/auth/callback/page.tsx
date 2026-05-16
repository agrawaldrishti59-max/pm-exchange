"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Suspense } from "react";

function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    async function handle() {
      try {
        const code = params.get("code");

        if (code) {
          setMsg("Verifying with Google…");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error || !data.session) {
            setMsg("Sign in failed. Redirecting…");
            setTimeout(() => router.replace("/join"), 2000);
            return;
          }
          await redirect(data.session.user.email!, data.session.user.user_metadata?.full_name || "", data.session.user.user_metadata?.avatar_url || "");
          return;
        }

        // Handle magic link / implicit flow
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === "SIGNED_IN" && session) {
            subscription.unsubscribe();
            await redirect(session.user.email!, session.user.user_metadata?.full_name || "", session.user.user_metadata?.avatar_url || "");
          }
        });

        setTimeout(() => {
          setMsg("Taking too long — try again");
          setTimeout(() => router.replace("/join"), 2000);
        }, 10000);

      } catch (e: any) {
        setMsg("Error: " + e.message);
        setTimeout(() => router.replace("/join"), 3000);
      }
    }

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

    handle();
  }, [router, params]);

  return (
    <div style={{ padding: 40, textAlign: "center" as const, fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <p style={{ color: "#666" }}>{msg}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" as const }}>Loading…</div>}>
      <Callback />
    </Suspense>
  );
}