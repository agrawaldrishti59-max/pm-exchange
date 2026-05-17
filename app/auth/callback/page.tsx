"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AUTO_APPROVE } from "@/lib/config";

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    let done = false;
    let timer: any;

    async function redirect(email: string, name: string, avatar_url: string) {
      done = true;
      if (timer) clearTimeout(timer);
      setMsg("Checking your profile…");
      try {
        const { data: member, error } = await supabase
          .from("members").select("status, linkedin_url, goal").eq("email", email).maybeSingle();
        if (error) throw error;
        if (!member) {
          await supabase.from("members").insert([{
            email, name, avatar_url,
            status: AUTO_APPROVE ? "approved" : "pending",
            credits: AUTO_APPROVE ? 2 : 0,
          }]);
          router.replace("/complete-profile");
          return;
        }
        if (!member.linkedin_url) { router.replace("/complete-profile"); return; }
        if (!member.goal) { router.replace("/onboarding-goal"); return; }
        router.replace("/explore");
      } catch (e) {
        // Never hang silently — send the user somewhere actionable
        setMsg("Could not load your profile. Redirecting…");
        setTimeout(() => router.replace("/complete-profile"), 1500);
      }
    }

    // Handle both Google OAuth and magic-link sign-ins via the same listener
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

    // Fallback: also check for an existing session immediately (covers magic link)
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

    return () => {
      subscription.unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return (
    <div style={{ padding: 40, textAlign: "center" as const, fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <p style={{ color: "#666" }}>{msg}</p>
    </div>
  );
}
