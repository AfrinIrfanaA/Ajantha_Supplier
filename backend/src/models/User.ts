import mongoose, { Schema } from "mongoose";

export type UserRole = "owner" | "accountant" | "staff";
export type UserStatus = "active" | "disabled";

export interface UserDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["owner", "accountant", "staff"], required: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true }
);

export const User = mongoose.model<UserDoc>("User", userSchema);
