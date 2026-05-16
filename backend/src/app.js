import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { tasksRouter } from "./routes/tasks.routes.js";
import { teamRouter } from "./routes/team.routes.js";
import { projectsRouter } from "./routes/projects.routes.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(cookieParser());

app.get("/api/health", (_, res) => {
  res.json({ ok: true, message: "TaskStream API running" });
});

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/team", teamRouter);
app.use("/api/projects", projectsRouter);

app.use((err, _, res, __) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export { app };
