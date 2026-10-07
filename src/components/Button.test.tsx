import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('defaults to a full-width, non-submitting primary button', () => {
    render(<Button>Go</Button>);
    const button = screen.getByRole('button', { name: 'Go' });

    expect(button).toHaveAttribute('type', 'button');
    expect(button.className).toContain('w-full');
    expect(button.className).toContain('bg-brand-600');
  });

  it('has hover, focus-visible and disabled styles', () => {
    render(<Button disabled>Go</Button>);
    const button = screen.getByRole('button', { name: 'Go' });

    expect(button).toBeDisabled();
    expect(button.className).toMatch(/hover:/);
    expect(button.className).toMatch(/focus-visible:ring/);
    expect(button.className).toMatch(/disabled:/);
  });

  it('renders the secondary variant with an icon', () => {
    render(
      <Button variant="secondary" icon={<svg data-testid="icon" />}>
        Next
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Next' }).className).toContain('border-slate-300');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
