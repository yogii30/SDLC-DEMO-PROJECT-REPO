import type { InputHTMLAttributes, ReactNode } from 'react';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  error?: string;
  /** Content rendered inside the input's right edge, such as a visibility toggle. */
  trailing?: ReactNode;
}

const inputClasses = (hasError: boolean, hasTrailing: boolean) =>
  [
    'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs',
    'placeholder:text-slate-400 transition-colors duration-150',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
    hasTrailing ? 'pr-11' : '',
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
      : 'border-slate-300 hover:border-slate-400 focus:border-brand-500 focus:ring-brand-200',
  ].join(' ');

export function TextField({ id, label, error, trailing, className, ...rest }: TextFieldProps) {
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          className={inputClasses(hasError, Boolean(trailing))}
          {...rest}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{trailing}</div>
        )}
      </div>
      {hasError && (
        <p id={errorId} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
