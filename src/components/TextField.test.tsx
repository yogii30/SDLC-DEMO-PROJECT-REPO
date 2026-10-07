import { render, screen } from '@testing-library/react';
import { TextField } from './TextField';

describe('TextField', () => {
  it('associates the label with the input', () => {
    render(<TextField id="email" label="Email" placeholder="you@example.com" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('placeholder', 'you@example.com');
  });

  it('is valid and undescribed without an error', () => {
    render(<TextField id="email" label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('shows the error style and message, linked to the input', () => {
    render(<TextField id="email" label="Email" error="Enter a valid email" />);
    const input = screen.getByLabelText('Email');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email');
    expect(input.className).toContain('border-red-500');
  });
});
