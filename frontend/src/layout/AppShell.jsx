import { classNames } from "../utils/classNames";
import { NameLogo } from "../components/NameLogo";

const navItems = [
  ["dashboard", "Dashboard"],
  ["projects", "Projects"],
  ["tasks", "Tasks"],
  ["team", "Team"],
];

export function AppShell({
  activeProjectId,
  children,
  currentTab,
  greeting,
  onProjectChange,
  onSignOut,
  onTabChange,
  onToggleTheme,
  projects,
  theme,
  user,
}) {
  return (
    <div className="flex min-h-screen bg-[var(--app-bg)] text-[var(--text)]">
      <aside className="sidebar">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight">TaskStream</h2>
          <p className="text-xl text-[var(--muted-text)]">Productivity Hub</p>
        </div>

        <nav className="mt-8 space-y-2">
          {navItems.map(([key, label]) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={classNames("nav-button", currentTab === key && "nav-button-active")}
            >
              {label}
            </button>
          ))}
        </nav>

        <label className="mt-6 block space-y-2">
          <span className="text-sm font-semibold text-[var(--muted-text)]">Project</span>
          <select value={activeProjectId} onChange={(event) => onProjectChange(event.target.value)} className="field py-2">
            <option value="">All Workspace</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>

        <div className="mt-auto space-y-3 pt-8">
          <button onClick={onToggleTheme} className="secondary-button w-full">
            {theme === "light" ? "Dark Theme" : "Light Theme"}
          </button>
          <button onClick={onSignOut} className="secondary-button w-full">Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-8">
        <header className="page-header">
          <p className="min-w-0 text-3xl font-extrabold tracking-tight md:text-5xl">{greeting}</p>
          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right">
              <p className="font-bold">{user.fullName}</p>
              <p className="text-sm text-[var(--muted-text)]">{user.role}</p>
            </div>
            <NameLogo name={user.fullName} size="xl" />
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
