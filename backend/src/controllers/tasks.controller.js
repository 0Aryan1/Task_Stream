import mongoose from "mongoose";
import { Task } from "../models/task.model.js";
import { Project } from "../models/project.model.js";
import { User } from "../models/user.model.js";
import { canAccessProject, getAccessibleProjectIds } from "../utils/workspace-access.js";

const allowedStatuses = ["todo", "progress", "qa", "done"];
const allowedPriorities = ["low", "normal", "high", "urgent"];

const normalizeStatus = (status) => {
  if (status === "in-progress") return "progress";
  if (status === "review") return "qa";
  return allowedStatuses.includes(status) ? status : "todo";
};

const toDateString = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const makeDueLabel = (dueDate, fallback = "") => {
  const normalized = toDateString(dueDate);
  if (!normalized) return fallback || "";
  return `Due ${normalized}`;
};

const normalizeLabels = (labels = [], fallbackTag = "General") => {
  const next = [...new Set(labels.map((item) => String(item || "").trim()).filter(Boolean))];
  if (!next.length) next.push(fallbackTag || "General");
  return next;
};

const normalizeSubtasks = (subtasks = []) =>
  subtasks
    .map((item) => ({
      title: String(item?.title || "").trim(),
      done: Boolean(item?.done),
    }))
    .filter((item) => item.title);

const buildActivityEntry = (user, action, note = "") => ({
  actorId: user.id,
  actorName: user.fullName || "User",
  action,
  note,
});

const serializeTask = (task) => ({
  id: String(task._id),
  title: task.title,
  subtitle: task.subtitle,
  status: normalizeStatus(task.status),
  projectId: task.project ? String(task.project) : "",
  tag: task.tag,
  labels: task.labels?.length ? task.labels : [task.tag || "General"],
  dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
  dueLabel: task.dueLabel || makeDueLabel(task.dueDate),
  assignee: task.assignee,
  assignedByName: task.assignedByName || "",
  assignedById: task.assignedById ? String(task.assignedById) : "",
  assignedToMemberId: task.assignedToMemberId ? String(task.assignedToMemberId) : "",
  assignedToUserId: task.assignedToUserId ? String(task.assignedToUserId) : "",
  assigneeId: task.assigneeId ? String(task.assigneeId) : "",
  reporterName: task.reporterName || "",
  reporterId: task.reporterId ? String(task.reporterId) : "",
  priority: task.priority,
  sprint: task.sprint || "",
  milestone: task.milestone || "",
  epic: task.epic || "",
  estimateHours: Number(task.estimateHours || 0),
  trackedMinutes: Number(task.trackedMinutes || 0),
  dependencies: (task.dependencies || []).map((dependency) => ({
    id: String(dependency._id || dependency),
    title: dependency.title || "",
    status: dependency.status || "",
  })),
  subtasks: (task.subtasks || []).map((subtask) => ({
    id: String(subtask._id),
    title: subtask.title,
    done: subtask.done,
  })),
  attachments: task.attachments || [],
  comments: (task.comments || []).map((comment) => ({
    id: String(comment._id),
    authorId: String(comment.authorId),
    authorName: comment.authorName,
    message: comment.message,
    createdAt: comment.createdAt,
  })),
  activity: (task.activity || []).map((activity) => ({
    id: String(activity._id),
    actorId: String(activity.actorId),
    actorName: activity.actorName,
    action: activity.action,
    note: activity.note,
    createdAt: activity.createdAt,
  })),
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  order: Number(task.order || 0),
});

const groupTasks = (tasks) => ({
  todo: tasks.filter((task) => task.status === "todo"),
  progress: tasks.filter((task) => task.status === "progress"),
  qa: tasks.filter((task) => task.status === "qa"),
  done: tasks.filter((task) => task.status === "done"),
});

const buildAnalytics = (tasks) => {
  const now = new Date();
  const next72Hours = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const byPriority = allowedPriorities.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  const byStatus = allowedStatuses.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});

  let overdue = 0;
  let dueSoon = 0;
  let completed = 0;
  for (const task of tasks) {
    byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    byStatus[task.status] = (byStatus[task.status] || 0) + 1;
    if (task.status === "done") completed += 1;
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      if (task.status !== "done" && due < now) overdue += 1;
      if (task.status !== "done" && due >= now && due <= next72Hours) dueSoon += 1;
    }
  }

  return {
    total: tasks.length,
    completed,
    overdue,
    dueSoon,
    byPriority,
    byStatus,
  };
};

