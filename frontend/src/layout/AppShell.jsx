import { useState } from "react";
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
  invitations,
  pendingInvitationsCount,
  onProjectChange,
  onRespondInvitation,
  onSignOut,
  onTabChange,
  onToggleTheme,
  projects,
  theme,
  user,
}) {
  const [respondingInvitationId, setRespondingInvitationId] = useState("");
  const [invitationError, setInvitationError] = useState("");
  const [showInvitations, setShowInvitations] = useState(false);

  const respondToInvitation = async (invitationId, decision) => {
    setInvitationError("");
    setRespondingInvitationId(invitationId);
    try {
      await onRespondInvitation(invitationId, decision);
    } catch (caughtError) {
      setInvitationError(caughtError.message);
    } finally {
      setRespondingInvitationId("");
      setShowInvitations(false);
    }
  };

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
              className={classNames(
                "nav-button flex items-center justify-between",
                currentTab === key && "nav-button-active"
              )}
            >
              <span>{label}</span>
              {key === "projects" && pendingInvitationsCount > 0 ? (
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
                  {pendingInvitationsCount}
                </span>
              ) : null}
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
          <button onClick={onSignOut} className="secondary-button w-full">Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-8">
        <header className="page-header">
          <p className="min-w-0 text-3xl font-extrabold tracking-tight md:text-5xl">{greeting}</p>
          <div className="relative flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInvitations((current) => !current)}
              className="secondary-button relative px-3 py-2 text-sm"
            >
              Invitations
              {pendingInvitationsCount > 0 ? (
                <span className="absolute -right-2 -top-2 rounded-full bg-rose-600 px-1.5 py-0.5 text-xs font-bold text-white">
                  {pendingInvitationsCount}
                </span>
              ) : null}
            </button>
            <button onClick={onToggleTheme} className="secondary-button px-3 py-2 text-sm">
              {theme === "light" ? "Dark Theme" : "Light Theme"}
            </button>
            <div className="text-right">
              <p className="font-bold">{user.fullName}</p>
              <p className="text-sm text-[var(--muted-text)]">{user.role}</p>
            </div>
            <NameLogo name={user.fullName} size="xl" />
            {showInvitations ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 shadow-lg">
                <p className="mb-2 text-sm font-bold">Project Invitations</p>
                {invitations.length === 0 ? (
                  <p className="rounded-md border border-dashed border-[var(--border)] bg-[var(--empty-bg)] px-2 py-2 text-xs text-[var(--muted-text)]">
                    No pending invites
                  </p>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {invitations.map((invitation) => (
                      <div key={invitation.id} className="rounded-md border border-[var(--border)] p-2">
                        <p className="truncate text-xs font-semibold">{invitation.projectName}</p>
                        <p className="truncate text-xs text-[var(--muted-text)]">
                          By {invitation.inviterName || "Teammate"}
                        </p>
                        <div className="mt-2 flex gap-1">
                          <button
                            type="button"
                            className="primary-button px-2 py-1 text-xs"
                            disabled={respondingInvitationId === invitation.id}
                            onClick={() => respondToInvitation(invitation.id, "accept")}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="secondary-button px-2 py-1 text-xs"
                            disabled={respondingInvitationId === invitation.id}
                            onClick={() => respondToInvitation(invitation.id, "reject")}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {invitationError ? <p className="mt-2 text-xs text-rose-600">{invitationError}</p> : null}
              </div>
            ) : null}
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
