import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    status: { type: String, enum: ["planning", "active", "paused", "completed"], default: "active" },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "TeamMember" }],
  },
  { timestamps: true }
);

export const Project = mongoose.model("Project", projectSchema);
