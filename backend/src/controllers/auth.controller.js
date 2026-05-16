import bcrypt from "bcryptjs";
import { signToken } from "../lib/jwt.js";
import { User } from "../models/user.model.js";
import { TeamMember } from "../models/team-member.model.js";

const safeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
});

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    return res.status(409).json({ success: false, message: "Email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "Admin",
    avatar: "",
  });

  await TeamMember.create({
    owner: user._id,
    name: user.fullName,
    email: user.email,
    role: "Admin",
    status: "Active",
    workload: 0,
    tasks: 0,
    avatar: user.avatar,
  });

  const token = signToken({ id: String(user._id), email: user.email, role: user.role, fullName: user.fullName });
  return res.status(201).json({ success: true, token, user: safeUser(user) });
};

export const signin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const token = signToken({ id: String(user._id), email: user.email, role: user.role, fullName: user.fullName });
  return res.status(200).json({ success: true, token, user: safeUser(user) });
};

export const me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  return res.json({ success: true, user: safeUser(user) });
};
