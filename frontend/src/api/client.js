const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "");
const API = `${API_BASE}/api`;

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
  tasks: (token, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.set(key, value);
    });
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/tasks${suffix}`, { token });
  },
  createTask: (token, payload) =>
    request("/tasks", { token, method: "POST", body: JSON.stringify(payload) }),
  updateTask: (token, taskId, payload) =>
    request(`/tasks/${taskId}`, { token, method: "PATCH", body: JSON.stringify(payload) }),
  deleteTask: (token, taskId) =>
    request(`/tasks/${taskId}`, { token, method: "DELETE" }),
  addTaskComment: (token, taskId, message) =>
    request(`/tasks/${taskId}/comments`, { token, method: "POST", body: JSON.stringify({ message }) }),
  reorderTasks: (token, updates) =>
    request("/tasks/reorder", { token, method: "POST", body: JSON.stringify({ updates }) }),
  team: (token) => request("/team", { token }),
  projects: (token) => request("/projects", { token }),
  invitations: (token) => request("/projects/invitations", { token }),
  createProject: (token, payload) =>
    request("/projects", { token, method: "POST", body: JSON.stringify(payload) }),
  updateProject: (token, projectId, payload) =>
    request(`/projects/${projectId}`, { token, method: "PATCH", body: JSON.stringify(payload) }),
  deleteProject: (token, projectId) =>
    request(`/projects/${projectId}`, { token, method: "DELETE" }),
  inviteProjectMember: (token, projectId, payload) =>
    request(`/projects/${projectId}/invitations`, { token, method: "POST", body: JSON.stringify(payload) }),
  respondToInvitation: (token, invitationId, decision) =>
    request(`/projects/invitations/${invitationId}`, {
      token,
      method: "PATCH",
      body: JSON.stringify({ decision }),
    }),
  updateTaskStatus: (token, taskId, status) =>
    request(`/tasks/${taskId}/status`, { token, method: "PATCH", body: JSON.stringify({ status }) }),
};
