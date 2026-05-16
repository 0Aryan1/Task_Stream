const API = "http://localhost:3000/api";

const request = async (path, { token, ...options } = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

export const authApi = {
  signin: (payload) => request("/auth/signin", { method: "POST", body: JSON.stringify(payload) }),
  signup: (payload) => request("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  me: (token) => request("/auth/me", { token }),
};

export const workspaceApi = {
  summary: (token, projectId = "") =>
    request(`/dashboard/summary${projectId ? `?projectId=${projectId}` : ""}`, { token }),
  tasks: (token, projectId = "") =>
    request(`/tasks${projectId ? `?projectId=${projectId}` : ""}`, { token }),
  team: (token) => request("/team", { token }),
  projects: (token) => request("/projects", { token }),
  createProject: (token, payload) =>
    request("/projects", { token, method: "POST", body: JSON.stringify(payload) }),
  updateProject: (token, projectId, payload) =>
    request(`/projects/${projectId}`, { token, method: "PATCH", body: JSON.stringify(payload) }),
  inviteProjectMember: (token, projectId, payload) =>
    request(`/projects/${projectId}/invitations`, { token, method: "POST", body: JSON.stringify(payload) }),
  updateTaskStatus: (token, taskId, status) =>
    request(`/tasks/${taskId}/status`, { token, method: "PATCH", body: JSON.stringify({ status }) }),
};
