import type { FormEvent } from 'react';
import { Button } from '../../components/Button';
import { GoogleIcon, MicrosoftIcon } from '../../components/icons';
import { PasswordField } from '../../components/PasswordField';
import { TextField } from '../../components/TextField';

export interface LoginFormErrors {
  identifier?: string;
  password?: string;
}

export interface LoginFormProps {
  /** Shows the form's disabled state. */
  disabled?: boolean;
  /** Field error messages, shown with the input error style. */
  errors?: LoginFormErrors;
}

const linkClasses =
  'rounded-sm font-medium text-brand-600 underline-offset-2 transition-colors hover:text-brand-700 ' +
  'hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 ' +
  'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-slate-400';

// UI only (SDLC-39): submitting, signing in and every link are intentionally inert.
const preventSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

export function LoginForm({ disabled = false, errors = {} }: LoginFormProps) {
  return (
    <div className="w-full rounded-card bg-white p-6 shadow-[0_1px_3px_rgb(15_23_42/0.06),0_8px_24px_rgb(15_23_42/0.06)] sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Sign in</h2>
        <p className="mt-1 text-sm text-slate-500">Enter your details to access your account.</p>
      </div>

      <form noValidate onSubmit={preventSubmit} aria-label="Sign in" className="space-y-5">
        <TextField
          id="identifier"
          name="identifier"
          label="Email or Username"
          placeholder="Enter your email or username"
          autoComplete="username"
          disabled={disabled}
          error={errors.identifier}
        />

        <PasswordField
          id="password"
          name="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          disabled={disabled}
          error={errors.password}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 has-disabled:cursor-not-allowed">
            <input
              type="checkbox"
              name="remember"
              disabled={disabled}
              className="size-4 cursor-pointer accent-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed"
            />
            Remember me
          </label>
          <button type="button" disabled={disabled} className={`text-sm ${linkClasses}`}>
            Forgot password?
          </button>
        </div>

        <Button type="submit" disabled={disabled}>
          Sign in
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3" role="separator" aria-label="or">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium tracking-wider text-slate-500 uppercase">OR</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-3">
        <Button variant="secondary" disabled={disabled} icon={<GoogleIcon className="size-5" />}>
          Continue with Google
        </Button>
        <Button variant="secondary" disabled={disabled} icon={<MicrosoftIcon className="size-5" />}>
          Continue with Microsoft
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <button type="button" disabled={disabled} className={linkClasses}>
          Sign up
        </button>
      </p>
    </div>
  );
}
