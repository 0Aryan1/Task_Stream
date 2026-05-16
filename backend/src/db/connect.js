import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required in backend/.env");
  }

  const uri = process.env.MONGO_URI;

  const conn = await mongoose.connect(uri, {
    dbName: DB_NAME,
  });

  console.log("MongoDB connected:", conn.connection.host, `/${DB_NAME}`);
};

export default connectDB;
