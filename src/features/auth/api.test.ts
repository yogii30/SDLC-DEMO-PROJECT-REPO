import { login, LOGIN_MESSAGES } from './api';

const respond = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(body, { status }));

afterEach(() => vi.restoreAllMocks());

describe('login', () => {
  it('posts the credentials as JSON to the login API', async () => {
    const fetchSpy = respond({ token: 't', user: { username: 'admin' } });

    await login('admin', 'admin');

    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
  });

  it('returns the session on success', async () => {
    respond({ token: 'abc', user: { username: 'admin' } });

    expect(await login('admin', 'admin')).toEqual({
      ok: true,
      session: { token: 'abc', user: { username: 'admin' } },
    });
  });

  it('reports rejected credentials', async () => {
    respond({ error: { code: 'invalid_credentials', message: 'nope' } }, 401);

    expect(await login('admin', 'x')).toEqual({
      ok: false,
      message: LOGIN_MESSAGES.invalidCredentials,
    });
  });

  it('reports an unreachable server', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    expect(await login('admin', 'admin')).toEqual({ ok: false, message: LOGIN_MESSAGES.network });
  });

  it.each([500, 502, 503])('reports a server error (%i)', async (status) => {
    respond({ error: { code: 'internal_error', message: 'boom' } }, status);

    expect(await login('admin', 'admin')).toEqual({ ok: false, message: LOGIN_MESSAGES.server });
  });

  it("shows the API's own message for other client errors", async () => {
    respond({ error: { code: 'validation_error', message: 'Username is required.' } }, 400);

    expect(await login('', 'admin')).toEqual({ ok: false, message: 'Username is required.' });
  });

  it('falls back to a generic message when a client error has no usable body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>', { status: 404 }));

    expect(await login('admin', 'admin')).toEqual({
      ok: false,
      message: LOGIN_MESSAGES.unexpected,
    });
  });

  it.each([
    ['no token', { user: { username: 'admin' } }],
    ['an empty token', { token: '', user: { username: 'admin' } }],
    ['no user', { token: 't' }],
    ['null', null],
  ])('rejects a success response with %s', async (_, body) => {
    respond(body);

    expect(await login('admin', 'admin')).toEqual({
      ok: false,
      message: LOGIN_MESSAGES.unexpected,
    });
  });

  it('rejects a success response that is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('OK', { status: 200 }));

    expect(await login('admin', 'admin')).toEqual({
      ok: false,
      message: LOGIN_MESSAGES.unexpected,
    });
  });

  it('can target another origin', async () => {
    const fetchSpy = respond({ token: 't', user: { username: 'admin' } });

    await login('admin', 'admin', 'http://127.0.0.1:9999');

    expect(fetchSpy.mock.calls[0]![0]).toBe('http://127.0.0.1:9999/api/auth/login');
  });
});
