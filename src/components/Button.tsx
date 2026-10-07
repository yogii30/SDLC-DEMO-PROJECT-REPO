import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary';

const base =
  'inline-flex w-full items-center justify-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-semibold ' +
  'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 ' +
    'disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 ' +
    'active:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-400',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  icon,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[base, variants[variant], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
