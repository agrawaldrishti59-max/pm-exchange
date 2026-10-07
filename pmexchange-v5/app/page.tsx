"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace("/join"); }, [router]);
  return <div style={{ padding: 40, textAlign: "center" }}>Loading…</div>;
}
