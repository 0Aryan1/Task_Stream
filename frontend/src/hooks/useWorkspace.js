import { useCallback, useEffect, useState } from "react";
import { authApi, workspaceApi } from "../api/client";

const TOKEN_KEY = "taskstream_token";
const PROJECT_KEY = "taskstream_project";

export function useWorkspace() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [activeProjectId, setActiveProjectIdState] = useState(localStorage.getItem(PROJECT_KEY) || "");
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [team, setTeam] = useState(null);
  const [projects, setProjects] = useState(null);
  const [invitations, setInvitations] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setSummary(null);
    setTasks(null);
    setTeam(null);
    setProjects(null);
    setInvitations(null);
    setActiveProjectIdState("");
    localStorage.removeItem(PROJECT_KEY);
  }, []);

  const refreshWorkspace = useCallback(
    async (jwt = token, projectId = activeProjectId) => {
      if (!jwt) return;

      const [me, teamData, projectsData, invitationData] = await Promise.all([
        authApi.me(jwt),
        workspaceApi.team(jwt),
        workspaceApi.projects(jwt),
        workspaceApi.invitations(jwt),
      ]);
      const validProjectId = projectsData.projects.some((project) => project.id === projectId) ? projectId : "";
      const [summaryData, tasksData] = await Promise.all([
        workspaceApi.summary(jwt, validProjectId),
        workspaceApi.tasks(jwt, { projectId: validProjectId }),
      ]);

      setUser(me.user);
      setSummary(summaryData.summary);
      setTasks(tasksData);
      setTeam(teamData);
      setProjects(projectsData.projects);
      setInvitations(invitationData.invitations);
      setActiveProjectIdState(validProjectId);
      localStorage.setItem(PROJECT_KEY, validProjectId);
    },
    [activeProjectId, token]
  );

  useEffect(() => {
    if (!token) return;

    // Initial session hydration is intentionally driven by the persisted token.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshWorkspace(token)
      .catch((caughtError) => {
        setError(caughtError.message);
        clearSession();
      })
      .finally(() => setLoading(false));
  }, [clearSession, refreshWorkspace, token]);

  useEffect(() => {
    if (!token) return;

    const intervalId = window.setInterval(() => {
      workspaceApi
        .invitations(token)
        .then((data) => setInvitations(data.invitations))
        .catch(() => {});
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [token]);

  const authenticate = async (mode, payload) => {
    setLoading(true);
    setError("");

    try {
      const data = mode === "signin" ? await authApi.signin(payload) : await authApi.signup(payload);
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
    } catch (caughtError) {
      setError(caughtError.message);
      throw caughtError;
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (payload) => {
    const data = await workspaceApi.createProject(token, payload);
    setProjects((current) => [data.project, ...(current || [])]);
    setActiveProjectIdState(data.project.id);
    localStorage.setItem(PROJECT_KEY, data.project.id);
    await refreshWorkspace(token, data.project.id);
  };

  const updateProject = async (projectId, payload) => {
    const data = await workspaceApi.updateProject(token, projectId, payload);
    setProjects((current) => (current || []).map((project) => (project.id === projectId ? data.project : project)));
    await refreshWorkspace();
  };

  const deleteProject = async (projectId) => {
    await workspaceApi.deleteProject(token, projectId);
    const nextProjectId = activeProjectId === projectId ? "" : activeProjectId;
    await refreshWorkspace(token, nextProjectId);
  };

  const createTask = async (payload) => {
    const data = await workspaceApi.createTask(token, payload);
    await refreshWorkspace(token, activeProjectId);
    return data.task;
  };

  const updateTask = async (taskId, payload) => {
    const data = await workspaceApi.updateTask(token, taskId, payload);
    await refreshWorkspace(token, activeProjectId);
    return data.task;
  };

  const deleteTask = async (taskId) => {
    await workspaceApi.deleteTask(token, taskId);
    await refreshWorkspace(token, activeProjectId);
  };

  const addTaskComment = async (taskId, message) => {
    const data = await workspaceApi.addTaskComment(token, taskId, message);
    await refreshWorkspace(token, activeProjectId);
    return data.task;
  };

  const reorderTasks = async (updates) => {
    await workspaceApi.reorderTasks(token, updates);
    await refreshWorkspace(token, activeProjectId);
  };

  const inviteProjectMember = async (projectId, payload) => {
    const data = await workspaceApi.inviteProjectMember(token, projectId, payload);
    setProjects((current) => (current || []).map((project) => (project.id === projectId ? data.project : project)));
    await refreshWorkspace(token, projectId);
    return data.invitation;
  };

  const respondToInvitation = async (invitationId, decision) => {
    await workspaceApi.respondToInvitation(token, invitationId, decision);
    await refreshWorkspace(token, activeProjectId);
  };

  const setActiveProjectId = async (projectId) => {
    setActiveProjectIdState(projectId);
    localStorage.setItem(PROJECT_KEY, projectId);
    await refreshWorkspace(token, projectId);
  };

  const updateTaskStatus = async (taskId, status) => {
    await workspaceApi.updateTaskStatus(token, taskId, status);
    await refreshWorkspace(token, activeProjectId);
  };

  const refreshTasks = async (filters = {}) => {
    const data = await workspaceApi.tasks(token, {
      projectId: activeProjectId,
      ...filters,
    });
    setTasks(data);
  };

  const selectedProject = projects?.find((project) => project.id === activeProjectId) || null;

  const isReady = Boolean(token && user && summary && tasks && team && projects && invitations);

  return {
    authenticate,
    activeProjectId,
    clearError: () => setError(""),
    createProject,
    createTask,
    deleteProject,
    updateTask,
    deleteTask,
    addTaskComment,
    reorderTasks,
    error,
    invitations,
    inviteProjectMember,
    isReady,
    loading,
    projects,
    refreshWorkspace,
    selectedProject,
    setActiveProjectId,
    signOut: clearSession,
    summary,
    respondToInvitation,
    tasks,
    refreshTasks,
    team,
    token,
    updateProject,
    updateTaskStatus,
    user,
  };
}
