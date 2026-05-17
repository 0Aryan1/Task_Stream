import { useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { NameLogo } from "../components/NameLogo";
import { PROJECT_STATUSES } from "../constants/statuses";

const toMemberIds = (members) => members.map((member) => member.id);

export function ProjectsPage({
  activeProjectId,
  isAdmin,
  onCreateProject,
  onInviteProject,
  onSelectProject,
  onDeleteProject,
  onUpdateProject,
  projects,
  selectedProject,
  team,
}) {
  const [form, setForm] = useState({ name: "", description: "", status: "active", memberIds: [] });
  const [inviteForm, setInviteForm] = useState({ name: "", email: "" });
  const [inviteResult, setInviteResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const memberOptions = team.members;

  const assignedMemberCount = useMemo(
    () => projects.reduce((total, project) => total + project.members.length, 0),
    [projects]
  );

  const toggleMember = (memberId) => {
    setForm((current) => ({
      ...current,
      memberIds: current.memberIds.includes(memberId)
        ? current.memberIds.filter((id) => id !== memberId)
        : [...current.memberIds, memberId],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await onCreateProject(form);
      setForm({ name: "", description: "", status: "active", memberIds: [] });
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    setInviteError("");
    setInviteResult(null);

    if (!selectedProject) {
      setInviteError("Select a project before sending an invitation.");
      return;
    }
    if (!selectedProject.isOwner) {
      setInviteError("Only the project owner can send invitations.");
      return;
    }

    setInviting(true);
    try {
      const invitation = await onInviteProject(selectedProject.id, inviteForm);
      setInviteResult(invitation);
      setInviteForm({ name: "", email: "" });
    } catch (caughtError) {
      setInviteError(caughtError.message);
    } finally {
      setInviting(false);
    }
  };

  const updateAssignment = async (project, memberId) => {
    if (!project.isOwner) return;
    const currentIds = toMemberIds(project.members);
    const memberIds = currentIds.includes(memberId)
      ? currentIds.filter((id) => id !== memberId)
      : [...currentIds, memberId];

    await onUpdateProject(project.id, { memberIds });
  };

  const updateStatus = async (project, status) => {
    if (!project.isOwner) return;
    await onUpdateProject(project.id, { memberIds: toMemberIds(project.members), status });
  };

  const removeProject = async (project) => {
    if (!project.isOwner || !isAdmin) return;
    if (!window.confirm(`Delete "${project.name}" for all members? This will also delete project tasks and invites.`)) {
      return;
    }
    await onDeleteProject(project.id);
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
      <section className="space-y-5">
        <div className="surface h-fit p-5">
        <div className="mb-5">
          <p className="text-2xl font-bold">Project Assignment</p>
          <p className="text-sm text-[var(--muted-text)]">{projects.length} projects, {assignedMemberCount} assigned seats</p>
        </div>

        {isAdmin ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input label="Project Name" value={form.name} onChange={(value) => setForm((state) => ({ ...state, name: value }))} placeholder="Mobile onboarding refresh" />
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[var(--muted-text)]">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))}
                className="field min-h-24"
                placeholder="Scope, goals, or delivery notes"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[var(--muted-text)]">Status</span>
              <select value={form.status} onChange={(event) => setForm((state) => ({ ...state, status: event.target.value }))} className="field">
                {PROJECT_STATUSES.map((status) => (
                  <option key={status.key} value={status.key}>{status.label}</option>
                ))}
              </select>
            </label>

            <div>
              <p className="mb-2 text-sm font-semibold text-[var(--muted-text)]">Assign Members</p>
              <div className="space-y-2">
                {memberOptions.map((member) => (
                  <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] p-3">
                    <input type="checkbox" checked={form.memberIds.includes(member.id)} onChange={() => toggleMember(member.id)} />
                    <NameLogo name={member.name} size="sm" />
                    <span className="font-semibold">{member.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <button disabled={saving} className="primary-button w-full">{saving ? "Saving..." : "Create Project"}</button>
            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          </form>
        ) : (
          <EmptyState>Only admins can create projects and assign members.</EmptyState>
        )}
        </div>

        <div className="surface h-fit p-5">
          <div className="mb-5">
            <p className="text-2xl font-bold">Invite Member</p>
            <p className="text-sm text-[var(--muted-text)]">
              {selectedProject
                ? selectedProject.isOwner
                  ? `Invite into ${selectedProject.name}`
                  : "Only the project owner can send invitations."
                : "Choose a project to invite a member."}
            </p>
          </div>

          {isAdmin ? (
            <form className="space-y-4" onSubmit={handleInvite}>
              <Input label="Name" value={inviteForm.name} onChange={(value) => setInviteForm((state) => ({ ...state, name: value }))} placeholder="Member name" />
              <Input label="Email Address" type="email" value={inviteForm.email} onChange={(value) => setInviteForm((state) => ({ ...state, email: value }))} placeholder="member@company.com" />
              <button disabled={inviting || !selectedProject?.isOwner} className="primary-button w-full">{inviting ? "Preparing invite..." : "Send Invitation"}</button>
              {inviteError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{inviteError}</p> : null}
              {inviteResult ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--control-bg)] p-3 text-sm">
                  <p className="font-semibold">Invitation created for {inviteResult.email}</p>
                  <a href={inviteResult.mailto} className="mt-2 inline-flex font-bold text-[var(--text)] underline">Open email draft</a>
                </div>
              ) : null}
            </form>
          ) : (
            <EmptyState>Only admins can invite project members.</EmptyState>
          )}
        </div>
      </section>

      <section className="space-y-4">
        {projects.length === 0 ? (
          <EmptyState>No projects yet.</EmptyState>
        ) : (
          projects.map((project) => (
            <article key={project.id} className={`surface p-5 ${activeProjectId === project.id ? "ring-2 ring-[var(--button-bg)]" : ""}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-2xl font-bold">{project.name}</p>
                  <p className="mt-1 text-sm text-[var(--muted-text)]">{project.description || "No description added."}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--muted-text)]">
                    Owner: {project.owner?.fullName || "Unknown"} • Progress: {project.progress.doneTasks}/{project.progress.totalTasks} ({project.progress.percent}%)
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => onSelectProject(project.id)} className="secondary-button whitespace-nowrap">
                    {activeProjectId === project.id ? "Selected" : "Switch"}
                  </button>
                  {project.isOwner && isAdmin ? (
                    <button type="button" onClick={() => removeProject(project)} className="secondary-button whitespace-nowrap">
                      Delete
                    </button>
                  ) : null}
                  <select
                    disabled={!project.isOwner}
                    value={project.status}
                    onChange={(event) => updateStatus(project, event.target.value)}
                    className="field max-w-44 py-2 capitalize"
                  >
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status.key} value={status.key}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted-text)]">Members</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {(project.isOwner ? memberOptions : project.members).map((member) => {
                    const assigned = project.members.some((projectMember) => projectMember.id === member.id);
                    return (
                      <label key={member.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border)] p-3">
                        <span className="flex min-w-0 items-center gap-3">
                          <NameLogo name={member.name} size="md" />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{member.name}</span>
                            <span className="block truncate text-sm text-[var(--muted-text)]">{member.role}</span>
                          </span>
                        </span>
                        <input
                          disabled={!project.isOwner}
                          type="checkbox"
                          checked={assigned}
                          onChange={() => updateAssignment(project, member.id)}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
