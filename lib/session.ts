import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "hr_session";
const TTL    = 60 * 60 * 8; // 8 hours

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET || "faceprep-hr-dashboard-secret-fallback-2025";
  return new TextEncoder().encode(s);
}

export interface SessionUser { email: string; name: string; }

export async function createSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL}s`)
    .sign(getSecret());
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    return { email: payload.email as string, name: payload.name as string };
  } catch { return null; }
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE, value: token, httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const, maxAge: TTL, path: "/",
  };
}
