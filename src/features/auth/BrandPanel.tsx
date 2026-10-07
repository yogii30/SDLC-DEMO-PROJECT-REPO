import { LogoMark } from '../../components/icons';

export const APP_NAME = 'Payments';

/** Abstract network illustration: connected nodes over soft concentric rings. */
function NetworkIllustration({ className }: { className?: string }) {
  const nodes = [
    [60, 70],
    [150, 40],
    [240, 85],
    [95, 160],
    [200, 165],
    [150, 245],
    [270, 230],
    [40, 240],
  ] as const;
  const links: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [1, 2],
    [0, 3],
    [1, 3],
    [1, 4],
    [2, 4],
    [3, 4],
    [3, 5],
    [4, 5],
    [4, 6],
    [5, 6],
    [3, 7],
    [5, 7],
  ];

  return (
    <svg viewBox="0 0 310 290" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="brand-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="155" cy="145" r="140" fill="url(#brand-glow)" />
      {[120, 90, 60].map((r) => (
        <circle
          key={r}
          cx="155"
          cy="145"
          r={r}
          fill="none"
          stroke="#c7d2fe"
          strokeOpacity="0.25"
          strokeDasharray="3 6"
        />
      ))}
      {links.map(([a, b]) => {
        const [x1, y1] = nodes[a]!;
        const [x2, y2] = nodes[b]!;
        return (
          <line
            key={`${a}-${b}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#e0e7ff"
            strokeOpacity="0.45"
            strokeWidth="1.5"
          />
        );
      })}
      {nodes.map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="11" fill="#818cf8" fillOpacity="0.25" />
          <circle cx={cx} cy={cy} r={i === 4 ? 7 : 5} fill={i === 4 ? '#ffffff' : '#c7d2fe'} />
        </g>
      ))}
      <rect
        x="118"
        y="112"
        width="74"
        height="66"
        rx="14"
        fill="#ffffff"
        fillOpacity="0.12"
        stroke="#ffffff"
        strokeOpacity="0.4"
      />
      <path
        d="M140 157 155 131l15 26"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandPanel() {
  return (
    <section
      aria-labelledby="brand-heading"
      className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 text-white md:flex md:flex-col md:justify-between md:p-10 lg:p-14"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand-500/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-indigo-400/20 blur-3xl"
      />

      <div className="relative flex items-center gap-3">
        <LogoMark className="size-9 text-white/15" />
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
      </div>

      <div className="relative flex flex-1 items-center justify-center py-8">
        <NetworkIllustration className="w-56 lg:w-80" />
      </div>

      <div className="relative max-w-md">
        <h1 id="brand-heading" className="text-3xl font-semibold tracking-tight lg:text-4xl">
          Welcome Back!
        </h1>
        <p className="mt-3 text-base text-brand-100 lg:text-lg">
          Sign in to continue to your workspace.
        </p>
      </div>
    </section>
  );
}
