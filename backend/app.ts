import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { authenticate } from './auth.ts';

export const LOGIN_PATH = '/api/auth/login';
const MAX_BODY_BYTES = 10 * 1024;

export interface ApiError {
  error: { code: string; message: string; fields?: Record<string, string> };
}

class HttpError extends Error {
  readonly status: number;
  readonly body: ApiError;
  readonly headers: Record<string, string>;

  constructor(status: number, body: ApiError, headers: Record<string, string> = {}) {
    super(body.error.message);
    this.status = status;
    this.body = body;
    this.headers = headers;
  }
}

const fail = (
  status: number,
  code: string,
  message: string,
  extra: { fields?: Record<string, string>; headers?: Record<string, string> } = {},
) =>
  new HttpError(
    status,
    { error: { code, message, ...(extra.fields && { fields: extra.fields }) } },
    extra.headers,
  );

function send(res: ServerResponse, status: number, body: unknown, headers = {}): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const type = req.headers['content-type'] ?? '';
  if (!type.toLowerCase().startsWith('application/json')) {
    throw fail(415, 'unsupported_media_type', 'Send the request body as application/json.');
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) {
      throw fail(413, 'payload_too_large', 'The request body is too large.');
    }
    chunks.push(chunk as Buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw fail(400, 'invalid_json', 'The request body is not valid JSON.');
  }
}

/** Validates the login body at the boundary: both fields are required, non-empty strings. */
function credentials(body: unknown): { username: string; password: string } {
  const record = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const username = typeof record.username === 'string' ? record.username.trim() : '';
  const password = typeof record.password === 'string' ? record.password : '';

  const fields: Record<string, string> = {};
  if (!username) fields.username = 'Username is required.';
  if (!password) fields.password = 'Password is required.';
  if (Object.keys(fields).length > 0) {
    throw fail(400, 'validation_error', 'Username and password are required.', { fields });
  }
  return { username, password };
}

async function login(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { username, password } = credentials(await readJson(req));
  const session = authenticate(username, password);
  if (!session) throw fail(401, 'invalid_credentials', 'Invalid username or password.');
  send(res, 200, session);
}

export async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (path !== LOGIN_PATH) throw fail(404, 'not_found', `No route for ${path}.`);
    if (req.method !== 'POST') {
      throw fail(405, 'method_not_allowed', 'Use POST to sign in.', { headers: { Allow: 'POST' } });
    }
    await login(req, res);
  } catch (error) {
    if (error instanceof HttpError) {
      send(res, error.status, error.body, error.headers);
      return;
    }
    console.error('Unhandled API error', error);
    send(res, 500, { error: { code: 'internal_error', message: 'Something went wrong.' } });
  }
}

export function createApp(): Server {
  return createServer((req, res) => void handle(req, res));
}
