import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ["Admin", "Member"], default: "Member" },
    status: { type: String, enum: ["Active", "Away"], default: "Active" },
    workload: { type: Number, default: 0 },
    tasks: { type: Number, default: 0 },
    avatar: { type: String, default: "" },
  },
  { timestamps: true }
);

export const TeamMember = mongoose.model("TeamMember", teamMemberSchema);
