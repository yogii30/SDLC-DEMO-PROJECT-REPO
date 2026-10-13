import { randomUUID, timingSafeEqual } from 'node:crypto';

// Dummy demo account required by SDLC-47 (admin / admin). It is not a real credential and must be
// replaced by a real identity provider before anything here is used outside a demo.
const DEMO_ACCOUNT = { username: 'admin', password: 'admin' } as const;

export interface Session {
  token: string;
  user: { username: string };
}

/** Compares in constant time, so the response time doesn't reveal how much of a value matched. */
function same(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Checks a username and password against the demo account; returns a session when they match. */
export function authenticate(username: string, password: string): Session | null {
  const userOk = same(username, DEMO_ACCOUNT.username);
  const passwordOk = same(password, DEMO_ACCOUNT.password);
  if (!userOk || !passwordOk) return null;
  return { token: randomUUID(), user: { username: DEMO_ACCOUNT.username } };
}
