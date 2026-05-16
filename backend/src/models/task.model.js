import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "", trim: true },
    status: { type: String, enum: ["todo", "progress", "qa", "done"], default: "todo" },
    tag: { type: String, default: "General" },
    dueLabel: { type: String, default: "" },
    assignee: { type: String, default: "" },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
  },
  { timestamps: true }
);

export const Task = mongoose.model("Task", taskSchema);
