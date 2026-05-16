import { Router } from "express";
import { createProject, getProjects, inviteProjectMember, updateProjectMembers } from "../controllers/projects.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const projectsRouter = Router();

projectsRouter.get("/", requireAuth, getProjects);
projectsRouter.post("/", requireAuth, createProject);
projectsRouter.patch("/:id", requireAuth, updateProjectMembers);
projectsRouter.post("/:id/invitations", requireAuth, inviteProjectMember);

export { projectsRouter };