const parseFilters = (query) => ({
  projectId: String(query.projectId || ""),
  status: String(query.status || ""),
  priority: String(query.priority || ""),
  assignee: String(query.assignee || "").trim().toLowerCase(),
  label: String(query.label || "").trim().toLowerCase(),
  search: String(query.q || "").trim().toLowerCase(),
  sprint: String(query.sprint || "").trim().toLowerCase(),
  epic: String(query.epic || "").trim().toLowerCase(),
});

const findProjectOwnerId = async (projectId) => {
  if (!projectId) return "";
  const project = await Project.findById(projectId).select("owner").lean();
  return project ? String(project.owner) : "";
};

const getProjectWithMembers = async (projectId) => {
  if (!projectId) return null;
  return Project.findById(projectId).populate("members", "name email role avatar").select("_id owner members").lean();
};

const resolveAssignmentTarget = async ({ project, assigneeMemberId = "", assigneeName = "" }) => {
  if (!project) {
    return {
      assignedToMemberId: null,
      assignedToUserId: null,
      assignee: "",
    };
  }

  if (!assigneeMemberId && !assigneeName) {
    return {
      assignedToMemberId: null,
      assignedToUserId: null,
      assignee: "",
    };
  }

  let member = null;
  if (assigneeMemberId && mongoose.Types.ObjectId.isValid(assigneeMemberId)) {
    member = project.members.find((item) => String(item._id) === String(assigneeMemberId)) || null;
  } else if (assigneeName) {
    const normalized = assigneeName.toLowerCase().trim();
    member = project.members.find((item) => item.name.toLowerCase().trim() === normalized) || null;
  }

  if (!member) {
    return null;
  }

  const linkedUser = await User.findOne({ email: member.email.toLowerCase().trim() }).select("_id fullName").lean();
  return {
    assignedToMemberId: member._id,
    assignedToUserId: linkedUser?._id || null,
    assignee: linkedUser?.fullName || member.name,
  };
};

const ensureLegacyTaskFields = (task, user) => {
  if (!task.reporterId) task.reporterId = task.owner;
  if (!task.reporterName?.trim()) task.reporterName = user.fullName || "User";
};

const getTaskPermissions = async (user, task) => {
  const userId = String(user.id);
  const isTaskOwner = String(task.owner) === userId;
  const isReporter = String(task.reporterId || task.owner) === userId;

  if (!task.project) {
    return {
      canAccess: isTaskOwner || isReporter,
      canEdit: isTaskOwner || isReporter,
      canDelete: isTaskOwner || isReporter,
      canMove: isTaskOwner || isReporter,
    };
  }

  const hasProjectAccess = await canAccessProject(user, task.project);
  if (!hasProjectAccess) {
    return { canAccess: false, canEdit: false, canDelete: false, canMove: false };
  }

  const projectOwnerId = await findProjectOwnerId(task.project);
  const isProjectOwner = projectOwnerId === userId;

  return {
    canAccess: true,
    canEdit: isProjectOwner || isReporter || isTaskOwner,
    canDelete: isProjectOwner,
    canMove: true,
  };
};

