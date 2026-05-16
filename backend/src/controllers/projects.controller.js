import { Project } from "../models/project.model.js";
import { TeamMember } from "../models/team-member.model.js";
import { Invitation } from "../models/invitation.model.js";

const allowedProjectStatuses = ["planning", "active", "paused", "completed"];
const isAdmin = (req) => req.user?.role === "Admin";

const serializeProject = (project) => ({
  id: String(project._id),
  name: project.name,
  description: project.description,
  status: project.status,
  members: (project.members || []).map((member) => ({
    id: String(member._id),
    name: member.name,
    email: member.email,
    role: member.role,
    avatar: member.avatar,
  })),
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

export const getProjects = async (req, res) => {
  const projects = await Project.find({ owner: req.user.id })
    .populate("members", "name email role avatar")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, projects: projects.map(serializeProject) });
};

export const createProject = async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: "Only admins can create projects" });
  }

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

  const populated = await Project.findById(project._id).populate("members", "name email role avatar").lean();
  res.status(201).json({ success: true, project: serializeProject(populated) });
};

export const updateProjectMembers = async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: "Only admins can assign project members" });
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
    .lean();

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  res.json({ success: true, project: serializeProject(project) });
};

export const inviteProjectMember = async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: "Only admins can invite project members" });
  }

  const { email, name = "" } = req.body;
  const normalizedEmail = email?.toLowerCase().trim();
  if (!normalizedEmail) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const project = await Project.findOne({ _id: req.params.id, owner: req.user.id });
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
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

  if (!project.members.some((memberId) => String(memberId) === String(member._id))) {
    project.members.push(member._id);
    await project.save();
  }

  const invitation = await Invitation.create({
    owner: req.user.id,
    project: project._id,
    teamMember: member._id,
    email: normalizedEmail,
  });

  const populated = await Project.findById(project._id).populate("members", "name email role avatar").lean();
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
    project: serializeProject(populated),
  });
};
