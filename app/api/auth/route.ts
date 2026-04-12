import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!password || !(await verifyPassword(password))) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createToken();

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return res;
}