const applyTaskPatch = (task, payload) => {
  if (typeof payload.title === "string" && payload.title.trim()) task.title = payload.title.trim();
  if (typeof payload.subtitle === "string") task.subtitle = payload.subtitle.trim();
  if (typeof payload.tag === "string") task.tag = payload.tag.trim() || "General";
  if (allowedStatuses.includes(payload.status)) task.status = payload.status;
  if (allowedPriorities.includes(payload.priority)) task.priority = payload.priority;
  if (typeof payload.sprint === "string") task.sprint = payload.sprint.trim();
  if (typeof payload.milestone === "string") task.milestone = payload.milestone.trim();
  if (typeof payload.epic === "string") task.epic = payload.epic.trim();
  if (Array.isArray(payload.labels)) task.labels = normalizeLabels(payload.labels, task.tag);
  if (Array.isArray(payload.subtasks)) task.subtasks = normalizeSubtasks(payload.subtasks);
  if (Array.isArray(payload.attachments)) {
    task.attachments = payload.attachments.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (Array.isArray(payload.dependencies)) {
    task.dependencies = payload.dependencies.filter((id) => mongoose.Types.ObjectId.isValid(id));
  }
  if (typeof payload.estimateHours === "number" && payload.estimateHours >= 0) {
    task.estimateHours = payload.estimateHours;
  }
  if (typeof payload.trackedMinutes === "number" && payload.trackedMinutes >= 0) {
    task.trackedMinutes = Math.floor(payload.trackedMinutes);
  }
  if (typeof payload.logMinutes === "number" && payload.logMinutes > 0) {
    task.trackedMinutes = Math.floor(task.trackedMinutes || 0) + Math.floor(payload.logMinutes);
  }
  if (payload.dueDate === null || payload.dueDate === "") {
    task.dueDate = null;
    task.dueLabel = "";
  } else if (typeof payload.dueDate === "string") {
    const parsed = new Date(payload.dueDate);
    if (!Number.isNaN(parsed.getTime())) {
      task.dueDate = parsed;
      task.dueLabel = makeDueLabel(parsed, task.dueLabel);
    }
  }
};

export const getTasks = async (req, res) => {
  const filters = parseFilters(req.query);
  let queryFilter = {};

  if (filters.projectId) {
    const hasAccess = await canAccessProject(req.user, filters.projectId);
    if (!hasAccess) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    queryFilter = { project: filters.projectId };
  } else {
    const accessibleProjectIds = await getAccessibleProjectIds(req.user);
    queryFilter = {
      $or: [
        { owner: req.user.id, project: null },
        { project: { $in: accessibleProjectIds } },
      ],
    };
  }

  const taskDocs = await Task.find(queryFilter)
    .populate("dependencies", "title status priority")
    .sort({ status: 1, order: 1, createdAt: -1 })
    .lean();

  let tasks = taskDocs.map(serializeTask);
  if (filters.status) tasks = tasks.filter((task) => task.status === normalizeStatus(filters.status));
  if (filters.priority) tasks = tasks.filter((task) => task.priority === filters.priority);
  if (filters.assignee) tasks = tasks.filter((task) => task.assignee.toLowerCase().includes(filters.assignee));
  if (filters.label) tasks = tasks.filter((task) => task.labels.some((label) => label.toLowerCase().includes(filters.label)));
  if (filters.sprint) tasks = tasks.filter((task) => task.sprint.toLowerCase().includes(filters.sprint));
  if (filters.epic) tasks = tasks.filter((task) => task.epic.toLowerCase().includes(filters.epic));
  if (filters.search) {
    tasks = tasks.filter((task) =>
      [task.title, task.subtitle, task.assignee, task.reporterName, task.tag, ...task.labels]
        .join(" ")
        .toLowerCase()
        .includes(filters.search)
    );
  }

  res.json({
    success: true,
    tasks: groupTasks(tasks),
    allTasks: tasks,
    analytics: buildAnalytics(tasks),
  });
};

export const createTask = async (req, res) => {
  const {
    title,
    subtitle = "",
    status = "todo",
    tag = "General",
    labels = [],
    dueDate = null,
    assignee = "",
    assigneeMemberId = "",
    priority = "normal",
    sprint = "",
    milestone = "",
    epic = "",
    estimateHours = 0,
    trackedMinutes = 0,
    dependencies = [],
    subtasks = [],
    attachments = [],
    projectId = "",
  } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ success: false, message: "Task title is required" });
  }
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid task status" });
  }
  if (!allowedPriorities.includes(priority)) {
    return res.status(400).json({ success: false, message: "Invalid task priority" });
  }

  let project = null;
  let projectDetails = null;
  if (!projectId && (assigneeMemberId || assignee)) {
    return res.status(400).json({ success: false, message: "Select a project before assigning this task" });
  }
  if (projectId) {
    const hasAccess = await canAccessProject(req.user, projectId);
    if (!hasAccess) return res.status(404).json({ success: false, message: "Project not found" });
    projectDetails = await getProjectWithMembers(projectId);
    if (!projectDetails) return res.status(404).json({ success: false, message: "Project not found" });
    project = { _id: projectDetails._id };
  }

  const assignment = await resolveAssignmentTarget({
    project: projectDetails,
    assigneeMemberId,
    assigneeName: assignee,
  });
  if (projectDetails && (assigneeMemberId || assignee) && !assignment) {
    return res.status(400).json({ success: false, message: "Assignee must be a member of the project" });
  }
  if (projectDetails && assignment?.assignedToMemberId && String(projectDetails.owner) !== String(req.user.id)) {
    return res.status(403).json({ success: false, message: "Only the project owner can assign tasks" });
  }

  const dependencyIds = dependencies.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const due = dueDate ? new Date(dueDate) : null;
  const orderFilter = { status, project: project?._id || null };
  const lastTask = await Task.find(orderFilter).sort({ order: -1 }).select("order").lean();

  const task = await Task.create({
    owner: req.user.id,
    project: project?._id || null,
    title: title.trim(),
    subtitle: subtitle.trim(),
    reporterId: req.user.id,
    reporterName: req.user.fullName || "User",
    assignee: assignment?.assignee || "",
    assigneeId: assignment?.assignedToUserId || null,
    assignedToMemberId: assignment?.assignedToMemberId || null,
    assignedToUserId: assignment?.assignedToUserId || null,
    assignedById: assignment?.assignedToMemberId ? req.user.id : null,
    assignedByName: assignment?.assignedToMemberId ? req.user.fullName || "User" : "",
    status,
    tag: tag.trim() || "General",
    labels: normalizeLabels(Array.isArray(labels) ? labels : String(labels || "").split(","), tag),
    dueDate: due && !Number.isNaN(due.getTime()) ? due : null,
    dueLabel: makeDueLabel(due),
    priority,
    sprint: String(sprint || "").trim(),
    milestone: String(milestone || "").trim(),
    epic: String(epic || "").trim(),
    estimateHours: Number(estimateHours) > 0 ? Number(estimateHours) : 0,
    trackedMinutes: Number(trackedMinutes) > 0 ? Math.floor(trackedMinutes) : 0,
    dependencies: dependencyIds,
    subtasks: normalizeSubtasks(subtasks),
    attachments: (attachments || []).map((item) => String(item || "").trim()).filter(Boolean),
    activity: [
      buildActivityEntry(req.user, "created", "Task created"),
      ...(assignment?.assignedToMemberId
        ? [buildActivityEntry(req.user, "assigned", `Assigned to ${assignment.assignee}`)]
        : []),
    ],
    order: Number.isFinite(lastTask?.order) ? lastTask.order + 1 : 0,
  });

  const populated = await Task.findById(task._id).populate("dependencies", "title status priority").lean();
  return res.status(201).json({ success: true, task: serializeTask(populated) });
};

