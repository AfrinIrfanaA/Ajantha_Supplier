import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["owner", "accountant", "staff"]),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["owner", "accountant", "staff"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  password: z.string().min(6).optional(),
});

function publicUser(u: { _id: unknown; name: string; email: string; role: string; status: string; createdAt?: Date }) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
  };
}

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users: users.map(publicUser) });
});

export const createUser = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash,
    role: data.role,
    status: "active",
  });
  res.status(201).json({ user: publicUser(user) });
});

export const updateUser = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found.", 404);

  if (String(user._id) === req.auth!.userId && data.status === "disabled") {
    throw new AppError("You cannot disable your own account.", 400);
  }

  if (data.name) user.name = data.name;
  if (data.email) user.email = data.email.toLowerCase();
  if (data.role) user.role = data.role;
  if (data.status) user.status = data.status;
  if (data.password) user.passwordHash = await bcrypt.hash(data.password, 12);
  await user.save();
  res.json({ user: publicUser(user) });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === req.auth!.userId) {
    throw new AppError("You cannot delete your own account.", 400);
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError("User not found.", 404);
  res.json({ ok: true });
});
