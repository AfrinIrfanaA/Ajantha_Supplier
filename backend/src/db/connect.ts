import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "../config/env.js";

const fallbackDnsServers = ["8.8.8.8", "1.1.1.1"];

function isSrvResolverRefusal(error: unknown): boolean {
  let current = error;
  while (current && typeof current === "object") {
    const candidate = current as { code?: string; syscall?: string; cause?: unknown };
    if (candidate.code === "ECONNREFUSED" && candidate.syscall === "querySrv") return true;
    current = candidate.cause;
  }
  return false;
}

export async function connectDb() {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(env.mongodbUri);
  } catch (error) {
    if (!env.mongodbUri.startsWith("mongodb+srv://") || !isSrvResolverRefusal(error)) {
      throw error;
    }

    dns.setServers(fallbackDnsServers);
    console.warn("System DNS refused the MongoDB Atlas SRV lookup; retrying with alternate DNS.");
    await mongoose.connect(env.mongodbUri);
  }
  console.log("MongoDB connected");
}
