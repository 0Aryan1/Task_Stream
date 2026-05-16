import { EmptyState } from "../components/EmptyState";

export function DashboardPage({ summary }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {summary.cards.map((card) => (
          <div key={card.label} className="surface p-4">
            <p className="text-sm text-[var(--muted-text)]">{card.label}</p>
            <p className="mt-2 text-4xl font-extrabold">{card.value}</p>
            <p className="mt-1 text-sm font-semibold text-emerald-600">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="surface p-5">
        <p className="text-3xl font-bold">My Priority Tasks</p>
        {summary.priorityTasks.length === 0 ? (
          <div className="mt-4">
            <EmptyState>No tasks yet. Your assigned work will appear here.</EmptyState>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {summary.priorityTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-lg bg-[var(--control-bg)] p-3">
                <div>
                  <p className="font-bold">{task.title}</p>
                  <p className="text-sm text-[var(--muted-text)]">{task.subtitle}</p>
                </div>
                <span className="rounded-full bg-[var(--pill-bg)] px-3 py-1 text-sm font-semibold capitalize">{task.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