export const updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ success: false, message: "Task not found" });
  ensureLegacyTaskFields(task, req.user);

  const permissions = await getTaskPermissions(req.user, task);
  if (!permissions.canEdit) {
    return res.status(403).json({ success: false, message: "You are not allowed to edit this task" });
  }

  const nextProjectId = typeof req.body.projectId === "string" ? req.body.projectId : "";
  if (nextProjectId && String(task.project || "") !== nextProjectId) {
    const hasAccess = await canAccessProject(req.user, nextProjectId);
    if (!hasAccess) return res.status(404).json({ success: false, message: "Project not found" });
    task.project = nextProjectId;
  }

  const hasAssigneeMemberField = Object.prototype.hasOwnProperty.call(req.body, "assigneeMemberId");
  const hasAssigneeNameField = Object.prototype.hasOwnProperty.call(req.body, "assignee");

  if (task.project && (hasAssigneeMemberField || hasAssigneeNameField)) {
    const currentMemberId = task.assignedToMemberId ? String(task.assignedToMemberId) : "";
    const nextMemberId = hasAssigneeMemberField ? String(req.body.assigneeMemberId || "") : currentMemberId;
    const currentAssigneeName = String(task.assignee || "").trim();
    const nextAssigneeName = hasAssigneeNameField ? String(req.body.assignee || "").trim() : currentAssigneeName;
    const assignmentChanged = nextMemberId !== currentMemberId || (!hasAssigneeMemberField && nextAssigneeName !== currentAssigneeName);

    if (assignmentChanged) {
      const projectDetails = await getProjectWithMembers(task.project);
      if (!projectDetails) return res.status(404).json({ success: false, message: "Project not found" });
      if (String(projectDetails.owner) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: "Only the project owner can assign tasks" });
      }

      const assignment = await resolveAssignmentTarget({
        project: projectDetails,
        assigneeMemberId: nextMemberId,
        assigneeName: nextAssigneeName,
      });
      if (!assignment && (nextMemberId || nextAssigneeName)) {
        return res.status(400).json({ success: false, message: "Assignee must be a member of the project" });
      }

      task.assignee = assignment?.assignee || "";
      task.assigneeId = assignment?.assignedToUserId || null;
      task.assignedToMemberId = assignment?.assignedToMemberId || null;
      task.assignedToUserId = assignment?.assignedToUserId || null;
      task.assignedById = assignment?.assignedToMemberId ? req.user.id : null;
      task.assignedByName = assignment?.assignedToMemberId ? req.user.fullName || "User" : "";
      task.activity.push(
        buildActivityEntry(
          req.user,
          "assigned",
          assignment?.assignedToMemberId ? `Assigned to ${assignment.assignee}` : "Assignment cleared"
        )
      );
    }
  }

  applyTaskPatch(task, req.body);
  task.activity.push(buildActivityEntry(req.user, "updated", "Task details updated"));
  await task.save();

  const populated = await Task.findById(task._id).populate("dependencies", "title status priority").lean();
  return res.json({ success: true, task: serializeTask(populated) });
};

