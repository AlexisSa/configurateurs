import type { ReactNode } from "react";

export function Heading({
  children,
  level = 1,
  className = "",
}: {
  children: ReactNode;
  level?: 1 | 2 | 3;
  className?: string;
}) {
  const sizes = {
    1: "text-3xl font-semibold tracking-tight",
    2: "text-xl font-semibold",
    3: "text-lg font-medium",
  } as const;
  const classes = `${sizes[level]} text-zinc-900 ${className}`;

  if (level === 1) return <h1 className={classes}>{children}</h1>;
  if (level === 2) return <h2 className={classes}>{children}</h2>;
  return <h3 className={classes}>{children}</h3>;
}

export function Text({
  children,
  muted = false,
  className = "",
}: {
  children: ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <p className={`${muted ? "text-zinc-500" : "text-zinc-700"} ${className}`}>
      {children}
    </p>
  );
}
