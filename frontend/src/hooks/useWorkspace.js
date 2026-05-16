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
    setActiveProjectIdState("");
    localStorage.removeItem(PROJECT_KEY);
  }, []);

  const refreshWorkspace = useCallback(
    async (jwt = token, projectId = activeProjectId) => {
      if (!jwt) return;

      const [me, teamData, projectsData] = await Promise.all([
        authApi.me(jwt),
        workspaceApi.team(jwt),
        workspaceApi.projects(jwt),
      ]);
      const validProjectId = projectsData.projects.some((project) => project.id === projectId) ? projectId : "";
      const [summaryData, tasksData] = await Promise.all([
        workspaceApi.summary(jwt, validProjectId),
        workspaceApi.tasks(jwt, validProjectId),
      ]);

      setUser(me.user);
      setSummary(summaryData.summary);
      setTasks(tasksData.tasks);
      setTeam(teamData);
      setProjects(projectsData.projects);
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

  const inviteProjectMember = async (projectId, payload) => {
    const data = await workspaceApi.inviteProjectMember(token, projectId, payload);
    setProjects((current) => (current || []).map((project) => (project.id === projectId ? data.project : project)));
    await refreshWorkspace(token, projectId);
    return data.invitation;
  };

  const setActiveProjectId = async (projectId) => {
    setActiveProjectIdState(projectId);
    localStorage.setItem(PROJECT_KEY, projectId);
    await refreshWorkspace(token, projectId);
  };

  const updateTaskStatus = async (taskId, status) => {
    await workspaceApi.updateTaskStatus(token, taskId, status);
    await refreshWorkspace();
  };

  const selectedProject = projects?.find((project) => project.id === activeProjectId) || null;

  const isReady = Boolean(token && user && summary && tasks && team && projects);

  return {
    authenticate,
    activeProjectId,
    clearError: () => setError(""),
    createProject,
    error,
    inviteProjectMember,
    isReady,
    loading,
    projects,
    refreshWorkspace,
    selectedProject,
    setActiveProjectId,
    signOut: clearSession,
    summary,
    tasks,
    team,
    token,
    updateProject,
    updateTaskStatus,
    user,
  };
}
