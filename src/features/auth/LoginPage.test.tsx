import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('renders the branding content', () => {
    render(<LoginPage />);

    expect(screen.getByRole('region', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.getAllByText('Payments')).not.toHaveLength(0);
  });

  it('shows no welcome heading or subtitle (SDLC-45)', () => {
    render(<LoginPage />);

    expect(screen.queryByText('Welcome back!')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign in to continue to your workspace.')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders the fields with the specified labels and placeholders', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('Email or username')).toHaveAttribute(
      'placeholder',
      'Enter your email or username',
    );
    expect(screen.getByLabelText('Password')).toHaveAttribute('placeholder', 'Enter your password');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('renders remember me, forgot password, sign in, social and sign up controls', () => {
    render(<LoginPage />);

    expect(screen.getByRole('checkbox', { name: 'Remember me' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('separator', { name: 'or' })).toHaveTextContent('OR');
    expect(screen.getByRole('button', { name: 'Continue with Microsoft' })).toHaveAttribute(
      'type',
      'button',
    );

    const footer = screen.getByText(/Don't have an account\?/);
    expect(within(footer).getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('offers no Google login (SDLC-44)', () => {
    render(<LoginPage />);

    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Google/)).not.toBeInTheDocument();
  });

  it('shows Microsoft as the only social login option (SDLC-44)', () => {
    render(<LoginPage />);

    const social = screen.getByRole('button', { name: 'Continue with Microsoft' }).parentElement!;
    expect(within(social).getAllByRole('button')).toHaveLength(1);
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  });

  it('shows field errors on demand', () => {
    render(<LoginPage errors={{ identifier: 'Enter your email', password: 'Enter a password' }} />);

    expect(screen.getByLabelText('Email or username')).toHaveAccessibleDescription(
      'Enter your email',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter a password');
  });

  it('shows the disabled state on every control', () => {
    render(<LoginPage disabled />);

    for (const name of [
      'Sign in',
      'Forgot password?',
      'Continue with Microsoft',
      'Sign up',
      'Show password',
    ]) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(screen.getByLabelText('Email or username')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeDisabled();
  });

  it('reaches every control by keyboard in visual order', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const expected = [
      screen.getByLabelText('Email or username'),
      screen.getByLabelText('Password'),
      screen.getByRole('button', { name: 'Show password' }),
      screen.getByRole('checkbox', { name: 'Remember me' }),
      screen.getByRole('button', { name: 'Forgot password?' }),
      screen.getByRole('button', { name: 'Sign in' }),
      screen.getByRole('button', { name: 'Continue with Microsoft' }),
      screen.getByRole('button', { name: 'Sign up' }),
    ];
    for (const element of expected) {
      await user.tab();
      expect(element).toHaveFocus();
    }
  });

  it('performs no network request, submission or navigation', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const href = window.location.href;
    // jsdom never navigates, so assert the browser's default submit action is cancelled.
    // React's handler runs on the root, before this document-level bubble listener.
    const submits: SubmitEvent[] = [];
    const onSubmit = (event: Event) => submits.push(event as SubmitEvent);
    document.addEventListener('submit', onSubmit);
    render(<App />);

    await user.type(screen.getByLabelText('Email or username'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret');
    for (const name of ['Sign in', 'Forgot password?', 'Continue with Microsoft', 'Sign up']) {
      await user.click(screen.getByRole('button', { name }));
    }
    await user.type(screen.getByLabelText('Password'), '{Enter}');

    document.removeEventListener('submit', onSubmit);

    expect(submits).toHaveLength(2); // Sign in click and Enter in the password field
    expect(submits.every((event) => event.defaultPrevented)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.location.href).toBe(href);
    expect(screen.getByLabelText('Email or username')).toHaveValue('ada@example.com');
    fetchSpy.mockRestore();
  });
});
