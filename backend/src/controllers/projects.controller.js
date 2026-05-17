import { Project } from "../models/project.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { Invitation } from "../models/invitation.model.js";
import { Task } from "../models/task.model.js";
import { getAccessibleProjectIds, normalizeEmail } from "../utils/workspace-access.js";

const allowedProjectStatuses = ["planning", "active", "paused", "completed"];
const allowedInviteDecisions = ["accept", "reject"];

const emptyProgress = { totalTasks: 0, doneTasks: 0, percent: 0 };

const serializeProject = (project, currentUserId, progressByProjectId) => {
  const ownerId = String(project.owner?._id || project.owner);
  const progressData = progressByProjectId.get(String(project._id));
  const totalTasks = progressData?.totalTasks || 0;
  const doneTasks = progressData?.doneTasks || 0;
  const progress = project.status === "completed"
    ? { totalTasks, doneTasks, percent: 100 }
    : totalTasks
      ? { totalTasks, doneTasks, percent: Math.round((doneTasks / totalTasks) * 100) }
      : emptyProgress;

  return {
    id: String(project._id),
    name: project.name,
    description: project.description,
    status: project.status,
    isOwner: ownerId === String(currentUserId),
    owner: {
      id: ownerId,
      fullName: project.owner?.fullName || "",
      email: project.owner?.email || "",
    },
    progress,
    members: (project.members || []).map((member) => ({
      id: String(member._id),
      name: member.name,
      email: member.email,
      role: member.role,
      avatar: member.avatar,
    })),
  };
};

const serializeInvitation = (invitation) => ({
  id: String(invitation._id),
  email: invitation.email,
  status: invitation.status,
  projectId: String(invitation.project?._id || invitation.project),
  projectName: invitation.project?.name || "",
  projectStatus: invitation.project?.status || "",
  inviterName: invitation.owner?.fullName || "",
  inviterEmail: invitation.owner?.email || "",
  createdAt: invitation.createdAt,
});

