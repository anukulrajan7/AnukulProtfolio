import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// No fallbacks: if either env var is missing, admin login is disabled
// instead of silently using a value anyone can read in the repo.
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const adminEnabled = Boolean(ADMIN_SECRET && ADMIN_SECRET.length >= 32 && ADMIN_PASSWORD);

const secret = new TextEncoder().encode(ADMIN_SECRET ?? "");

export async function verifyPassword(password: string): Promise<boolean> {
  if (!adminEnabled) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(ADMIN_PASSWORD!);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<boolean> {
  if (!adminEnabled) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return false;
  return verifyToken(token);
}
