import { render, screen } from '@testing-library/react';
import { cdp, page, userEvent } from 'vitest/browser';
import '../../index.css';
import { LoginPage } from './LoginPage';

// Real-browser checks for what jsdom cannot measure: visible focus (AC12),
// the rendered Sign In states (AC8) and text contrast (WCAG 1.4.3).

/** Resolve any CSS colour (including oklch) to sRGB by painting it. */
function toRgb(color: string): [number, number, number, number] {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

function contrast(foreground: string, background: string) {
  const luminance = ([r, g, b]: [number, number, number, number]) => {
    const [lr, lg, lb] = [r, g, b].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  };
  const [hi, lo] = [luminance(toRgb(foreground)), luminance(toRgb(background))].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

interface FocusStyle {
  outlineStyle: string;
  outlineWidth: number;
  outlineVisible: boolean;
  boxShadow: string;
}

function focusStyle(el: Element): FocusStyle {
  const style = getComputedStyle(el);
  const outlineWidth = Number.parseFloat(style.outlineWidth);
  return {
    outlineStyle: style.outlineStyle,
    outlineWidth,
    outlineVisible:
      style.outlineStyle !== 'none' && outlineWidth > 0 && toRgb(style.outlineColor)[3] > 0,
    boxShadow: style.boxShadow,
  };
}

const controls = () => [
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

let noTransitions: HTMLStyleElement;

beforeAll(() => {
  // Read end states, not mid-transition values.
  noTransitions = document.createElement('style');
  noTransitions.textContent = '*,*::before,*::after{transition:none!important}';
  document.head.append(noTransitions);
});

afterAll(() => noTransitions.remove());

beforeEach(async () => {
  await page.viewport(1280, 800);
});

describe('LoginForm accessibility (real browser)', () => {
  it('AC12: every control shows a visible focus indicator when reached by keyboard', async () => {
    render(<LoginPage />);
    const elements = controls();
    const unfocused = elements.map(focusStyle);

    for (const [index, element] of elements.entries()) {
      await userEvent.tab();
      expect(element).toHaveFocus();
      const focused = focusStyle(element);
      const name = element.getAttribute('aria-label') ?? (element.textContent || element.id);

      const ringAppeared =
        focused.boxShadow !== 'none' && focused.boxShadow !== unfocused[index]!.boxShadow;
      expect(focused.outlineVisible || ringAppeared, `${name} has no visible focus`).toBe(true);
    }
  });

  it('AC12: focus stays visible in forced-colors mode, where box-shadow rings are dropped', async () => {
    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'forced-colors', value: 'active' }],
    });
    try {
      expect(matchMedia('(forced-colors: active)').matches).toBe(true);
      render(<LoginPage />);

      for (const element of controls()) {
        await userEvent.tab();
        expect(element).toHaveFocus();
        const { outlineStyle, outlineWidth } = focusStyle(element);
        const name = element.getAttribute('aria-label') ?? (element.textContent || element.id);
        expect(outlineStyle, `${name} has no outline in forced-colors mode`).not.toBe('none');
        expect(outlineWidth, `${name} has no outline in forced-colors mode`).toBeGreaterThan(0);
      }
    } finally {
      await cdp().send('Emulation.setEmulatedMedia', { features: [] });
    }
  });

  it('AC12: the native checkbox uses a painted outline, not only a ring', async () => {
    render(<LoginPage />);
    const checkbox = screen.getByRole('checkbox', { name: 'Remember me' });
    while (document.activeElement !== checkbox) await userEvent.tab();

    expect(focusStyle(checkbox).outlineVisible).toBe(true);
  });

  it('AC8: Sign In default, hover, keyboard-focus and disabled styles are visibly distinct', async () => {
    const { unmount } = render(<LoginPage />);
    const signIn = screen.getByRole('button', { name: 'Sign In' });
    const background = () => getComputedStyle(signIn).backgroundColor;

    const idle = background();
    const idleShadow = getComputedStyle(signIn).boxShadow;
    await userEvent.hover(signIn);
    const hovered = background();
    expect(hovered).not.toBe(idle);
    await userEvent.unhover(signIn);

    while (document.activeElement !== signIn) await userEvent.tab();
    // The button has a resting shadow, so the focus ring must change it, not merely exist.
    expect(getComputedStyle(signIn).boxShadow).not.toBe(idleShadow);
    unmount();

    render(<LoginPage disabled />);
    const disabled = getComputedStyle(screen.getByRole('button', { name: 'Sign In' }));
    expect(disabled.backgroundColor).not.toBe(idle);
    expect(disabled.backgroundColor).not.toBe(hovered);
    expect(disabled.cursor).toBe('not-allowed');
  });

  it('WCAG 1.4.3: the OR divider and the placeholders meet 4.5:1 on the card', () => {
    render(<LoginPage />);
    const card = screen.getByRole('form', { name: 'Sign in' }).parentElement!;
    const cardBackground = getComputedStyle(card).backgroundColor;

    const or = screen.getByRole('separator', { name: 'or' }).querySelector('span:nth-child(2)')!;
    expect(contrast(getComputedStyle(or).color, cardBackground)).toBeGreaterThanOrEqual(4.5);

    for (const label of ['Email or Username', 'Password']) {
      const placeholder = getComputedStyle(screen.getByLabelText(label), '::placeholder').color;
      expect(contrast(placeholder, 'rgb(255, 255, 255)')).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('AC7/AC10: Forgot Password? and Sign Up look like links and underline on hover', async () => {
    render(<LoginPage />);
    const body = getComputedStyle(screen.getByText(/Don't have an account\?/)).color;

    for (const name of ['Forgot Password?', 'Sign Up']) {
      const link = screen.getByRole('button', { name });
      const style = () => getComputedStyle(link);

      expect(style().backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(style().color).not.toBe(body);
      expect(style().textDecorationLine).toBe('none');
      await userEvent.hover(link);
      expect(style().textDecorationLine).toBe('underline');
      await userEvent.unhover(link);
    }
  });
});