const buildInviteLink = (req, invitation) => {
  const appUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get("host")}`;
  return `${appUrl}/invite/${invitation.token}`;
};

const buildMailto = ({ email, inviteLink, projectName, inviterName }) => {
  const subject = encodeURIComponent(`Invitation to join ${projectName}`);
  const body = encodeURIComponent(
    `${inviterName} invited you to join the ${projectName} project in TaskStream.\n\nAccept invitation: ${inviteLink}`
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
};

const resolveMemberIds = async (owner, memberIds = []) => {
  const members = await TeamMember.find({ owner, _id: { $in: memberIds } }).select("_id").lean();
  return members.map((member) => member._id);
};

const getProgressByProjectId = async (projectIds) => {
  if (!projectIds.length) {
    return new Map();
  }

  const progressRows = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $group: {
        _id: "$project",
        totalTasks: { $sum: 1 },
        doneTasks: {
          $sum: {
            $cond: [{ $eq: ["$status", "done"] }, 1, 0],
          },
        },
      },
    },
  ]);

  return new Map(progressRows.map((row) => [String(row._id), row]));
};

export const getProjects = async (req, res) => {
  const accessibleProjectIds = await getAccessibleProjectIds(req.user);
  if (!accessibleProjectIds.length) {
    return res.json({ success: true, projects: [] });
  }

  const projects = await Project.find({ _id: { $in: accessibleProjectIds } })
    .populate("members", "name email role avatar")
    .populate("owner", "fullName email")
    .sort({ createdAt: -1 })
    .lean();
  const progressByProjectId = await getProgressByProjectId(projects.map((project) => project._id));

  res.json({
    success: true,
    projects: projects.map((project) => serializeProject(project, req.user.id, progressByProjectId)),
  });
};

export const createProject = async (req, res) => {
  const { name, description = "", status = "active", memberIds = [] } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: "Project name is required" });
  }
  if (!allowedProjectStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid project status" });
  }

  const members = await resolveMemberIds(req.user.id, memberIds);
  const project = await Project.create({
    owner: req.user.id,
    name: name.trim(),
    description: description.trim(),
    status,
    members,
  });

  const populated = await Project.findById(project._id)
    .populate("members", "name email role avatar")
    .populate("owner", "fullName email")
    .lean();
  const progressByProjectId = await getProgressByProjectId([project._id]);

  res.status(201).json({
    success: true,
    project: serializeProject(populated, req.user.id, progressByProjectId),
  });
};

export const updateProjectMembers = async (req, res) => {
  const projectMatch = await Project.findOne({ _id: req.params.id, owner: req.user.id }).select("_id").lean();
  if (!projectMatch) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  const { memberIds = [], status, name, description } = req.body;
  const members = await resolveMemberIds(req.user.id, memberIds);
  const updates = { members };

  if (status) {
    if (!allowedProjectStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid project status" });
    }
    updates.status = status;
  }
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof description === "string") updates.description = description.trim();

  const project = await Project.findOneAndUpdate({ _id: req.params.id, owner: req.user.id }, updates, {
    new: true,
  })
    .populate("members", "name email role avatar")
    .populate("owner", "fullName email")
    .lean();
  const progressByProjectId = await getProgressByProjectId([project._id]);
  res.json({ success: true, project: serializeProject(project, req.user.id, progressByProjectId) });
};

export const deleteProject = async (req, res) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ success: false, message: "Only admins can delete projects" });
  }

  const project = await Project.findOne({ _id: req.params.id, owner: req.user.id }).select("_id");
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  await Promise.all([
    Task.deleteMany({ project: project._id }),
    Invitation.deleteMany({ project: project._id }),
    Project.deleteOne({ _id: project._id }),
  ]);

  return res.json({ success: true, message: "Project deleted for all members" });
};

export const inviteProjectMember = async (req, res) => {
  const { email, name = "" } = req.body;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const project = await Project.findOne({ _id: req.params.id, owner: req.user.id });
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  const existingPendingInvitation = await Invitation.findOne({
    owner: req.user.id,
    project: project._id,
    email: normalizedEmail,
    status: "pending",
  }).lean();
  if (existingPendingInvitation) {
    return res.status(409).json({ success: false, message: "A pending invitation already exists for this email" });
  }

  const fallbackName = normalizedEmail.split("@")[0].replace(/[._-]+/g, " ");
  const member = await TeamMember.findOneAndUpdate(
    { owner: req.user.id, email: normalizedEmail },
    {
      $setOnInsert: {
        owner: req.user.id,
        name: name.trim() || fallbackName,
        email: normalizedEmail,
        role: "Member",
        status: "Away",
        workload: 0,
        tasks: 0,
        avatar: "",
      },
    },
    { new: true, upsert: true }
  );
  if (project.members.some((memberId) => String(memberId) === String(member._id))) {
    return res.status(409).json({ success: false, message: "Member is already assigned to this project" });
  }

  const invitation = await Invitation.create({
    owner: req.user.id,
    project: project._id,
    teamMember: member._id,
    email: normalizedEmail,
  });

  const populated = await Project.findById(project._id)
    .populate("members", "name email role avatar")
    .populate("owner", "fullName email")
    .lean();
  const progressByProjectId = await getProgressByProjectId([project._id]);
  const inviteLink = buildInviteLink(req, invitation);

  res.status(201).json({
    success: true,
    invitation: {
      id: String(invitation._id),
      email: invitation.email,
      status: invitation.status,
      inviteLink,
      mailto: buildMailto({
        email: normalizedEmail,
        inviteLink,
        projectName: project.name,
        inviterName: req.user.fullName || "An admin",
      }),
    },
    project: serializeProject(populated, req.user.id, progressByProjectId),
  });
};

export const getMyInvitations = async (req, res) => {
  const invitations = await Invitation.find({
    email: normalizeEmail(req.user.email),
    status: "pending",
  })
    .populate("owner", "fullName email")
    .populate("project", "name status")
    .sort({ createdAt: -1 })
    .lean();

  const activeInvitations = invitations.filter((invitation) => invitation.project && invitation.owner);
  res.json({
    success: true,
    invitations: activeInvitations.map(serializeInvitation),
  });
};

export const respondToInvitation = async (req, res) => {
  const { decision } = req.body;
  if (!allowedInviteDecisions.includes(decision)) {
    return res.status(400).json({ success: false, message: "Invalid invitation decision" });
  }

  const invitation = await Invitation.findById(req.params.id).populate("project", "name status owner");
  if (!invitation) {
    return res.status(404).json({ success: false, message: "Invitation not found" });
  }

  if (invitation.email !== normalizeEmail(req.user.email)) {
    return res.status(403).json({ success: false, message: "You are not authorized to respond to this invitation" });
  }
  if (invitation.status !== "pending") {
    return res.status(409).json({ success: false, message: "Invitation has already been processed" });
  }
  if (!invitation.project?._id) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  if (decision === "reject") {
    invitation.status = "rejected";
    await invitation.save();
    return res.json({
      success: true,
      invitation: {
        id: String(invitation._id),
        status: invitation.status,
      },
    });
  }

  const project = await Project.findById(invitation.project._id);
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  const member = await TeamMember.findOneAndUpdate(
    { owner: project.owner, email: normalizeEmail(req.user.email) },
    {
      $setOnInsert: {
        owner: project.owner,
        name: req.user.fullName,
        email: normalizeEmail(req.user.email),
        role: "Member",
        status: "Active",
        workload: 0,
        tasks: 0,
        avatar: "",
      },
    },
    { new: true, upsert: true }
  );

  if (!project.members.some((memberId) => String(memberId) === String(member._id))) {
    project.members.push(member._id);
    await project.save();
  }

  invitation.status = "accepted";
  invitation.teamMember = member._id;
  await invitation.save();

  const populatedProject = await Project.findById(project._id)
    .populate("members", "name email role avatar")
    .populate("owner", "fullName email")
    .lean();
  const progressByProjectId = await getProgressByProjectId([project._id]);

  return res.json({
    success: true,
    invitation: {
      id: String(invitation._id),
      status: invitation.status,
      projectId: String(project._id),
    },
    project: serializeProject(populatedProject, req.user.id, progressByProjectId),
  });
};
