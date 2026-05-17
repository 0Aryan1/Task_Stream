import { Invitation } from "../models/invitation.model.js";
import { Project } from "../models/project.model.js";

export const normalizeEmail = (email = "") => email.toLowerCase().trim();

const isMemberByEmail = (project, email) =>
  (project.members || []).some((member) => normalizeEmail(member.email) === email);

export const getAccessibleProjectIds = async (user) => {
  const normalizedUserEmail = normalizeEmail(user.email);

  const [ownedProjects, acceptedInvitations] = await Promise.all([
    Project.find({ owner: user.id }).select("_id").lean(),
    Invitation.find({
      email: normalizedUserEmail,
      status: "accepted",
    })
      .select("project")
      .lean(),
  ]);

  const memberProjects = await Project.find()
    .populate("members", "email")
    .select("_id members")
    .lean();

  return [
    ...new Set([
      ...ownedProjects.map((project) => String(project._id)),
      ...acceptedInvitations.map((invitation) => String(invitation.project)),
      ...memberProjects
        .filter((project) => isMemberByEmail(project, normalizedUserEmail))
        .map((project) => String(project._id)),
    ]),
  ];
};

export const canAccessProject = async (user, projectId) => {
  if (!projectId) return false;

  const owned = await Project.exists({ _id: projectId, owner: user.id });
  if (owned) return true;

  const invitation = await Invitation.exists({
    project: projectId,
    email: normalizeEmail(user.email),
    status: "accepted",
  });
  if (invitation) return true;

  const project = await Project.findById(projectId).populate("members", "email").select("members").lean();
  if (!project) return false;

  return isMemberByEmail(project, normalizeEmail(user.email));
};
