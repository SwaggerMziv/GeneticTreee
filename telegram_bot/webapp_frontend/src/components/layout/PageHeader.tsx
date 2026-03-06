"use client";

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="shrink-0 border-b border-border bg-card px-4 py-3">
      <h1 className="font-heading text-base font-semibold">{title}</h1>
      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
