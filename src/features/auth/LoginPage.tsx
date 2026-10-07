import { LogoMark } from '../../components/icons';
import { APP_NAME, BrandPanel } from './BrandPanel';
import { LoginForm, type LoginFormProps } from './LoginForm';

export function LoginPage(props: LoginFormProps) {
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
              Welcome Back!
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">Sign in to continue to your workspace.</p>
          </div>

          <LoginForm {...props} />
        </div>
      </main>
    </div>
  );
}
