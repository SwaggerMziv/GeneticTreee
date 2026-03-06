"use client";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 shadow-pastel ${className}`}
    >
      {children}
    </div>
  );
}
