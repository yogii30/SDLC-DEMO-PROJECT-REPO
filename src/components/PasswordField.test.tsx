import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordField } from './PasswordField';

describe('PasswordField', () => {
  it('starts hidden and toggles visibility with an accessible name that tracks state', async () => {
    const user = userEvent.setup();
    render(<PasswordField id="pw" label="Password" />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('keeps what was typed when visibility changes', async () => {
    const user = userEvent.setup();
    render(<PasswordField id="pw" label="Password" />);

    await user.type(screen.getByLabelText('Password'), 's3cret');
    await user.click(screen.getByRole('button', { name: 'Show password' }));

    expect(screen.getByLabelText('Password')).toHaveValue('s3cret');
  });

  it('disables the toggle with the field', () => {
    render(<PasswordField id="pw" label="Password" disabled />);
    expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled();
  });
});
