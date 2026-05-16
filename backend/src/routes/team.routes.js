import { Router } from "express";
import { getTeam } from "../controllers/team.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const teamRouter = Router();

teamRouter.get("/", requireAuth, getTeam);

export { teamRouter };
