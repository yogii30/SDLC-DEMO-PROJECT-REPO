import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { login, LOGIN_MESSAGES } from '../src/features/auth/api.ts';
import { createApp } from './app.ts';

// AC8: the web app's login client and the real API agree on the contract, end to end over HTTP.

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

describe('login client against the real API', () => {
  it('signs in the demo admin', async () => {
    const result = await login('admin', 'admin', base);

    expect(result.ok).toBe(true);
    expect(result.ok && result.session.user).toEqual({ username: 'admin' });
  });

  it('reports wrong credentials with the invalid-credentials message', async () => {
    expect(await login('admin', 'wrong', base)).toEqual({
      ok: false,
      message: LOGIN_MESSAGES.invalidCredentials,
    });
  });

  it("passes the API's validation message through when a field is missing", async () => {
    expect(await login('', 'admin', base)).toEqual({
      ok: false,
      message: 'Username and password are required.',
    });
  });

  it('reports an unreachable API as a network problem', async () => {
    expect(await login('admin', 'admin', 'http://127.0.0.1:1')).toEqual({
      ok: false,
      message: LOGIN_MESSAGES.network,
    });
  });
});
