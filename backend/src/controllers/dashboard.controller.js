import { Task } from "../models/task.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { Project } from "../models/project.model.js";

const normalizeStatus = (status) => {
  if (status === "in-progress") return "progress";
  if (status === "review") return "qa";
  return status;
};

export const getSummary = async (req, res) => {
  const taskFilter = { owner: req.user.id };
  if (req.query.projectId) taskFilter.project = req.query.projectId;

  const taskDocs = await Task.find(taskFilter).sort({ createdAt: -1 }).lean();
  const members = await TeamMember.find({ owner: req.user.id }).lean();
  const projects = await Project.find({ owner: req.user.id }).lean();

  const overdue = taskDocs.filter((t) => t.priority === "urgent").length;
  const doneCount = taskDocs.filter((t) => t.status === "done").length;

  const cards = [
    { label: "Active Projects", value: projects.filter((project) => project.status === "active").length, note: `${projects.length} total` },
    { label: "Total Tasks", value: taskDocs.length, note: `${doneCount} done` },
    { label: "Overdue Tasks", value: overdue, note: "0 new" },
    { label: "Team Members", value: members.length, note: `${members.filter((m) => m.status === "Active").length} Online` },
  ];

  const priorityTasks = taskDocs.map((task) => ({
    id: String(task._id),
    title: task.title,
    subtitle: task.subtitle,
    status: normalizeStatus(task.status),
  }));

  res.json({
    success: true,
    summary: {
      greeting: `Good Morning, ${req.user.fullName?.split(" ")[0] || "User"}`,
      cards,
      distribution: [],
      priorityTasks,
      recentActivity: [],
    },
  });
};
