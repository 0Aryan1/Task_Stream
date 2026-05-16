import { TeamMember } from "../models/team-member.model.js";

export const getTeam = async (req, res) => {
  const memberDocs = await TeamMember.find({ owner: req.user.id }).sort({ createdAt: -1 }).lean();

  const members = memberDocs.map((member) => ({
    id: String(member._id),
    name: member.name,
    email: member.email,
    role: member.role,
    status: member.status,
    workload: member.workload,
    tasks: member.tasks,
    avatar: member.avatar,
  }));

  const activeNow = members.filter((m) => m.status === "Active").length;
  const atCapacity = members.filter((m) => m.workload >= 90).length;

  res.json({
    success: true,
    stats: {
      totalMembers: members.length,
      activeNow,
      tasksCompleted: 0,
      atCapacity,
    },
    members,
  });
};
