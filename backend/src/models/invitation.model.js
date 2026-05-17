import crypto from "crypto";
import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    teamMember: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    token: { type: String, default: () => crypto.randomBytes(24).toString("hex"), unique: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending", index: true },
  },
  { timestamps: true }
);

export const Invitation = mongoose.model("Invitation", invitationSchema);
