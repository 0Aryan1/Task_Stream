export function Input({ label, onChange, ...props }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-[var(--muted-text)]">{label}</span>
      <input
        {...props}
        onChange={(event) => onChange?.(event.target.value)}
        className="field"
      />
    </label>
  );
}
