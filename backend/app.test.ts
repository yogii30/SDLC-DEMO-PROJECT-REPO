import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp, handle, LOGIN_PATH } from './app.ts';

let server: Server;
let base: string;

beforeAll(async () => {
  server = createApp();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

const post = (body: string, contentType = 'application/json') =>
  fetch(`${base}${LOGIN_PATH}`, { method: 'POST', headers: { 'Content-Type': contentType }, body });

const login = (credentials: unknown) => post(JSON.stringify(credentials));

interface Body {
  token?: string;
  user?: { username: string };
  error: { code: string; message: string; fields?: Record<string, string> };
}

const read = async (res: Response): Promise<Body> => (await res.json()) as Body;

describe(`POST ${LOGIN_PATH}`, () => {
  it('signs in the demo admin and returns a session', async () => {
    const res = await login({ username: 'admin', password: 'admin' });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await read(res);
    expect(body.user).toEqual({ username: 'admin' });
    expect(body.token).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('issues a new token for every sign-in', async () => {
    const first = await read(await login({ username: 'admin', password: 'admin' }));
    const second = await read(await login({ username: 'admin', password: 'admin' }));
    expect(first.token).not.toBe(second.token);
  });

  it('ignores surrounding whitespace in the username', async () => {
    const res = await login({ username: '  admin ', password: 'admin' });
    expect(res.status).toBe(200);
  });

  it.each([
    ['a wrong password', { username: 'admin', password: 'nope' }],
    ['an unknown username', { username: 'root', password: 'admin' }],
    ['a password with different case', { username: 'admin', password: 'ADMIN' }],
  ])('rejects %s with 401 and the same message', async (_, credentials) => {
    const res = await login(credentials);

    expect(res.status).toBe(401);
    expect(await read(res)).toEqual({
      error: { code: 'invalid_credentials', message: 'Invalid username or password.' },
    });
  });

  it('reports every missing field with 400', async () => {
    const res = await login({ username: '   ', password: '' });

    expect(res.status).toBe(400);
    expect(await read(res)).toEqual({
      error: {
        code: 'validation_error',
        message: 'Username and password are required.',
        fields: { username: 'Username is required.', password: 'Password is required.' },
      },
    });
  });

  it.each([
    ['a missing password', { username: 'admin' }, ['password']],
    ['non-string fields', { username: 1, password: true }, ['username', 'password']],
    ['a JSON array', [], ['username', 'password']],
    ['JSON null', null, ['username', 'password']],
  ])('rejects %s with 400', async (_, body, missing) => {
    const res = await login(body);

    expect(res.status).toBe(400);
    expect(Object.keys((await read(res)).error.fields ?? {})).toEqual(missing);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await post('{"username":');

    expect(res.status).toBe(400);
    expect((await read(res)).error.code).toBe('invalid_json');
  });

  it('rejects a body that is not JSON with 415', async () => {
    const res = await post('username=admin&password=admin', 'application/x-www-form-urlencoded');

    expect(res.status).toBe(415);
    expect((await read(res)).error.code).toBe('unsupported_media_type');
  });

  it('rejects an oversized body with 413', async () => {
    const res = await login({ username: 'admin', password: 'x'.repeat(20_000) });

    expect(res.status).toBe(413);
    expect((await read(res)).error.code).toBe('payload_too_large');
  });

  it('allows only POST, saying so with 405 and an Allow header', async () => {
    const res = await fetch(`${base}${LOGIN_PATH}`);

    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
    expect((await read(res)).error.code).toBe('method_not_allowed');
  });

  it('answers unknown routes with 404', async () => {
    const res = await fetch(`${base}/api/unknown`, { method: 'POST' });

    expect(res.status).toBe(404);
    expect((await read(res)).error.code).toBe('not_found');
  });
});

describe('handle', () => {
  it('turns an unexpected failure into a 500 without leaking details', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const writeHead = vi.fn();
    const end = vi.fn();
    // A URL that can't be parsed makes the router itself throw.
    const req = { url: 'http://[', method: 'POST', headers: {} } as IncomingMessage;

    await handle(req, { writeHead, end } as unknown as ServerResponse);

    expect(writeHead).toHaveBeenCalledWith(
      500,
      expect.objectContaining({ 'Cache-Control': 'no-store' }),
    );
    expect(JSON.parse(end.mock.calls[0]![0] as string)).toEqual({
      error: { code: 'internal_error', message: 'Something went wrong.' },
    });
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});
