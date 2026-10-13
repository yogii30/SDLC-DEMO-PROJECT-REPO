import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { LOGIN_MESSAGES } from './api';

// SDLC-47 acceptance criteria, driven through the whole app with the login API stubbed at fetch.

const session = { token: 'token-1', user: { username: 'admin' } };

const stubFetch = (response: Response | Promise<Response>) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(response));

async function signIn(username: string, password: string) {
  const user = userEvent.setup();
  if (username) await user.type(screen.getByLabelText('Username'), username);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  return user;
}

afterEach(() => vi.restoreAllMocks());

describe('SDLC-47 login', () => {
  it('AC1/AC9: offers username and password fields, a masked password and a Sign in button', () => {
    render(<App />);

    expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit');
  });

  it('AC2/AC3: sends the credentials and lands on the home page as the signed-in user', async () => {
    const fetchSpy = stubFetch(Response.json(session));
    render(<App />);

    await signIn('admin', 'admin');

    const heading = await screen.findByRole('heading', { name: 'You are signed in' });
    expect(heading).toHaveFocus();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ body: JSON.stringify({ username: 'admin', password: 'admin' }) }),
    );
  });

  it('AC2: trims the username before sending it, but never the password', async () => {
    const fetchSpy = stubFetch(Response.json(session));
    render(<App />);

    await signIn('  admin  ', ' pw ');

    await screen.findByRole('heading', { name: 'You are signed in' });
    expect(fetchSpy.mock.calls[0]![1]!.body).toBe(
      JSON.stringify({ username: 'admin', password: ' pw ' }),
    );
  });

  it('AC4: shows an error for rejected credentials and stays on the sign-in page', async () => {
    stubFetch(Response.json({ error: { code: 'invalid_credentials' } }, { status: 401 }));
    render(<App />);

    await signIn('admin', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent(LOGIN_MESSAGES.invalidCredentials);
    expect(screen.getByRole('form', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveValue('admin');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('AC4: clears the previous error when the user tries again', async () => {
    const fetchSpy = stubFetch(Response.json({ error: {} }, { status: 401 }));
    render(<App />);
    const user = await signIn('admin', 'wrong');
    await screen.findByRole('alert');

    fetchSpy.mockImplementation(() => Promise.resolve(Response.json(session)));
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'You are signed in' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('AC5: requires both fields and sends no request while either is empty', async () => {
    const fetchSpy = stubFetch(Response.json(session));
    render(<App />);

    await signIn('', '');

    expect(screen.getByLabelText('Username')).toHaveAccessibleDescription('Enter your username.');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter your password.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['the username is only spaces', '   ', 'secret', 'Username', 'Enter your username.'],
    ['the password is empty', 'admin', '', 'Password', 'Enter your password.'],
  ])('AC5: blocks the request when %s', async (_, username, password, label, message) => {
    const fetchSpy = stubFetch(Response.json(session));
    render(<App />);

    await signIn(username, password);

    expect(screen.getByLabelText(label)).toHaveAccessibleDescription(message);
    expect(screen.getAllByText(/^Enter your (username|password)\.$/)).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('AC6: shows a loading state and ignores repeat submits while the request runs', async () => {
    let respond!: (response: Response) => void;
    const fetchSpy = stubFetch(new Promise<Response>((resolve) => (respond = resolve)));
    render(<App />);

    const user = await signIn('admin', 'admin');

    const busy = screen.getByRole('button', { name: 'Signing in…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    await user.click(busy);
    await user.type(screen.getByLabelText('Password'), '{Enter}');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    respond(Response.json(session));
    expect(await screen.findByRole('heading', { name: 'You are signed in' })).toBeInTheDocument();
  });

  it('AC6: returns Sign in to normal once a failed request ends', async () => {
    stubFetch(Response.json({ error: {} }, { status: 401 }));
    render(<App />);

    await signIn('admin', 'wrong');
    await screen.findByRole('alert');

    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-busy');
  });

  it('AC7: explains an unreachable server', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    render(<App />);

    await signIn('admin', 'admin');

    expect(await screen.findByRole('alert')).toHaveTextContent(LOGIN_MESSAGES.network);
  });

  it('AC7: explains a server error', async () => {
    stubFetch(Response.json({ error: { code: 'internal_error' } }, { status: 500 }));
    render(<App />);

    await signIn('admin', 'admin');

    expect(await screen.findByRole('alert')).toHaveTextContent(LOGIN_MESSAGES.server);
  });

  it('AC8: does not sign in when a success response breaks the API contract', async () => {
    stubFetch(Response.json({ user: { username: 'admin' } }));
    render(<App />);

    await signIn('admin', 'admin');

    expect(await screen.findByRole('alert')).toHaveTextContent(LOGIN_MESSAGES.unexpected);
    expect(screen.queryByRole('heading', { name: 'You are signed in' })).not.toBeInTheDocument();
  });

  it('AC10: registration and recovery stay inert and send nothing', async () => {
    const fetchSpy = stubFetch(Response.json(session));
    const user = userEvent.setup();
    render(<App />);

    for (const name of ['Forgot password?', 'Continue with Microsoft', 'Sign up']) {
      await user.click(screen.getByRole('button', { name }));
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('form', { name: 'Sign in' })).toBeInTheDocument();
  });
});