export const deleteTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ success: false, message: "Task not found" });

  const permissions = await getTaskPermissions(req.user, task);
  if (!permissions.canDelete) {
    return res.status(403).json({ success: false, message: "You are not allowed to delete this task" });
  }

  await Task.deleteOne({ _id: task._id });
  return res.json({ success: true, message: "Task deleted" });
};

export const addTaskComment = async (req, res) => {
  const message = String(req.body.message || "").trim();
  if (!message) return res.status(400).json({ success: false, message: "Comment message is required" });

  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ success: false, message: "Task not found" });
  ensureLegacyTaskFields(task, req.user);

  const permissions = await getTaskPermissions(req.user, task);
  if (!permissions.canAccess) {
    return res.status(403).json({ success: false, message: "You are not allowed to comment on this task" });
  }

  task.comments.push({
    authorId: req.user.id,
    authorName: req.user.fullName || "User",
    message,
  });
  task.activity.push(buildActivityEntry(req.user, "commented", message));
  await task.save();

  const populated = await Task.findById(task._id).populate("dependencies", "title status priority").lean();
  return res.status(201).json({ success: true, task: serializeTask(populated) });
};

export const reorderTasks = async (req, res) => {
  const { updates = [] } = req.body;
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ success: false, message: "Reorder updates are required" });
  }

  const tasks = await Task.find({ _id: { $in: updates.map((item) => item.id).filter(Boolean) } }).lean();
  const taskMap = new Map(tasks.map((task) => [String(task._id), task]));

  for (const update of updates) {
    const task = taskMap.get(String(update.id));
    if (!task) continue;
    const permissions = await getTaskPermissions(req.user, task);
    if (!permissions.canMove) {
      return res.status(403).json({ success: false, message: "You are not allowed to move one or more tasks" });
    }
  }

  const ops = updates
    .filter((item) => taskMap.has(String(item.id)))
    .map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: {
          status: allowedStatuses.includes(item.status) ? item.status : taskMap.get(String(item.id)).status,
          order: Number.isFinite(item.order) ? item.order : 0,
          $push: {
            activity: buildActivityEntry(req.user, "moved", `Moved to ${item.status}`),
          },
        },
      },
    }));

  if (ops.length) await Task.bulkWrite(ops);
  return res.json({ success: true });
};

export const updateTaskStatus = async (req, res) => {
  const { status } = req.body;
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid task status" });
  }

  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ success: false, message: "Task not found" });
  ensureLegacyTaskFields(task, req.user);

  const permissions = await getTaskPermissions(req.user, task);
  if (!permissions.canMove) {
    return res.status(403).json({ success: false, message: "You are not allowed to move this task" });
  }

  task.status = status;
  task.activity.push(buildActivityEntry(req.user, "moved", `Moved to ${status}`));
  await task.save();

  const populated = await Task.findById(task._id).populate("dependencies", "title status priority").lean();
  res.json({ success: true, task: serializeTask(populated) });
};
