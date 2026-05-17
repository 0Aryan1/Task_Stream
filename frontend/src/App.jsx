import { useState } from "react";
import { AppShell } from "./layout/AppShell";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { TasksPage } from "./pages/TasksPage";
import { TeamPage } from "./pages/TeamPage";
import { useTheme } from "./hooks/useTheme";
import { useWorkspace } from "./hooks/useWorkspace";

function App() {
  const [tab, setTab] = useState("dashboard");
  const { theme, toggleTheme } = useTheme();
  const workspace = useWorkspace();

  if (!workspace.token) {
    return (
      <div data-theme={theme}>
        <AuthPage error={workspace.error} loading={workspace.loading} onAuthenticate={workspace.authenticate} />
      </div>
    );
  }

  if (!workspace.isReady) {
    return <div data-theme={theme} className="grid min-h-screen place-items-center bg-[var(--app-bg)] text-lg font-semibold text-[var(--text)]">Loading workspace...</div>;
  }

  return (
    <div data-theme={theme}>
      <AppShell
        activeProjectId={workspace.activeProjectId}
        currentTab={tab}
        greeting={workspace.summary.greeting}
        invitations={workspace.invitations}
        pendingInvitationsCount={workspace.invitations.length}
        onProjectChange={workspace.setActiveProjectId}
        onRespondInvitation={workspace.respondToInvitation}
        onSignOut={workspace.signOut}
        onTabChange={setTab}
        onToggleTheme={toggleTheme}
        projects={workspace.projects}
        theme={theme}
        user={workspace.user}
      >
        {tab === "dashboard" && <DashboardPage summary={workspace.summary} />}
        {tab === "projects" && (
          <ProjectsPage
            activeProjectId={workspace.activeProjectId}
            isAdmin={workspace.user.role === "Admin"}
            onCreateProject={workspace.createProject}
            onInviteProject={workspace.inviteProjectMember}
            onSelectProject={workspace.setActiveProjectId}
            onDeleteProject={workspace.deleteProject}
            onUpdateProject={workspace.updateProject}
            projects={workspace.projects}
            selectedProject={workspace.selectedProject}
            team={workspace.team}
          />
        )}
        {tab === "tasks" && (
          <TasksPage
            activeProjectId={workspace.activeProjectId}
            selectedProject={workspace.selectedProject}
            onAddComment={workspace.addTaskComment}
            onCreateTask={workspace.createTask}
            onDeleteTask={workspace.deleteTask}
            onUpdateStatus={workspace.updateTaskStatus}
            onUpdateTask={workspace.updateTask}
            projects={workspace.projects}
            tasks={workspace.tasks}
            user={workspace.user}
          />
        )}
        {tab === "team" && <TeamPage team={workspace.team} />}
      </AppShell>
    </div>
  );
}

export default App;
