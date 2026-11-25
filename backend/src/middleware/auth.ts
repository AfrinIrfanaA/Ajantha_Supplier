import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User, type UserRole } from "../models/User.js";
import { AppError } from "../utils/appError.js";

export interface AuthPayload {
  userId: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie("token", { path: "/" });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const token = bearer || req.cookies?.token;
    if (!token) throw new AppError("Please sign in to continue.", 401, "UNAUTHENTICATED");

    const decoded = jwt.verify(token, env.jwtSecret) as AuthPayload;
    const user = await User.findById(decoded.userId);
    if (!user) throw new AppError("Please sign in to continue.", 401, "UNAUTHENTICATED");
    if (user.status === "disabled") {
      throw new AppError("Account disabled", 403, "ACCOUNT_DISABLED");
    }
    req.auth = { userId: String(user._id), role: user.role };
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(new AppError("Please sign in to continue.", 401, "UNAUTHENTICATED"));
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new AppError("Please sign in to continue.", 401, "UNAUTHENTICATED"));
    if (!roles.includes(req.auth.role)) {
      return next(new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN"));
    }
    next();
  };
}
