import { Router } from "express";
import {
  createProject,
  deleteProject,
  getMyInvitations,
  getProjects,
  inviteProjectMember,
  respondToInvitation,
  updateProjectMembers,
} from "../controllers/projects.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const projectsRouter = Router();

projectsRouter.get("/", requireAuth, getProjects);
projectsRouter.get("/invitations", requireAuth, getMyInvitations);
projectsRouter.post("/", requireAuth, createProject);
projectsRouter.patch("/invitations/:id", requireAuth, respondToInvitation);
projectsRouter.patch("/:id", requireAuth, updateProjectMembers);
projectsRouter.delete("/:id", requireAuth, deleteProject);
projectsRouter.post("/:id/invitations", requireAuth, inviteProjectMember);

export { projectsRouter };
