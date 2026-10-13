import { useRef, useState } from 'react';
import { LogoMark } from '../../components/icons';
import { login, type Session } from './api';
import { APP_NAME, BrandPanel } from './BrandPanel';
import {
  LoginForm,
  type LoginFormErrors,
  type LoginFormProps,
  type LoginValues,
} from './LoginForm';

export interface LoginPageProps extends Pick<LoginFormProps, 'disabled' | 'errors'> {
  /** Called once the login API accepts the credentials. */
  onSignedIn?: (session: Session) => void;
}

function validate({ username, password }: LoginValues): LoginFormErrors {
  return {
    ...(!username.trim() && { username: 'Enter your username.' }),
    ...(!password && { password: 'Enter your password.' }),
  };
}

export function LoginPage({ disabled, errors, onSignedIn }: LoginPageProps) {
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);
  // Guards against a second submit before React has re-rendered the disabled button.
  const inFlight = useRef(false);

  async function signIn(values: LoginValues) {
    if (inFlight.current) return;
    const invalid = validate(values);
    setFieldErrors(invalid);
    setFormError(undefined);
    if (invalid.username || invalid.password) return;

    inFlight.current = true;
    setLoading(true);
    const result = await login(values.username.trim(), values.password);
    inFlight.current = false;
    setLoading(false);

    if (result.ok) onSignedIn?.(result.session);
    else setFormError(result.message);
  }

  return (
    <div className="grid min-h-dvh overflow-x-hidden bg-slate-100 md:grid-cols-2">
      <BrandPanel />

      <main className="flex items-center justify-center px-5 py-10 sm:px-6 md:px-8 lg:px-16">
        <div className="w-full max-w-md">
          {/* Below md the brand panel is hidden; keep a compact brand header instead. */}
          <div className="mb-8 text-center md:hidden">
            <div className="inline-flex items-center gap-2.5 text-brand-600">
              <LogoMark className="size-9" />
              <span className="text-lg font-semibold tracking-tight text-slate-900">
                {APP_NAME}
              </span>
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
              Welcome back!
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">Sign in to continue to your workspace.</p>
          </div>

          <LoginForm
            disabled={disabled}
            errors={errors ?? fieldErrors}
            loading={loading}
            formError={formError}
            onSubmit={(values) => void signIn(values)}
          />
        </div>
      </main>
    </div>
  );
}
