import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const activitySchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

const subtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "", trim: true }, // short task description
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reporterName: { type: String, required: true, trim: true },
    assignedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    assignedByName: { type: String, default: "", trim: true },
    assignedToMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", default: null, index: true },
    assignedToUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignee: { type: String, default: "", trim: true },
    status: { type: String, enum: ["todo", "progress", "qa", "done"], default: "todo" },
    tag: { type: String, default: "General" },
    labels: [{ type: String, trim: true }],
    dueDate: { type: Date, default: null },
    dueLabel: { type: String, default: "" }, // keep legacy compatibility
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    sprint: { type: String, default: "", trim: true },
    milestone: { type: String, default: "", trim: true },
    epic: { type: String, default: "", trim: true },
    estimateHours: { type: Number, default: 0, min: 0 },
    trackedMinutes: { type: Number, default: 0, min: 0 },
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    subtasks: [subtaskSchema],
    attachments: [{ type: String, trim: true }],
    comments: [commentSchema],
    activity: [activitySchema],
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

export const Task = mongoose.model("Task", taskSchema);
