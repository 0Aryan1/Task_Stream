import { Router } from "express";
import { getTasks, updateTaskStatus } from "../controllers/tasks.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const tasksRouter = Router();

tasksRouter.get("/", requireAuth, getTasks);
tasksRouter.patch("/:id/status", requireAuth, updateTaskStatus);

export { tasksRouter };
