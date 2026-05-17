"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Suspense } from "react";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    let done = false;
    let timer: any;

    async function redirect(email: string, name: string, avatar_url: string) {
      done = true;
      if (timer) clearTimeout(timer);
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

    async function start() {
      const token_hash = params.get("token_hash");
      const type = params.get("type");

      // Magic link: explicitly verify the token to create a session
      if (token_hash && type) {
        setMsg("Verifying your link…");
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });
        if (error || !data.session) {
          setMsg("This link expired or was already used. Redirecting…");
          setTimeout(() => router.replace("/join"), 2500);
          return;
        }
        await redirect(
          data.session.user.email!,
          data.session.user.user_metadata?.full_name || "",
          data.session.user.user_metadata?.avatar_url || ""
        );
        return;
      }

      // Google OAuth: wait for SIGNED_IN
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session && !done) {
            subscription.unsubscribe();
            await redirect(
              session.user.email!,
              session.user.user_metadata?.full_name || "",
              session.user.user_metadata?.avatar_url || ""
            );
          }
        }
      );

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && !done) {
          subscription.unsubscribe();
          redirect(
            session.user.email!,
            session.user.user_metadata?.full_name || "",
            session.user.user_metadata?.avatar_url || ""
          );
        }
      });

      timer = setTimeout(() => {
        if (!done) {
          setMsg("Taking too long — try again");
          setTimeout(() => router.replace("/join"), 2000);
        }
      }, 12000);
    }

    start();

    return () => { if (timer) clearTimeout(timer); };
  }, [router, params]);

  return (
    <div style={{ padding: 40, textAlign: "center" as const, fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <p style={{ color: "#666" }}>{msg}</p>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" as const }}>Loading…</div>}>
      <CallbackInner />
    </Suspense>
  );
}