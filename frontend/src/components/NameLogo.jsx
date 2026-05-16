const getFirstName = (name = "") => name.trim().split(/\s+/)[0] || "User";

export function NameLogo({ name, size = "md" }) {
  const firstName = getFirstName(name);
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-10 w-10 text-sm",
    xl: "h-12 w-12 text-base",
  };

  return (
    <span
      aria-label={firstName}
      title={firstName}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--button-bg)] font-extrabold uppercase text-[var(--button-text)] ${sizes[size]}`}
    >
      {firstName.slice(0, 2)}
    </span>
  );
}
