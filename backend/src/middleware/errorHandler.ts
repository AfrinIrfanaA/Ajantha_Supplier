import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/appError.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message, code: err.code });
  }

  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(400).json({
      message: first?.message ?? "Invalid input.",
      code: "VALIDATION_ERROR",
    });
  }

  const mongoErr = err as { code?: number; keyPattern?: Record<string, unknown> };
  if (mongoErr?.code === 11000) {
    if (mongoErr.keyPattern?.invoiceNumber) {
      return res.status(409).json({ message: "Invoice number already exists.", code: "DUPLICATE" });
    }
    if (mongoErr.keyPattern?.email) {
      return res.status(409).json({ message: "A user with this email already exists.", code: "DUPLICATE" });
    }
    return res.status(409).json({ message: "This record already exists.", code: "DUPLICATE" });
  }

  console.error(err);
  return res.status(500).json({
    message: "Something went wrong. Please try again.",
    code: "INTERNAL_ERROR",
  });
}
