import { useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { TASK_STATUSES } from "../constants/statuses";

const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];

const emptyTaskForm = {
  title: "",
  subtitle: "",
  status: "todo",
  priority: "normal",
  assigneeMemberId: "",
  dueDate: "",
  estimateHours: 0,
};

const priorityClasses = {
  low: "bg-sky-100 text-sky-700",
  normal: "bg-slate-200 text-slate-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-rose-100 text-rose-700",
};

export function TasksPage({
  activeProjectId,
  selectedProject,
  onAddComment,
  onCreateTask,
  onDeleteTask,
  onUpdateStatus,
  onUpdateTask,
  projects,
  tasks,
  user,
}) {
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});

  const assignableMembers = selectedProject?.members || [];
  const canAssignInSelectedProject = Boolean(selectedProject?.isOwner);
  const taskColumns = tasks?.tasks || { todo: [], progress: [], qa: [], done: [] };
  const allTasks = useMemo(() => tasks?.allTasks || [], [tasks]);
  const dependencyOptions = useMemo(() => allTasks.filter((task) => task.id !== selectedTask?.id), [allTasks, selectedTask?.id]);
  const editProject = useMemo(
    () => projects.find((project) => project.id === selectedTask?.projectId) || null,
    [projects, selectedTask?.projectId]
  );
  const editAssignableMembers = editProject?.members || [];

  const handleCreateTask = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onCreateTask({
        ...taskForm,
        assignee: assignableMembers.find((member) => member.id === taskForm.assigneeMemberId)?.name || "",
        projectId: activeProjectId,
      });
      setTaskForm(emptyTaskForm);
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setEditForm({
      title: task.title,
      subtitle: task.subtitle || "",
      status: task.status,
      priority: task.priority,
      assigneeMemberId: task.assignedToMemberId || "",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      labels: (task.labels || []).join(", "),
      sprint: task.sprint || "",
      milestone: task.milestone || "",
      epic: task.epic || "",
      estimateHours: task.estimateHours || 0,
      trackedMinutes: task.trackedMinutes || 0,
      subtasks: (task.subtasks || []).map((subtask) => ({ ...subtask })),
      dependencies: (task.dependencies || []).map((dependency) => dependency.id),
      attachments: (task.attachments || []).join(", "),
      logMinutes: 0,
    });
  };

  const closeEditModal = () => {
    setSelectedTask(null);
    setEditForm(null);
  };

  const submitTaskUpdate = async (event) => {
    event.preventDefault();
    if (!selectedTask || !editForm) return;
    setSaving(true);
    setError("");
    try {
      await onUpdateTask(selectedTask.id, {
        ...editForm,
        assignee: editAssignableMembers.find((member) => member.id === editForm.assigneeMemberId)?.name || "",
        labels: editForm.labels
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean),
        attachments: editForm.attachments
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      closeEditModal();
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setSaving(false);
    }
  };

  const removeTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    setError("");
    try {
      await onDeleteTask(taskId);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const moveTask = async (taskId, nextStatus) => {
    setError("");
    try {
      await onUpdateStatus(taskId, nextStatus);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const dropOnColumn = async (event, nextStatus) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/task-id");
    if (!taskId) return;
    await moveTask(taskId, nextStatus);
  };

  const addComment = async (taskId) => {
    const draft = String(commentDrafts[taskId] || "").trim();
    if (!draft) return;
    setError("");
    try {
      await onAddComment(taskId, draft);
      setCommentDrafts((current) => ({ ...current, [taskId]: "" }));
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface p-5">
        <p className="text-2xl font-bold">Create Task</p>

        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleCreateTask}>
          <Input
            label="Title"
            value={taskForm.title}
            onChange={(value) => setTaskForm((current) => ({ ...current, title: value }))}
          />
          <Input
            label="Description"
            value={taskForm.subtitle}
            onChange={(value) => setTaskForm((current) => ({ ...current, subtitle: value }))}
          />
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--muted-text)]">Assignee</span>
            <select
              value={taskForm.assigneeMemberId}
              onChange={(event) => setTaskForm((current) => ({ ...current, assigneeMemberId: event.target.value }))}
              className="field"
              disabled={!activeProjectId || !canAssignInSelectedProject}
            >
              <option value="">
                {!activeProjectId ? "Select project first" : canAssignInSelectedProject ? "Unassigned" : "Only project owner can assign"}
              </option>
              {assignableMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.name} ({member.role})</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--muted-text)]">Status</span>
            <select
              value={taskForm.status}
              onChange={(event) => setTaskForm((current) => ({ ...current, status: event.target.value }))}
              className="field"
            >
              {TASK_STATUSES.map((status) => (
                <option key={status.key} value={status.key}>{status.label}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--muted-text)]">Priority</span>
            <select
              value={taskForm.priority}
              onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value }))}
              className="field capitalize"
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority} className="capitalize">{priority}</option>
              ))}
            </select>
          </label>
          <Input
            label="Due Date"
            type="date"
            value={taskForm.dueDate}
            onChange={(value) => setTaskForm((current) => ({ ...current, dueDate: value }))}
          />
          <Input
            label="Estimate Hours"
            type="number"
            min={0}
            step={0.5}
            value={taskForm.estimateHours}
            onChange={(value) => setTaskForm((current) => ({ ...current, estimateHours: Number(value || 0) }))}
          />
          <div className="md:col-span-2 xl:col-span-3">
            <button className="primary-button" disabled={saving}>{saving ? "Saving..." : "Create Task"}</button>
          </div>
        </form>
      </section>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {TASK_STATUSES.map((column) => (
          <section
            key={column.key}
            className="rounded-lg border border-[var(--border)] bg-[var(--column-bg)] p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => dropOnColumn(event, column.key)}
          >
            <p className="mb-3 flex items-center justify-between text-lg font-bold">
              {column.label}
              <span className="rounded-full bg-[var(--pill-bg)] px-2 text-sm">{taskColumns[column.key]?.length || 0}</span>
            </p>

            <div className="space-y-3">
              {(taskColumns[column.key] || []).length === 0 ? (
                <EmptyState>No tasks</EmptyState>
              ) : (
                (taskColumns[column.key] || []).map((task) => (
                  <article
                    key={task.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/task-id", task.id);
                    }}
                    className="surface space-y-3 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--pill-bg)] px-2 py-1 text-xs font-bold uppercase">{task.tag}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${priorityClasses[task.priority] || priorityClasses.normal}`}>
                        {task.priority}
                      </span>
                    </div>

                    <div>
                      <p className="text-lg font-bold">{task.title}</p>
                      <p className="text-sm text-[var(--muted-text)]">{task.subtitle || "No description"}</p>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p>Reporter: <span className="font-semibold">{task.reporterName || user.fullName}</span></p>
                      <p>Assignee: <span className="font-semibold">{task.assignee || "Unassigned"}</span></p>
                      <p>Assigned by: <span className="font-semibold">{task.assignedByName || "-"}</span></p>
                      <p>Due: <span className="font-semibold">{task.dueDate ? task.dueDate.slice(0, 10) : "None"}</span></p>
                      <p>Sprint: <span className="font-semibold">{task.sprint || "-"}</span></p>
                      <p>Tracked: <span className="font-semibold">{task.trackedMinutes}m</span></p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {task.labels?.map((label) => (
                        <span key={`${task.id}-${label}`} className="rounded-full bg-[var(--pill-bg)] px-2 py-0.5 text-xs">{label}</span>
                      ))}
                    </div>

                    <div className="text-xs text-[var(--muted-text)]">
                      {task.subtasks?.length ? `Subtasks: ${task.subtasks.filter((item) => item.done).length}/${task.subtasks.length}` : "No subtasks"}
                      {" • "}
                      {task.dependencies?.length ? `Dependencies: ${task.dependencies.length}` : "No dependencies"}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="w-full text-sm font-semibold text-[var(--muted-text)]">
                        Status
                        <select value={task.status} onChange={(event) => moveTask(task.id, event.target.value)} className="field mt-1 py-2">
                          {TASK_STATUSES.map((status) => (
                            <option key={status.key} value={status.key}>{status.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button type="button" className="secondary-button" onClick={() => openEditModal(task)}>Edit</button>
                      <button type="button" className="secondary-button" onClick={() => removeTask(task.id)}>Delete</button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Comments</p>
                      {(task.comments || []).slice(-2).map((comment) => (
                        <div key={comment.id} className="rounded-md border border-[var(--border)] px-2 py-1 text-xs">
                          <p className="font-semibold">{comment.authorName}</p>
                          <p>{comment.message}</p>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          className="field py-2 text-sm"
                          placeholder="Add comment"
                          value={commentDrafts[task.id] || ""}
                          onChange={(event) =>
                            setCommentDrafts((current) => ({ ...current, [task.id]: event.target.value }))
                          }
                        />
                        <button type="button" className="primary-button" onClick={() => addComment(task.id)}>Post</button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      {selectedTask && editForm ? (
        <section className="surface p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-bold">Edit Task</p>
              <p className="text-sm text-[var(--muted-text)]">Update details, dependencies, and time tracking.</p>
            </div>
            <button type="button" className="secondary-button" onClick={closeEditModal}>Close</button>
          </div>

          <form className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={submitTaskUpdate}>
            <Input label="Title" value={editForm.title} onChange={(value) => setEditForm((current) => ({ ...current, title: value }))} />
            <Input label="Description" value={editForm.subtitle} onChange={(value) => setEditForm((current) => ({ ...current, subtitle: value }))} />
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[var(--muted-text)]">Assignee</span>
              <select
                value={editForm.assigneeMemberId}
                onChange={(event) => setEditForm((current) => ({ ...current, assigneeMemberId: event.target.value }))}
                className="field"
                disabled={!selectedTask?.projectId || !editProject?.isOwner}
              >
                <option value="">Unassigned</option>
                {editAssignableMembers.map((member) => (
                  <option key={member.id} value={member.id}>{member.name} ({member.role})</option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[var(--muted-text)]">Status</span>
              <select value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))} className="field">
                {TASK_STATUSES.map((status) => (
                  <option key={status.key} value={status.key}>{status.label}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[var(--muted-text)]">Priority</span>
              <select value={editForm.priority} onChange={(event) => setEditForm((current) => ({ ...current, priority: event.target.value }))} className="field">
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority} className="capitalize">{priority}</option>
                ))}
              </select>
            </label>
            <Input label="Due Date" type="date" value={editForm.dueDate} onChange={(value) => setEditForm((current) => ({ ...current, dueDate: value }))} />
            <Input label="Labels" value={editForm.labels} onChange={(value) => setEditForm((current) => ({ ...current, labels: value }))} />
            <Input label="Sprint" value={editForm.sprint} onChange={(value) => setEditForm((current) => ({ ...current, sprint: value }))} />
            <Input label="Milestone" value={editForm.milestone} onChange={(value) => setEditForm((current) => ({ ...current, milestone: value }))} />
            <Input label="Epic" value={editForm.epic} onChange={(value) => setEditForm((current) => ({ ...current, epic: value }))} />
            <Input
              label="Estimate Hours"
              type="number"
              min={0}
              step={0.5}
              value={editForm.estimateHours}
              onChange={(value) => setEditForm((current) => ({ ...current, estimateHours: Number(value || 0) }))}
            />
            <Input
              label="Log Minutes"
              type="number"
              min={0}
              value={editForm.logMinutes}
              onChange={(value) => setEditForm((current) => ({ ...current, logMinutes: Number(value || 0) }))}
            />
            <Input
              label="Attachment URLs (comma-separated)"
              value={editForm.attachments}
              onChange={(value) => setEditForm((current) => ({ ...current, attachments: value }))}
            />
            <label className="block space-y-2 md:col-span-2 xl:col-span-3">
              <span className="text-sm font-semibold text-[var(--muted-text)]">Subtasks</span>
              <div className="space-y-2">
                {editForm.subtasks.map((subtask, index) => (
                  <label key={subtask.id || `${subtask.title}-${index}`} className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2">
                    <input
                      type="checkbox"
                      checked={Boolean(subtask.done)}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          subtasks: current.subtasks.map((item, currentIndex) =>
                            currentIndex === index ? { ...item, done: event.target.checked } : item
                          ),
                        }))
                      }
                    />
                    <span>{subtask.title}</span>
                  </label>
                ))}
                {editForm.subtasks.length === 0 ? <EmptyState>No subtasks.</EmptyState> : null}
              </div>
            </label>

            <label className="block space-y-2 md:col-span-2 xl:col-span-3">
              <span className="text-sm font-semibold text-[var(--muted-text)]">Dependencies</span>
              <select
                className="field"
                multiple
                value={editForm.dependencies}
                onChange={(event) => {
                  const next = Array.from(event.target.selectedOptions).map((option) => option.value);
                  setEditForm((current) => ({ ...current, dependencies: next }));
                }}
              >
                {dependencyOptions.map((task) => (
                  <option key={task.id} value={task.id}>{task.title} ({task.status})</option>
                ))}
              </select>
              <p className="text-xs text-[var(--muted-text)]">Hold Ctrl/Cmd to select multiple dependencies.</p>
            </label>

            <label className="block space-y-2 md:col-span-2 xl:col-span-3">
              <span className="text-sm font-semibold text-[var(--muted-text)]">Activity History</span>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-[var(--border)] p-3">
                {(selectedTask.activity || []).slice().reverse().map((item) => (
                  <div key={item.id} className="text-xs">
                    <p className="font-semibold">{item.actorName} {item.action}</p>
                    <p className="text-[var(--muted-text)]">{item.note || "-"} • {new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                ))}
                {(selectedTask.activity || []).length === 0 ? <EmptyState>No activity yet.</EmptyState> : null}
              </div>
            </label>

            <div className="md:col-span-2 xl:col-span-3">
              <button className="primary-button" disabled={saving}>{saving ? "Updating..." : "Save Task"}</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="surface p-5">
        <p className="text-lg font-bold">Task Context</p>
        <p className="mt-1 text-sm text-[var(--muted-text)]">
          Current project filter: {activeProjectId ? projects.find((project) => project.id === activeProjectId)?.name || "Selected project" : "All Workspace"}
        </p>
        <p className="text-sm text-[var(--muted-text)]">Reporter is set automatically from logged-in user.</p>
      </section>
    </div>
  );
}
