import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  if (!code) return NextResponse.redirect(`${appUrl}/join`);
  return NextResponse.redirect(`${appUrl}/auth/callback?code=${code}`);
}