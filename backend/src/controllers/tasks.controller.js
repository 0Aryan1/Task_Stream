import { Task } from "../models/task.model.js";

const allowedStatuses = ["todo", "progress", "qa", "done"];
const normalizeStatus = (status) => {
  if (status === "in-progress") return "progress";
  if (status === "review") return "qa";
  return allowedStatuses.includes(status) ? status : "todo";
};

export const getTasks = async (req, res) => {
  const filter = { owner: req.user.id };
  if (req.query.projectId) filter.project = req.query.projectId;

  const taskDocs = await Task.find(filter).sort({ createdAt: -1 }).lean();

  const tasks = taskDocs.map((task) => ({
    id: String(task._id),
    title: task.title,
    subtitle: task.subtitle,
    status: normalizeStatus(task.status),
    tag: task.tag,
    dueLabel: task.dueLabel,
    assignee: task.assignee,
    priority: task.priority,
  }));

  const grouped = {
    todo: tasks.filter((task) => task.status === "todo"),
    progress: tasks.filter((task) => task.status === "progress"),
    qa: tasks.filter((task) => task.status === "qa"),
    done: tasks.filter((task) => task.status === "done"),
  };

  res.json({ success: true, tasks: grouped });
};

export const updateTaskStatus = async (req, res) => {
  const { status } = req.body;
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid task status" });
  }

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    { status },
    { new: true }
  ).lean();

  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found" });
  }

  res.json({
    success: true,
    task: {
      id: String(task._id),
      title: task.title,
      subtitle: task.subtitle,
      status: task.status,
      tag: task.tag,
      dueLabel: task.dueLabel,
      assignee: task.assignee,
      priority: task.priority,
    },
  });
};
