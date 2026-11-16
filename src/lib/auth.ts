import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";
import { sessionSecret } from "./secret";

const secret = new TextEncoder().encode(sessionSecret());

const COOKIE_NAME = "blametv_session";
const STASH_COOKIE = "blametv_stash";
const SESSION_DAYS = 30;
const MAX_STASHED = 5;

function cookieOpts() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export type SessionUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
};

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, cookieOpts());
}

async function readStash(): Promise<string[]> {
  const store = await cookies();
  const raw = store.get(STASH_COOKIE)?.value;
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((t) => typeof t === "string").slice(0, MAX_STASHED) : [];
  } catch {
    return [];
  }
}

async function writeStash(tokens: string[]) {
  const store = await cookies();
  store.set(STASH_COOKIE, JSON.stringify(tokens.slice(0, MAX_STASHED)), cookieOpts());
}

async function tokenUserId(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return String(payload.sub);
  } catch {
    return null;
  }
}

export async function stashCurrentSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return;
  const stash = await readStash();
  if (!stash.includes(token)) stash.push(token);
  await writeStash(stash);
}

export type StashedAccount = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
};

export async function listStashedAccounts(): Promise<StashedAccount[]> {
  const stash = await readStash();
  const accounts: StashedAccount[] = [];
  for (const token of stash) {
    const userId = await tokenUserId(token);
    if (!userId) continue;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { username: true, displayName: true, avatarUrl: true, verified: true },
    });
    if (user && !accounts.some((a) => a.username === user.username)) accounts.push(user);
  }
  return accounts;
}

export async function switchAccount(username: string): Promise<boolean> {
  const store = await cookies();
  const current = store.get(COOKIE_NAME)?.value;
  const stash = await readStash();
  for (let i = 0; i < stash.length; i++) {
    const userId = await tokenUserId(stash[i]);
    if (!userId) continue;
    const user = await db.user.findUnique({ where: { id: userId }, select: { username: true } });
    if (user?.username === username) {
      const target = stash[i];
      const next = stash.filter((_, j) => j !== i);
      if (current) next.push(current);
      store.set(COOKIE_NAME, target, cookieOpts());
      await writeStash(next);
      return true;
    }
  }
  return false;
}

export async function removeStashedAccount(username: string): Promise<boolean> {
  const stash = await readStash();
  const keep: string[] = [];
  let removed = false;
  for (const token of stash) {
    const userId = await tokenUserId(token);
    const user = userId
      ? await db.user.findUnique({ where: { id: userId }, select: { username: true } })
      : null;
    if (user?.username === username) {
      removed = true;
      continue;
    }
    keep.push(token);
  }
  if (removed) await writeStash(keep);
  return removed;
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const user = await db.user.findUnique({
      where: { id: String(payload.sub) },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        avatarUrl: true,
      },
    });
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Authentication required", 401);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("Forbidden", 403);
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
