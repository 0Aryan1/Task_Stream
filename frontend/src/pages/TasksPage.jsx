import { EmptyState } from "../components/EmptyState";
import { NameLogo } from "../components/NameLogo";
import { TASK_STATUSES } from "../constants/statuses";

export function TasksPage({ tasks, onUpdateStatus }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
      {TASK_STATUSES.map((column) => (
        <section key={column.key} className="rounded-lg border border-[var(--border)] bg-[var(--column-bg)] p-3">
          <p className="mb-3 flex items-center justify-between text-lg font-bold">
            {column.label}
            <span className="rounded-full bg-[var(--pill-bg)] px-2 text-sm">{tasks[column.key]?.length || 0}</span>
          </p>

          <div className="space-y-3">
            {(tasks[column.key] || []).length === 0 ? (
              <EmptyState>No tasks</EmptyState>
            ) : (
              (tasks[column.key] || []).map((task) => (
                <article key={task.id} className="surface p-3">
                  <p className="inline-flex rounded-full bg-[var(--pill-bg)] px-2 py-1 text-xs font-bold uppercase">{task.tag}</p>
                  <p className="mt-2 text-xl font-bold">{task.title}</p>
                  <p className="text-sm text-[var(--muted-text)]">{task.subtitle}</p>

                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span>{task.dueLabel || "No due date"}</span>
                    {task.assignee ? <NameLogo name={task.assignee} size="sm" /> : <span className="text-[var(--muted-text)]">Unassigned</span>}
                  </div>

                  <label className="mt-3 block text-sm font-semibold text-[var(--muted-text)]">
                    Status
                    <select
                      value={task.status}
                      onChange={(event) => onUpdateStatus(task.id, event.target.value)}
                      className="field mt-2 py-2"
                    >
                      {TASK_STATUSES.map((status) => (
                        <option key={status.key} value={status.key}>{status.label}</option>
                      ))}
                    </select>
                  </label>
                </article>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
