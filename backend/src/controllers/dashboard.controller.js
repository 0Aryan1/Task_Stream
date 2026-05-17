import { Task } from "../models/task.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { Project } from "../models/project.model.js";
import { canAccessProject, getAccessibleProjectIds } from "../utils/workspace-access.js";

const normalizeStatus = (status) => {
  if (status === "in-progress") return "progress";
  if (status === "review") return "qa";
  return status;
};

export const getSummary = async (req, res) => {
  const { projectId = "" } = req.query;
  const accessibleProjectIds = await getAccessibleProjectIds(req.user);
  const globalProjectFilter = { _id: { $in: accessibleProjectIds } };
  const scopedProjectFilter = projectId ? { _id: projectId } : globalProjectFilter;

  if (projectId) {
    const hasAccess = await canAccessProject(req.user, projectId);
    if (!hasAccess) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
  }

  const taskFilter = projectId
    ? { project: projectId }
    : {
        $or: [
          { owner: req.user.id, project: null },
          { project: { $in: accessibleProjectIds } },
        ],
      };

  const [taskDocs, members, scopedProjects, allProjects] = await Promise.all([
    Task.find(taskFilter).sort({ createdAt: -1 }).lean(),
    TeamMember.find({ owner: req.user.id }).lean(),
    Project.find(scopedProjectFilter).lean(),
    Project.find(globalProjectFilter).lean(),
  ]);

  const overdue = taskDocs.filter((t) => t.priority === "urgent").length;
  const doneCount = taskDocs.filter((t) => t.status === "done").length;

  const cards = [
    { label: "Active Projects", value: allProjects.filter((project) => project.status === "active").length, note: `${allProjects.length} total` },
    { label: "Total Tasks", value: taskDocs.length, note: `${doneCount} done` },
    { label: "Overdue Tasks", value: overdue, note: "0 new" },
    { label: "Team Members", value: members.length, note: `${members.filter((m) => m.status === "Active").length} Online` },
  ];

  const prioritize = (task) => {
    const assignedToCurrentUser = task.assignedToUserId && String(task.assignedToUserId) === String(req.user.id);
    const reporterIsCurrentUser = task.reporterId && String(task.reporterId) === String(req.user.id);
    if (assignedToCurrentUser) return 0;
    if (reporterIsCurrentUser) return 1;
    return 2;
  };

  const priorityTasks = taskDocs
    .slice()
    .sort((left, right) => prioritize(left) - prioritize(right))
    .map((task) => ({
    id: String(task._id),
    title: task.title,
    subtitle: task.subtitle,
    status: normalizeStatus(task.status),
    assignee: task.assignee || "",
    assignedByName: task.assignedByName || "",
  }));

  res.json({
    success: true,
    summary: {
      greeting: `Good Morning, ${req.user.fullName?.split(" ")[0] || "User"}`,
      cards,
      distribution: scopedProjects.map((project) => {
        const projectTasks = taskDocs.filter((task) => String(task.project) === String(project._id));
        const doneTasks = projectTasks.filter((task) => task.status === "done").length;
        const totalTasks = projectTasks.length;
        const isCompleted = project.status === "completed";
        return {
          label: project.name,
          status: project.status,
          isCompleted,
          value: isCompleted ? 100 : totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
          doneTasks,
          totalTasks,
        };
      }),
      priorityTasks,
      recentActivity: [],
    },
  });
};
