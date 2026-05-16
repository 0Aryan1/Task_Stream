import { Router } from "express";
import { getSummary } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const dashboardRouter = Router();

dashboardRouter.get("/summary", requireAuth, getSummary);

export { dashboardRouter };
