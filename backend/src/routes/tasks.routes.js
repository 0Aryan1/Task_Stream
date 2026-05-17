import { Router } from "express";
import {
  addTaskComment,
  createTask,
  deleteTask,
  getTasks,
  reorderTasks,
  updateTask,
  updateTaskStatus,
} from "../controllers/tasks.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const tasksRouter = Router();

tasksRouter.get("/", requireAuth, getTasks);
tasksRouter.post("/", requireAuth, createTask);
tasksRouter.post("/reorder", requireAuth, reorderTasks);
tasksRouter.patch("/:id", requireAuth, updateTask);
tasksRouter.patch("/:id/status", requireAuth, updateTaskStatus);
tasksRouter.post("/:id/comments", requireAuth, addTaskComment);
tasksRouter.delete("/:id", requireAuth, deleteTask);

export { tasksRouter };
