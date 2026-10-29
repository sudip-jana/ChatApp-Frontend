import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Avatar({ name, size = 40, online }: { name: string; size?: number; online?: boolean }) {
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white"
        style={{ background: `hsl(${hue} 42% 40%)`, fontSize: size * 0.4 }}
        aria-hidden
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
      {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-live" title="Online" />}
    </span>
  );
}

export function Button({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

export function IconButton({ label, children, ...p }: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} aria-label={label} title={label} className="rounded-xl p-2 text-muted transition-colors hover:bg-sunken hover:text-ink">
      {children}
    </button>
  );
}
