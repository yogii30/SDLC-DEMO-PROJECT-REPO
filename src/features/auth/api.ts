export const LOGIN_URL = '/api/auth/login';

/** What the login API returns on success (see backend/app.ts). */
export interface Session {
  token: string;
  user: { username: string };
}

export type LoginResult = { ok: true; session: Session } | { ok: false; message: string };

export const LOGIN_MESSAGES = {
  invalidCredentials: 'Invalid username or password.',
  network: "We couldn't reach the server. Check your connection and try again.",
  server: 'Something went wrong on our side. Please try again.',
  unexpected: 'The server sent an unexpected response. Please try again.',
} as const;

function isSession(value: unknown): value is Session {
  const candidate = value as Partial<Session> | null;
  return (
    typeof candidate?.token === 'string' &&
    candidate.token.length > 0 &&
    typeof candidate.user?.username === 'string'
  );
}

async function errorMessage(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { error?: { message?: unknown } };
    return typeof body.error?.message === 'string' ? body.error.message : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Sends the credentials to the login API and turns every outcome into either a session or a
 * message the sign-in form can show. It never throws.
 */
export async function login(
  username: string,
  password: string,
  baseUrl = '',
): Promise<LoginResult> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${LOGIN_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    return { ok: false, message: LOGIN_MESSAGES.network };
  }

  if (res.status === 401) return { ok: false, message: LOGIN_MESSAGES.invalidCredentials };
  if (res.status >= 500) return { ok: false, message: LOGIN_MESSAGES.server };
  if (!res.ok) {
    return { ok: false, message: (await errorMessage(res)) ?? LOGIN_MESSAGES.unexpected };
  }

  try {
    const body: unknown = await res.json();
    if (isSession(body)) return { ok: true, session: body };
  } catch {
    // A 2xx without a JSON body breaks the contract; report it like any other bad response.
  }
  return { ok: false, message: LOGIN_MESSAGES.unexpected };
}
