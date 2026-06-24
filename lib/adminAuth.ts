import crypto from "crypto";

export const ADMIN_COOKIE = "amn_admin";

/** Non-reversible token stored in the cookie. Derived from the password, so an
 *  attacker who sees the cookie can't recover the password, and can't forge the
 *  token without knowing it. Stateless — works on serverless with no session store. */
export function adminToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return crypto.createHash("sha256").update(pw).digest("hex");
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function checkPassword(pw: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(pw, expected);
}

export function isAuthed(cookieValue: string | undefined): boolean {
  const expected = adminToken();
  if (!expected || !cookieValue) return false;
  return safeEqual(cookieValue, expected);
}
