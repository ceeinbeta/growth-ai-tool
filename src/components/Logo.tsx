export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
        <path
          d="M20.86 10.44 A9 9 0 1 1 13.56 3.14"
          fill="none"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="18.4" cy="5.6" r="1.9" className="fill-signal" />
      </svg>
      <span className="font-display text-xl font-extrabold tracking-tight text-foreground">growloop</span>
    </span>
  );
}
