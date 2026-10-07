import { render } from '@testing-library/react';
import { page } from 'vitest/browser';
import '../../index.css';
import { LoginPage } from './LoginPage';

// WCAG 2.1 SC 1.4.3: every visible piece of text on the page, at every layout, against its real
// background. Text over the brand gradient is measured against each gradient colour (worst case).
// Disabled controls are exempt under 1.4.3, so the page is checked in its enabled state.

const COLOR = /(?:oklch|oklab|rgba?|hsla?|color)\([^()]*\)/g;

/** Resolve any CSS colour (including oklch) to sRGB by painting it. */
function toRgb(color: string): [number, number, number, number] {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

function luminance(color: string) {
  const [r, g, b] = toRgb(color).map((c, i) => (i < 3 ? c / 255 : c)) as [number, number, number];
  const [lr, lg, lb] = [r, g, b].map((s) =>
    s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** The colours behind an element: its nearest opaque background, or every stop of a gradient. */
function backgrounds(el: Element): string[] {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.backgroundImage.includes('gradient')) {
      return style.backgroundImage.match(COLOR) ?? [];
    }
    if (toRgb(style.backgroundColor)[3] > 0) return [style.backgroundColor];
  }
  return ['rgb(255, 255, 255)'];
}

function visibleTextElements() {
  const elements = new Set<Element>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || !node.textContent?.trim()) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || el.closest('[aria-hidden="true"]')) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    elements.add(el);
  }
  return [...elements];
}

describe.each([
  ['desktop', 1280, 800],
  ['tablet', 900, 1000],
  ['mobile', 375, 812],
])('WCAG 1.4.3 text contrast on %s', (_name, width, height) => {
  it('every visible text meets 4.5:1 against its background', async () => {
    await page.viewport(width, height);
    render(<LoginPage />);

    const failures = visibleTextElements().flatMap((el) => {
      const color = getComputedStyle(el).color;
      const worst = Math.min(...backgrounds(el).map((bg) => ratio(color, bg)));
      return worst < 4.5 ? [`"${el.textContent?.trim()}" ${worst.toFixed(2)}:1`] : [];
    });

    expect(visibleTextElements().length).toBeGreaterThan(10);
    expect(failures).toEqual([]);
  });
});
