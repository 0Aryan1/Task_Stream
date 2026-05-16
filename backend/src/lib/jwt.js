import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev_secret_key";

export const signToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: "7d" });
export const verifyToken = (token) => jwt.verify(token, SECRET);
