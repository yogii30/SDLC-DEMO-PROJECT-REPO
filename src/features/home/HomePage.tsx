import { useEffect, useRef } from 'react';

export interface HomePageProps {
  username: string;
}

/** Placeholder page users land on after signing in (SDLC-47). */
export function HomePage({ username }: HomePageProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  // Move focus to the new page, so keyboard and screen-reader users start here after signing in.
  useEffect(() => heading.current?.focus(), []);

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-100 px-5 py-10">
      <div className="w-full max-w-md rounded-card bg-white p-8 text-center shadow-[0_1px_3px_rgb(15_23_42/0.06),0_8px_24px_rgb(15_23_42/0.06)]">
        <h1
          ref={heading}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight text-slate-900 focus:outline-hidden"
        >
          You are signed in
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Signed in as <span className="font-medium text-slate-900">{username}</span>.
        </p>
      </div>
    </main>
  );
}
