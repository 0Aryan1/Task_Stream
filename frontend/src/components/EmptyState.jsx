export function EmptyState({ children }) {
  return <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-4 text-sm text-[var(--muted-text)]">{children}</div>;
}
