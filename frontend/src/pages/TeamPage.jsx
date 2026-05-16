import { NameLogo } from "../components/NameLogo";

export function TeamPage({ team }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ["Total Members", team.stats.totalMembers],
          ["Active Now", team.stats.activeNow],
          ["Tasks Completed", team.stats.tasksCompleted],
          ["At Capacity", team.stats.atCapacity],
        ].map(([label, value]) => (
          <div key={label} className="surface p-4">
            <p className="text-sm text-[var(--muted-text)]">{label}</p>
            <p className="text-3xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]">
        <table className="w-full">
          <thead className="bg-[var(--control-bg)] text-left">
            <tr>
              <th className="p-3">Member</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Workload</th>
            </tr>
          </thead>
          <tbody>
            {team.members.map((member) => (
              <tr key={member.id} className="border-t border-[var(--border)]">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <NameLogo name={member.name} size="lg" />
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-[var(--muted-text)]">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 font-semibold">{member.role}</td>
                <td className="p-3">{member.status}</td>
                <td className="p-3">{member.tasks} tasks ({member.workload}%)</td>
              </tr>
            ))}
            {team.members.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-5 text-center text-[var(--muted-text)]">No team members yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
