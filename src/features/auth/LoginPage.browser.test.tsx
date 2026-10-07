import { render, screen } from '@testing-library/react';
import { page } from 'vitest/browser';
import '../../index.css';
import { LoginPage } from './LoginPage';

// Runs in real Chrome with the real Tailwind CSS: covers the layout and visual
// acceptance criteria (AC1-AC4) that jsdom cannot evaluate.

const px = (value: string) => Number.parseFloat(value);

function layout() {
  // Hidden below md, where it also loses its accessible name, so find it by its label reference.
  const brand = document.querySelector<HTMLElement>('section[aria-labelledby="brand-heading"]')!;
  const main = screen.getByRole('main');
  const form = screen.getByRole('form', { name: 'Sign in' });
  const card = form.parentElement!;
  const mobileHeader = main.querySelector<HTMLElement>('.md\\:hidden')!;
  const illustration = brand.querySelector<SVGElement>('svg[viewBox="0 0 310 290"]')!;
  return { brand, main, card, mobileHeader, illustration };
}

const isDisplayed = (el: Element) => getComputedStyle(el).display !== 'none';

function hasNoHorizontalScroll() {
  const root = document.documentElement;
  return root.scrollWidth <= root.clientWidth;
}

/** Lightness of an oklch()/rgb() colour, 0-1. */
function lightness(color: string) {
  const oklch = /oklch\(([\d.]+)%?/.exec(color);
  if (oklch) {
    const l = Number(oklch[1]);
    return l > 1 ? l / 100 : l;
  }
  const [r = 0, g = 0, b = 0] = (color.match(/[\d.]+/g) ?? []).map(Number);
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255;
}

describe('LoginPage layout (real browser)', () => {
  it('AC1: desktop shows a ~50/50 split with the brand panel left and the card right', async () => {
    await page.viewport(1280, 800);
    render(<LoginPage />);
    const { brand, main, card, mobileHeader, illustration } = layout();

    expect(isDisplayed(brand)).toBe(true);
    expect(isDisplayed(mobileHeader)).toBe(false);

    const brandBox = brand.getBoundingClientRect();
    const mainBox = main.getBoundingClientRect();
    expect(brandBox.left).toBe(0);
    expect(Math.abs(brandBox.width - mainBox.width)).toBeLessThanOrEqual(1);
    expect(mainBox.left).toBeCloseTo(brandBox.right, 0);
    expect(card.getBoundingClientRect().left).toBeGreaterThan(brandBox.right);

    expect(px(getComputedStyle(brand).paddingLeft)).toBe(56);
    expect(illustration.getBoundingClientRect().width).toBe(320);
    expect(getComputedStyle(brand).backgroundImage).toContain('linear-gradient');
    expect(hasNoHorizontalScroll()).toBe(true);
  });

  it('AC2: tablet keeps both panels with reduced spacing and a smaller illustration', async () => {
    await page.viewport(900, 1000);
    render(<LoginPage />);
    const { brand, main, mobileHeader, illustration } = layout();

    expect(isDisplayed(brand)).toBe(true);
    expect(isDisplayed(main)).toBe(true);
    expect(isDisplayed(mobileHeader)).toBe(false);
    expect(Math.abs(brand.offsetWidth - main.offsetWidth)).toBeLessThanOrEqual(1);

    expect(px(getComputedStyle(brand).paddingLeft)).toBe(40);
    expect(px(getComputedStyle(main).paddingLeft)).toBe(32);
    expect(illustration.getBoundingClientRect().width).toBe(224);
    expect(hasNoHorizontalScroll()).toBe(true);
  });

  it('AC3: mobile hides the illustration and centres the card with 20px gutters', async () => {
    await page.viewport(375, 812);
    render(<LoginPage />);
    const { brand, main, card, mobileHeader } = layout();

    expect(isDisplayed(brand)).toBe(false);
    expect(isDisplayed(mobileHeader)).toBe(true);

    const cardBox = card.getBoundingClientRect();
    expect(px(getComputedStyle(main).paddingLeft)).toBe(20);
    expect(cardBox.left).toBe(20);
    expect(375 - cardBox.right).toBe(20);
    expect(hasNoHorizontalScroll()).toBe(true);
  });

  it('AC3: stays within the viewport at the narrowest common width (320px)', async () => {
    await page.viewport(320, 700);
    render(<LoginPage />);
    const { card } = layout();

    expect(card.getBoundingClientRect().right).toBeLessThanOrEqual(320 - 20);
    expect(hasNoHorizontalScroll()).toBe(true);
  });

  it('AC4: white card with 10-14px radius and a subtle shadow on a light gray background', async () => {
    await page.viewport(1280, 800);
    render(<LoginPage />);
    const { main, card } = layout();
    const cardStyle = getComputedStyle(card);
    const pageBackground = getComputedStyle(main.parentElement!).backgroundColor;

    expect(cardStyle.backgroundColor).toBe('rgb(255, 255, 255)');
    const radius = px(cardStyle.borderTopLeftRadius);
    expect(radius).toBeGreaterThanOrEqual(10);
    expect(radius).toBeLessThanOrEqual(14);

    expect(cardStyle.boxShadow).not.toBe('none');
    const shadowAlphas = (
      cardStyle.boxShadow.match(/\/\s*([\d.]+)\)|rgba\([^)]*,\s*([\d.]+)\)/g) ?? []
    )
      .map((m) => Number(/([\d.]+)\)$/.exec(m)?.[1]))
      .filter((n) => !Number.isNaN(n));
    expect(shadowAlphas.length).toBeGreaterThan(0);
    expect(Math.max(...shadowAlphas)).toBeLessThanOrEqual(0.1);

    expect(pageBackground).not.toBe('rgb(255, 255, 255)');
    expect(lightness(pageBackground)).toBeGreaterThan(0.9);
  });
});
