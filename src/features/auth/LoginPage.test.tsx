import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('renders the branding content', () => {
    render(<LoginPage />);

    expect(screen.getAllByRole('heading', { level: 1, name: 'Welcome Back!' })).not.toHaveLength(0);
    expect(screen.getAllByText('Sign in to continue to your workspace.')).not.toHaveLength(0);
    expect(screen.getByRole('region', { name: 'Welcome Back!' })).toBeInTheDocument();
  });

  it('renders the fields with the specified labels and placeholders', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('Email or Username')).toHaveAttribute(
      'placeholder',
      'Enter your email or username',
    );
    expect(screen.getByLabelText('Password')).toHaveAttribute('placeholder', 'Enter your password');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('renders remember me, forgot password, sign in, social and sign up controls', () => {
    render(<LoginPage />);

    expect(screen.getByRole('checkbox', { name: 'Remember me' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Forgot Password?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('separator', { name: 'or' })).toHaveTextContent('OR');
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toHaveAttribute(
      'type',
      'button',
    );
    expect(screen.getByRole('button', { name: 'Continue with Microsoft' })).toHaveAttribute(
      'type',
      'button',
    );

    const footer = screen.getByText(/Don't have an account\?/);
    expect(within(footer).getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  });

  it('shows field errors on demand', () => {
    render(<LoginPage errors={{ identifier: 'Enter your email', password: 'Enter a password' }} />);

    expect(screen.getByLabelText('Email or Username')).toHaveAccessibleDescription(
      'Enter your email',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter a password');
  });

  it('shows the disabled state on every control', () => {
    render(<LoginPage disabled />);

    for (const name of [
      'Sign In',
      'Forgot Password?',
      'Continue with Google',
      'Continue with Microsoft',
      'Sign Up',
      'Show password',
    ]) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(screen.getByLabelText('Email or Username')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeDisabled();
  });

  it('reaches every control by keyboard in visual order', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const expected = [
      screen.getByLabelText('Email or Username'),
      screen.getByLabelText('Password'),
      screen.getByRole('button', { name: 'Show password' }),
      screen.getByRole('checkbox', { name: 'Remember me' }),
      screen.getByRole('button', { name: 'Forgot Password?' }),
      screen.getByRole('button', { name: 'Sign In' }),
      screen.getByRole('button', { name: 'Continue with Google' }),
      screen.getByRole('button', { name: 'Continue with Microsoft' }),
      screen.getByRole('button', { name: 'Sign Up' }),
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
    render(<App />);

    await user.type(screen.getByLabelText('Email or Username'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret');
    for (const name of [
      'Sign In',
      'Forgot Password?',
      'Continue with Google',
      'Continue with Microsoft',
      'Sign Up',
    ]) {
      await user.click(screen.getByRole('button', { name }));
    }
    await user.type(screen.getByLabelText('Password'), '{Enter}');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.location.href).toBe(href);
    expect(screen.getByLabelText('Email or Username')).toHaveValue('ada@example.com');
    fetchSpy.mockRestore();
  });
});
