import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { clearAuthCookie, setAuthCookie, signToken } from "../middleware/auth.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

function publicUser(user: { _id: unknown; name: string; email: string; role: string; status: string }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new AppError("Invalid email/password", 401, "INVALID_CREDENTIALS");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError("Invalid email/password", 401, "INVALID_CREDENTIALS");
  if (user.status === "disabled") throw new AppError("Account disabled", 403, "ACCOUNT_DISABLED");

  const token = signToken({ userId: String(user._id), role: user.role });
  setAuthCookie(res, token);
  res.json({ user: publicUser(user), token });
});

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth!.userId);
  if (!user) throw new AppError("Please sign in to continue.", 401, "UNAUTHENTICATED");
  res.json({ user: publicUser(user) });
});
